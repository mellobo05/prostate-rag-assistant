# OncoCare AI - Cancer Patient Management App

## Overview
A comprehensive cancer patient care application with web and Telegram bot interfaces. Designed for caregivers managing elderly cancer patients, with AI-powered analysis, agentic AI tool calling, and a palliative care companion.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Recharts, Framer Motion, wouter routing
- **Backend (Node.js)**: Express.js, PostgreSQL with Drizzle ORM (port 5000)
- **Backend (Python)**: FastAPI + Uvicorn, agentic AI with OpenAI tool calling (port 8000)
- **Auth**: Replit Auth (passport-based)
- **AI**: OpenAI via Replit AI Integrations (GPT-5.1 for analysis, GPT-4o for Vision OCR)
- **Bot**: Telegram bot (node-telegram-bot-api) for patient voice/text interaction

## Key Features
1. **Multi-patient profiles** - Caregivers manage multiple patient records
2. **PDF Upload & RAG** - Upload medical PDFs, auto-extract reports, query documents with AI
3. **PSA Trend Visualization** - Year-wise PSA level charts using Recharts
4. **AI Analysis** - Generate treatment summaries based on medical history
5. **Agentic AI Analysis** - Python FastAPI service with multi-tool AI agent:
   - PubMed research search (NCBI E-utilities API)
   - CIViC genomics database (Washington University)
   - NCCN prostate cancer treatment guidelines
   - Drug information database
   - PSA trend analysis (doubling time, velocity)
   - ClinicalTrials.gov search
6. **Document Q&A** - Ask questions about uploaded reports (RAG-based with keyword search)
7. **Telegram Bot** - Voice/text palliative care companion for patients
8. **Voice Chat** - In-app voice interaction with AI companion (Patient View)

## Database Tables
- `users` - Replit Auth users
- `sessions` - Auth sessions
- `patient_profiles` - Patient records with medical history
- `medical_reports` - PSA tests, PET scans, biopsies, etc.
- `document_chunks` - PDF text chunks for RAG (keyword-based, no embeddings)
- `conversations` / `messages` - Chat storage
- `patient_conversations` - Links patients to conversations

## File Structure
- `shared/schema.ts` - Drizzle schema definitions
- `shared/routes.ts` - API route definitions with Zod validation
- `server/routes.ts` - Express route handlers (includes proxy to Python agent)
- `server/storage.ts` - Database storage interface
- `server/pdf-rag.ts` - PDF processing and RAG query logic (keyword-based search)
- `server/telegram-bot.ts` - Telegram bot implementation
- `python_api/main.py` - FastAPI app entry point
- `python_api/agents.py` - OpenAI tool-calling agent orchestration
- `python_api/tools.py` - Tool definitions and handlers (PubMed, CIViC, clinical trials, etc.)
- `python_api/medical_kb.py` - NCCN guidelines and drug information knowledge base
- `client/src/pages/` - Login, Signup, Dashboard, ProfileView
- `client/src/components/caregiver/` - CaregiverTab, PsaChart
- `client/src/hooks/` - React Query hooks (use-reports, use-analysis, use-documents, use-auth)

## Workflows
- **Start application** - `npm run dev` (Express + Vite on port 5000)
- **AI Agent Service** - `cd python_api && python main.py` (FastAPI on port 8000)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` - Session encryption key
- `TELEGRAM_BOT_TOKEN` - Telegram bot API token
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (Replit AI Integration)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (Replit AI Integration)

## Caching
- In-memory LRU cache with TTL on both Node.js and Python services
- **Node.js (`server/cache.ts`)**: Caches RAG queries (30min), AI analysis (1hr), agent results (30min)
- **Python (`python_api/tools.py`)**: Caches tool results (PubMed, CIViC, clinical trials) for 30min
- Cache is invalidated per-patient when new documents are uploaded
- Cache keys are based on patient ID + question/query + reports hash (so new reports = new results)

## Technical Notes
- Replit's OpenAI integration does NOT support `/embeddings` endpoint - RAG uses keyword-based search
- Use `max_completion_tokens` instead of `max_tokens` for GPT-5.1 model
- pdf-parse API: `new PDFParse(new Uint8Array(buffer)).getText()` returns `{pages, text, total}`
- Python service uses same OpenAI credentials via env vars
- Python agent uses AsyncOpenAI client for non-blocking async operation
