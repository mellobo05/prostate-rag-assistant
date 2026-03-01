import { db } from "./db";
import { documentChunks, medicalReports } from "@shared/schema";
import { eq } from "drizzle-orm";
import { openai } from "./replit_integrations/audio/client";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import sharp from "sharp";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function compressImageForVision(imageBuffer: Buffer): Promise<string> {
  const compressed = await sharp(imageBuffer)
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return compressed.toString("base64");
}

async function ocrImageBuffer(imageBase64: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an OCR assistant. Extract ALL text visible in this medical document image.
Preserve the structure, dates, numbers, and medical values accurately.
Include headers, table data, lab values, dates, doctor names, hospital names, and all medical information.
Return ONLY the extracted text, nothing else.`
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: "high"
            }
          },
          {
            type: "text",
            text: "Extract all text from this medical document. Include every detail - dates, numbers, lab values, names, and findings."
          }
        ]
      }
    ],
    max_tokens: 4096,
  });
  return response.choices[0]?.message?.content || "";
}

async function extractTextFromImagePdf(pdfBuffer: Buffer): Promise<string> {
  const base64 = await compressImageForVision(pdfBuffer);
  return await ocrImageBuffer(base64);
}

async function extractTextFromMultiPagePdf(pdfBuffer: Buffer): Promise<string> {
  try {
    const base64 = await compressImageForVision(pdfBuffer);
    return await ocrImageBuffer(base64);
  } catch (err) {
    console.error("[pdf-rag] Single-pass OCR failed, trying as raw image:", err);
    try {
      const rawBase64 = pdfBuffer.toString("base64");
      if (rawBase64.length > 10 * 1024 * 1024) {
        throw new Error("File too large for vision API even after compression");
      }
      return await ocrImageBuffer(rawBase64);
    } catch (err2) {
      console.error("[pdf-rag] Raw OCR also failed:", err2);
      throw err2;
    }
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    tiff: "image/tiff",
    tif: "image/tiff",
    bmp: "image/bmp",
    webp: "image/webp",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "tiff", "tif", "bmp", "webp"].includes(ext || "");
}

export async function processPdfBuffer(
  patientId: number,
  fileName: string,
  pdfBuffer: Buffer
): Promise<{ chunksCreated: number; reportsExtracted: number }> {
  let pdfText = "";

  if (isImageFile(fileName)) {
    console.log("[pdf-rag] Image file detected, using Vision OCR...");
    try {
      const base64 = await compressImageForVision(pdfBuffer);
      pdfText = await ocrImageBuffer(base64);
    } catch (err) {
      console.error("[pdf-rag] Image OCR failed:", err);
    }
  } else {
    try {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text?.trim() || "";
      console.log(`[pdf-rag] pdf-parse extracted ${pdfText.length} chars`);
    } catch (err) {
      console.log("[pdf-rag] pdf-parse failed, will try vision OCR:", (err as Error).message);
    }

    if (!pdfText || pdfText.length < 50) {
      console.log("[pdf-rag] Text extraction minimal, using OpenAI Vision OCR...");
      try {
        pdfText = await extractTextFromMultiPagePdf(pdfBuffer);
      } catch (err) {
        console.error("[pdf-rag] Vision OCR also failed:", (err as Error).message);
      }
    }
  }

  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error("Could not extract text from this document. Please try uploading individual pages as images (JPG/PNG).");
  }

  console.log(`[pdf-rag] Extracted ${pdfText.length} chars from ${fileName}`);

  const chunks = await textSplitter.splitText(pdfText);
  let chunksCreated = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;

    try {
      const embedding = await getEmbedding(chunk);
      await db.insert(documentChunks).values({
        patientId,
        fileName,
        chunkIndex: i,
        content: chunk,
        embedding: JSON.stringify(embedding),
      });
      chunksCreated++;
    } catch (err) {
      console.error(`[pdf-rag] Error embedding chunk ${i}:`, err);
      await db.insert(documentChunks).values({
        patientId,
        fileName,
        chunkIndex: i,
        content: chunk,
        embedding: null,
      });
      chunksCreated++;
    }
  }

  const reportsExtracted = await extractReportsFromText(patientId, pdfText);

  return { chunksCreated, reportsExtracted };
}

async function extractReportsFromText(patientId: number, pdfText: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: `You are a medical data extraction assistant. Extract all PSA test results and other medical reports from the provided document text.

Return a JSON object with a "reports" key containing an array of objects with these fields:
- reportDate: ISO date string (YYYY-MM-DD)
- reportType: one of "PSA", "PET Scan", "Biopsy", "Blood Test", "Other"
- psaLevel: PSA value as string (only for PSA reports), e.g. "4.5"
- findings: brief summary of findings

Only include data that is clearly present in the document. If no reports found, return {"reports": []}.
Return ONLY valid JSON, no markdown or explanation.`
        },
        {
          role: "user",
          content: `Extract medical reports from this document:\n\n${pdfText.slice(0, 15000)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return 0;
    }

    const reports = Array.isArray(parsed) ? parsed : (parsed.reports || parsed.data || []);
    if (!Array.isArray(reports)) return 0;

    let count = 0;
    for (const report of reports) {
      if (!report.reportDate || !report.reportType) continue;
      try {
        await db.insert(medicalReports).values({
          patientId,
          reportDate: new Date(report.reportDate),
          reportType: report.reportType,
          psaLevel: report.psaLevel || null,
          findings: report.findings || null,
        });
        count++;
      } catch (err) {
        console.error("[pdf-rag] Error inserting extracted report:", err);
      }
    }
    return count;
  } catch (err) {
    console.error("[pdf-rag] Error extracting reports:", err);
    return 0;
  }
}

export async function queryRag(patientId: number, question: string): Promise<string> {
  const allChunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.patientId, patientId));

  if (allChunks.length === 0) {
    return "No documents have been uploaded for this patient yet. Please upload medical documents first.";
  }

  let relevantChunks: string[];

  const chunksWithEmbeddings = allChunks.filter(c => c.embedding);

  if (chunksWithEmbeddings.length > 0) {
    try {
      const questionEmbedding = await getEmbedding(question);

      const scored = chunksWithEmbeddings.map(chunk => ({
        content: chunk.content,
        score: cosineSimilarity(questionEmbedding, JSON.parse(chunk.embedding!)),
      }));

      scored.sort((a, b) => b.score - a.score);
      relevantChunks = scored.slice(0, 5).map(s => s.content);
    } catch {
      relevantChunks = allChunks.slice(0, 5).map(c => c.content);
    }
  } else {
    relevantChunks = allChunks.slice(0, 5).map(c => c.content);
  }

  const context = relevantChunks.join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [
      {
        role: "system",
        content: `You are a helpful medical assistant for caregivers. Answer questions about patient medical documents using only the provided context. Be clear, accurate, and use simple language. If the answer is not in the context, say so honestly. Format your response for easy reading.`
      },
      {
        role: "user",
        content: `Context from patient documents:\n\n${context}\n\nQuestion: ${question}`
      }
    ],
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
}

export async function getUploadedDocuments(patientId: number): Promise<string[]> {
  const chunks = await db
    .select({ fileName: documentChunks.fileName })
    .from(documentChunks)
    .where(eq(documentChunks.patientId, patientId));

  return [...new Set(chunks.map(c => c.fileName))];
}
