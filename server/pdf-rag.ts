import { db } from "./db";
import { documentChunks, medicalReports } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "./replit_integrations/audio/client";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

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

export async function processPdfText(
  patientId: number,
  fileName: string,
  pdfText: string
): Promise<{ chunksCreated: number; reportsExtracted: number }> {
  const chunks = chunkText(pdfText);
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

  const reportsExtracted = await extractReportsFromPdf(patientId, pdfText);

  return { chunksCreated, reportsExtracted };
}

async function extractReportsFromPdf(patientId: number, pdfText: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: `You are a medical data extraction assistant. Extract all PSA test results and other medical reports from the provided document text.

Return a JSON array of objects with these fields:
- reportDate: ISO date string (YYYY-MM-DD)
- reportType: one of "PSA", "PET Scan", "Biopsy", "Blood Test", "Other"
- psaLevel: PSA value as string (only for PSA reports), e.g. "4.5"
- findings: brief summary of findings

Only include data that is clearly present in the document. If no reports found, return an empty array.
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
