# OncoCare AI - Cancer Patient Management Platform

A comprehensive AI-powered cancer patient management application designed for caregivers managing elderly cancer patients. Features a web dashboard for caregivers and a Telegram bot with voice interaction for patients.

## Features

### Caregiver Dashboard (Web UI)
- **Multi-Patient Profiles** - Manage multiple patient records with medical history tracking
- **Document Upload & OCR** - Upload medical PDFs and scanned images; auto-extracts PSA levels, findings, and report dates using GPT-4o Vision OCR
- **PSA Trend Visualization** - Interactive year-wise PSA level charts with Recharts
- **AI Analysis & Treatment Plan** - Unified section with:
  - **Quick Summary** - Fast AI-generated treatment summary based on patient data and NCCN guidelines
  - **Deep Agent Analysis** - Multi-tool agentic AI that searches PubMed, CIViC genomics, NCCN guidelines, clinical trials, and analyzes PSA trends
- **Document Q&A (RAG)** - Ask natural language questions about uploaded medical reports
- **Replit Auth** - Secure authentication via Replit OIDC

### Patient Interface
- **Telegram Bot** - Voice and text-based palliative care companion for elderly patients
- **In-App Voice Chat** - Browser-based voice interaction with AI companion using WebM/Opus audio streaming and real-time PCM16 playback

### Agentic AI Tools
The Python FastAPI agent uses OpenAI tool calling to orchestrate:
1. **PubMed Search** - NCBI E-utilities API for medical literature
2. **CIViC Genomics** - Washington University genomics database (GraphQL)
3. **NCCN Guidelines** - Embedded prostate cancer treatment protocols
4. **Drug Information** - Database covering docetaxel, enzalutamide, abiraterone, cabazitaxel, lutetium-177-PSMA, cisplatin
5. **PSA Trend Analysis** - Calculates doubling time, velocity, and rate of change
6. **ClinicalTrials.gov** - Search for active clinical trials

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS + custom design system
- Recharts (PSA charts)
- Framer Motion (animations)
- Wouter (routing)
- TanStack React Query v5

### Backend (Node.js - Port 5000)
- Express.js
- PostgreSQL + Drizzle ORM
- Replit Auth (Passport.js OIDC)
- OpenAI GPT-5.1 / GPT-4o (via Replit AI Integrations)
- pdf-parse for PDF text extraction
- node-telegram-bot-api
- In-memory LRU cache with TTL

### Backend (Python - Port 8000)
- FastAPI + Uvicorn
- AsyncOpenAI client
- httpx for external API calls
- Medical knowledge base (NCCN guidelines, drug info)
- In-memory tool result caching

### Database
- PostgreSQL (Replit-provisioned)
- Tables: users, sessions, patient_profiles, medical_reports, document_chunks, conversations, messages, patient_conversations

## Project Structure

```
.
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── caregiver/           # CaregiverTab, PsaChart
│   │   │   ├── patient/             # PatientTab (voice chat)
│   │   │   └── ui/                  # Button, Input, Modal
│   │   ├── hooks/                   # React Query hooks
│   │   ├── pages/                   # Login, Dashboard, ProfileView
│   │   └── replit_integrations/     # Audio recording & playback
│   └── public/
│       └── audio-playback-worklet.js
├── server/                          # Node.js Express backend
│   ├── routes.ts                    # API route handlers
│   ├── storage.ts                   # Database interface
│   ├── pdf-rag.ts                   # PDF processing & RAG
│   ├── cache.ts                     # LRU cache (RAG, analysis, agent)
│   ├── telegram-bot.ts             # Telegram bot
│   └── vite.ts                      # Vite dev server integration
├── python_api/                      # Python FastAPI service
│   ├── main.py                      # FastAPI app entry
│   ├── agents.py                    # OpenAI tool-calling agent
│   ├── tools.py                     # Tool implementations + cache
│   └── medical_kb.py               # NCCN guidelines & drug data
├── shared/                          # Shared types & schemas
│   ├── schema.ts                    # Drizzle table definitions
│   └── routes.ts                    # API contracts with Zod
└── drizzle.config.ts
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session encryption key |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (via Replit AI Integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (via Replit AI Integration) |

## Setup & Running

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL database

### Install Dependencies

```bash
# Node.js dependencies
npm install

# Python dependencies
pip install fastapi uvicorn httpx openai pydantic
```

### Database Setup

```bash
npm run db:push
```

### Run the Application

Start both services:

```bash
# Terminal 1: Node.js + Vite (port 5000)
npm run dev

# Terminal 2: Python FastAPI (port 8000)
cd python_api && python main.py
```

The app will be available at `http://localhost:5000`.

## API Endpoints

### Patient Profiles
- `GET /api/profiles` - List all profiles for authenticated user
- `POST /api/profiles` - Create a new patient profile
- `GET /api/profiles/:id` - Get profile details

### Medical Reports
- `GET /api/profiles/:id/reports` - List reports for a patient
- `POST /api/profiles/:id/reports` - Add a report manually

### Documents & RAG
- `POST /api/profiles/:id/upload-pdf` - Upload and process a medical document
- `POST /api/profiles/:id/query` - Ask questions about uploaded documents
- `GET /api/profiles/:id/documents` - List uploaded documents

### AI Analysis
- `POST /api/profiles/:id/analyze` - Quick AI analysis and treatment summary
- `POST /api/profiles/:id/agent-analyze` - Deep agentic AI analysis (proxied to Python)

### Voice Chat
- `POST /api/profiles/:id/voice-chat` - Voice chat endpoint (SSE streaming)

### Python Agent (Port 8000)
- `POST /api/agent/analyze` - Run multi-tool agent analysis
- `GET /api/agent/health` - Health check

## Caching Strategy

- **RAG Query Cache** - 30-minute TTL, keyed by patient ID + question
- **AI Analysis Cache** - 1-hour TTL, keyed by patient ID + reports hash
- **Agent Analysis Cache** - 30-minute TTL, keyed by patient ID + question + reports hash
- **Python Tool Cache** - 30-minute TTL for PubMed, CIViC, clinical trials results
- Cache auto-invalidates per patient when new documents are uploaded

## Technical Notes

- Replit's OpenAI integration does not support the `/embeddings` endpoint; RAG uses keyword-based scoring instead of vector embeddings
- Uses `max_completion_tokens` (not `max_tokens`) for GPT-5.1 model compatibility
- pdf-parse API: `new PDFParse(new Uint8Array(buffer)).getText()` returns `{pages, text, total}`
- Voice recording uses WebM/Opus encoding; playback uses PCM16 via AudioWorklet
- AudioContext is pre-initialized on user gesture to avoid browser autoplay restrictions

## License

melanieharriet05@gmail.com
