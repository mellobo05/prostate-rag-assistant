# OncoCare AI - Cancer Patient Management App

## Overview
A comprehensive cancer patient care application with web and Telegram bot interfaces. Designed for caregivers managing elderly cancer patients, with AI-powered analysis and a palliative care companion.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, Recharts, Framer Motion, wouter routing
- **Backend**: Express.js, PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (passport-based)
- **AI**: OpenAI (GPT-5.1 for analysis, text-embedding-3-small for RAG)
- **Bot**: Telegram bot (node-telegram-bot-api) for patient voice/text interaction

## Key Features
1. **Multi-patient profiles** - Caregivers manage multiple patient records
2. **PDF Upload & RAG** - Upload medical PDFs, auto-extract reports, query documents with AI
3. **PSA Trend Visualization** - Year-wise PSA level charts using Recharts
4. **AI Analysis** - Generate treatment summaries based on medical history
5. **Document Q&A** - Ask questions about uploaded reports (RAG-based)
6. **Telegram Bot** - Voice/text palliative care companion for patients
7. **Voice Chat** - In-app voice interaction with AI companion (Patient View)

## Database Tables
- `users` - Replit Auth users
- `sessions` - Auth sessions
- `patient_profiles` - Patient records with medical history
- `medical_reports` - PSA tests, PET scans, biopsies, etc.
- `document_chunks` - PDF text chunks with embeddings for RAG
- `conversations` / `messages` - Chat storage
- `patient_conversations` - Links patients to conversations

## File Structure
- `shared/schema.ts` - Drizzle schema definitions
- `shared/routes.ts` - API route definitions with Zod validation
- `server/routes.ts` - Express route handlers
- `server/storage.ts` - Database storage interface
- `server/pdf-rag.ts` - PDF processing, embedding, and RAG query logic
- `server/telegram-bot.ts` - Telegram bot implementation
- `client/src/pages/` - Login, Signup, Dashboard, ProfileView
- `client/src/components/caregiver/` - CaregiverTab, PsaChart
- `client/src/hooks/` - React Query hooks (use-reports, use-analysis, use-documents, use-auth)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` - Session encryption key
- `TELEGRAM_BOT_TOKEN` - Telegram bot API token
- OpenAI is configured via Replit AI Integrations (no user key needed)
