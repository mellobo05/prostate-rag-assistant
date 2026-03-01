import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { openai, ensureCompatibleFormat, speechToText } from "./replit_integrations/audio/client";
import { chatStorage } from "./replit_integrations/chat/storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import express from "express";
import multer from "multer";
import { processPdfBuffer, queryRag, getUploadedDocuments } from "./pdf-rag";
import { ragCache, analysisCache, agentCache, ragCacheKey, analysisCacheKey, agentCacheKey, reportsHash, invalidatePatientCache } from "./cache";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  // PROFILES
  app.get(api.profiles.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profiles = await storage.getProfilesByUser(userId);
    res.json(profiles);
  });

  app.get(api.profiles.get.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profileId = Number(req.params.id);
    const profile = await storage.getProfileByUserIdAndId(userId, profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  });

  app.post(api.profiles.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const input = api.profiles.create.input.parse(req.body);
      const profile = await storage.createProfile({ ...input, userId });
      res.status(201).json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // REPORTS
  app.get(api.reports.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const patientId = Number(req.params.patientId);
    const profile = await storage.getProfileByUserIdAndId(userId, patientId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const reports = await storage.getReports(patientId);
    res.json(reports);
  });

  app.post(api.reports.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patientId = Number(req.params.patientId);
      const profile = await storage.getProfileByUserIdAndId(userId, patientId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const input = api.reports.create.input.parse(req.body);
      
      // Auto-parse date if it comes as string
      let reportDate = input.reportDate;
      if (typeof reportDate === 'string') {
        reportDate = new Date(reportDate);
      }

      const report = await storage.createReport({ ...input, reportDate, patientId });
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // ANALYZE (Caregiver View)
  app.post(api.analysis.generateHistory.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const patientId = Number(req.params.patientId);
    const profile = await storage.getProfileByUserIdAndId(userId, patientId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const reports = await storage.getReports(patientId);

    const rHash = reportsHash(reports);
    const cacheKey = analysisCacheKey(patientId, rHash);
    const cached = analysisCache.get(cacheKey);
    if (cached) {
      console.log(`[cache] Analysis cache hit for patient ${patientId}`);
      return res.json({ analysis: cached, cached: true });
    }

    const systemPrompt = `You are a top oncologist specializing in prostate cancer. You are reviewing the medical history and reports of a patient.
Create a comprehensive but accessible summary of their medical history, PSA trends, and suggest potential standard lines of treatment based on the NCCN guidelines. 
Keep it professional but encouraging. Do not provide a formal diagnosis or replace actual doctor's advice.`;

    const userPrompt = `Patient Details:
Name: ${profile.name}
Type: ${profile.cancerType}
Stage: ${profile.stage || 'Unknown'}

Reports:
${reports.map(r => `- Date: ${r.reportDate.toISOString().split('T')[0]}, Type: ${r.reportType}, PSA: ${r.psaLevel || 'N/A'}, Findings: ${r.findings || 'N/A'}`).join('\n')}

Please analyze this data and provide a concise summary and next steps.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const analysis = response.choices[0].message.content || "";
      await storage.updateProfileHistory(patientId, analysis);
      analysisCache.set(cacheKey, analysis, 3600);

      res.json({ analysis });
    } catch (error) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  // PDF UPLOAD
  app.post("/api/profiles/:patientId/upload-pdf", isAuthenticated, upload.single("pdf"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patientId = Number(req.params.patientId);
      const profile = await storage.getProfileByUserIdAndId(userId, patientId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const result = await processPdfBuffer(patientId, req.file.originalname, req.file.buffer);

      invalidatePatientCache(patientId);

      res.json({
        message: `Document processed successfully`,
        fileName: req.file.originalname,
        chunksCreated: result.chunksCreated,
        reportsExtracted: result.reportsExtracted,
      });
    } catch (err: any) {
      console.error("PDF upload error:", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: "File too large. Maximum size is 50MB." });
      }
      res.status(500).json({ message: err.message || "Failed to process document" });
    }
  });

  // RAG QUERY
  app.post("/api/profiles/:patientId/query", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patientId = Number(req.params.patientId);
      const profile = await storage.getProfileByUserIdAndId(userId, patientId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const { question } = req.body;
      if (!question || typeof question !== "string") {
        return res.status(400).json({ message: "Question is required" });
      }

      const cacheKey = ragCacheKey(patientId, question);
      const cached = ragCache.get(cacheKey);
      if (cached) {
        console.log(`[cache] RAG cache hit for patient ${patientId}`);
        return res.json({ answer: cached, cached: true });
      }

      const answer = await queryRag(patientId, question);
      ragCache.set(cacheKey, answer, 1800);
      res.json({ answer });
    } catch (err) {
      console.error("RAG query error:", err);
      res.status(500).json({ message: "Failed to query documents" });
    }
  });

  // LIST UPLOADED DOCUMENTS
  app.get("/api/profiles/:patientId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patientId = Number(req.params.patientId);
      const profile = await storage.getProfileByUserIdAndId(userId, patientId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const documents = await getUploadedDocuments(patientId);
      res.json({ documents });
    } catch (err) {
      console.error("Documents list error:", err);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // VOICE CHAT (Patient View)
  // We need express.json with a high limit for base64 audio
  app.post(api.patientVoice.chat.path, isAuthenticated, express.json({ limit: "50mb" }), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patientId = Number(req.params.patientId);
      const profile = await storage.getProfileByUserIdAndId(userId, patientId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const { audio, voice = "alloy" } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      // Convert audio
      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);

      // Transcribe
      const userTranscript = await speechToText(audioBuffer, inputFormat);

      // Setup SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userTranscript })}\n\n`);

      const systemPrompt = `You are a compassionate, empathetic palliative care doctor speaking with ${profile.name}, an elderly patient who has ${profile.cancerType}.
      Your goal is to provide comfort, gentle guidance, and listen to their symptoms.
      CRITICAL INSTRUCTIONS:
      1. Keep your responses short, conversational, and easy to understand.
      2. DO NOT mention stages, survival rates, or scary medical jargon.
      3. Focus on symptom management, emotional support, and reassuring them.
      4. If they report severe symptoms (like severe pain, inability to urinate), advise them gently to have their family contact their main doctor.
      `;

      // We don't have persistent conversation history for the palliative bot in this simple example,
      // but we could use the chatStorage to create a dedicated conversation for the patient.
      // For simplicity, we just respond to the immediate prompt.
      const chatHistory: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userTranscript }
      ];

      const stream = await openai.chat.completions.create({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: { voice, format: "pcm16" },
        messages: chatHistory,
        stream: true,
      });

      let assistantTranscript = "";

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta as any;
        if (!delta) continue;

        if (delta?.audio?.transcript) {
          assistantTranscript += delta.audio.transcript;
          res.write(`data: ${JSON.stringify({ type: "transcript", data: delta.audio.transcript })}\n\n`);
        }

        if (delta?.audio?.data) {
          res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "done", transcript: assistantTranscript })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Error processing voice message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to process voice message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice message" });
      }
    }
  });

  // AGENT ANALYSIS (Python FastAPI proxy)
  app.post("/api/profiles/:patientId/agent-analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patientId = Number(req.params.patientId);
      const profile = await storage.getProfileByUserIdAndId(userId, patientId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const reports = await storage.getReports(patientId);
      const { question } = req.body || {};

      const rHash = reportsHash(reports);
      const cacheKey = agentCacheKey(patientId, question || "", rHash);
      const cached = agentCache.get(cacheKey);
      if (cached) {
        console.log(`[cache] Agent cache hit for patient ${patientId}`);
        return res.json({ ...cached, cached: true });
      }

      const agentPayload = {
        profile: {
          name: profile.name,
          cancerType: profile.cancerType,
          stage: profile.stage || null,
          dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().split("T")[0] : null,
          medicalHistory: profile.medicalHistory || null,
        },
        reports: reports.map(r => ({
          reportDate: r.reportDate.toISOString(),
          reportType: r.reportType,
          psaLevel: r.psaLevel || null,
          findings: r.findings || null,
        })),
        question: question || null,
      };

      const agentUrl = `http://localhost:8000/api/agent/analyze`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const agentRes = await fetch(agentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentPayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!agentRes.ok) {
        const errText = await agentRes.text();
        console.error("[agent-proxy] Agent error:", errText);
        return res.status(500).json({ message: "Agent analysis failed" });
      }

      const result = await agentRes.json();
      agentCache.set(cacheKey, result, 1800);
      res.json(result);
    } catch (err) {
      console.error("[agent-proxy] Error:", err);
      res.status(500).json({ message: "Failed to connect to AI agent service" });
    }
  });

  return httpServer;
}
