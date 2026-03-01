import { db } from "./db";
import { documentChunks, medicalReports } from "@shared/schema";
import { eq } from "drizzle-orm";
import { openai } from "./replit_integrations/audio/client";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import sharp from "sharp";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, readdirSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

function keywordScore(chunk: string, question: string): number {
  const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const chunkLower = chunk.toLowerCase();
  let score = 0;
  for (const word of words) {
    const regex = new RegExp(word, "gi");
    const matches = chunkLower.match(regex);
    if (matches) score += matches.length;
  }
  return score;
}

function pdfToImages(pdfBuffer: Buffer): Buffer[] {
  const tmpDir = path.join(os.tmpdir(), `pdf-ocr-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const pdfPath = path.join(tmpDir, "input.pdf");
  const outputPrefix = path.join(tmpDir, "page");

  try {
    writeFileSync(pdfPath, pdfBuffer);
    execSync(`pdftoppm -jpeg -r 200 "${pdfPath}" "${outputPrefix}"`, { timeout: 60000 });

    const files = readdirSync(tmpDir)
      .filter(f => f.startsWith("page") && f.endsWith(".jpg"))
      .sort();

    const images: Buffer[] = [];
    for (const file of files) {
      images.push(readFileSync(path.join(tmpDir, file)));
    }
    return images;
  } finally {
    try {
      const files = readdirSync(tmpDir);
      for (const file of files) {
        unlinkSync(path.join(tmpDir, file));
      }
      execSync(`rmdir "${tmpDir}"`);
    } catch {}
  }
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
    max_completion_tokens: 4096,
  });
  return response.choices[0]?.message?.content || "";
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "tiff", "tif", "bmp", "webp"].includes(ext || "");
}

async function extractTextWithPdfParse(pdfBuffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = require("pdf-parse");
    const uint8 = new Uint8Array(pdfBuffer);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();

    let fullText = "";
    if (result && result.pages && Array.isArray(result.pages)) {
      fullText = result.pages.map((p: any) => p.text || "").join("\n\n");
    } else if (result && typeof result.text === "string") {
      fullText = result.text;
    }
    return fullText.trim();
  } catch (err) {
    console.log("[pdf-rag] pdf-parse failed:", (err as Error).message);
    return "";
  }
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
      console.error("[pdf-rag] Image OCR failed:", (err as Error).message);
    }
  } else {
    pdfText = await extractTextWithPdfParse(pdfBuffer);
    console.log(`[pdf-rag] pdf-parse extracted ${pdfText.length} chars`);

    if (!pdfText || pdfText.length < 50) {
      console.log("[pdf-rag] Text extraction minimal, converting PDF pages to images for OCR...");
      try {
        const pageImages = pdfToImages(pdfBuffer);
        console.log(`[pdf-rag] Converted PDF to ${pageImages.length} page images`);

        const pageTexts: string[] = [];
        for (let i = 0; i < pageImages.length; i++) {
          console.log(`[pdf-rag] OCR processing page ${i + 1}/${pageImages.length}...`);
          try {
            const base64 = await compressImageForVision(pageImages[i]);
            const pageText = await ocrImageBuffer(base64);
            if (pageText.trim()) {
              pageTexts.push(pageText);
            }
          } catch (err) {
            console.error(`[pdf-rag] OCR failed for page ${i + 1}:`, (err as Error).message);
          }
        }
        pdfText = pageTexts.join("\n\n--- Page Break ---\n\n");
      } catch (err) {
        console.error("[pdf-rag] PDF to image conversion failed:", (err as Error).message);
      }
    }
  }

  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error("Could not extract text from this document. The file may be corrupted.");
  }

  console.log(`[pdf-rag] Total extracted ${pdfText.length} chars from ${fileName}`);

  const chunks = await textSplitter.splitText(pdfText);
  let chunksCreated = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;

    await db.insert(documentChunks).values({
      patientId,
      fileName,
      chunkIndex: i,
      content: chunk,
      embedding: null,
    });
    chunksCreated++;
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

  const scored = allChunks.map(chunk => ({
    content: chunk.content,
    score: keywordScore(chunk.content, question),
  }));

  scored.sort((a, b) => b.score - a.score);

  const topChunks = scored.slice(0, 10).map(s => s.content);
  const context = topChunks.join("\n\n---\n\n");

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
    max_completion_tokens: 1000,
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
