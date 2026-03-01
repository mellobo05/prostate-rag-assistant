import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from agents import run_agent

app = FastAPI(
    title="OncoCare AI Agent API",
    description="Agentic AI service for medical oncology analysis with tool calling",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


class PatientProfile(BaseModel):
    name: str
    cancerType: str
    stage: Optional[str] = None
    dateOfBirth: Optional[str] = None
    medicalHistory: Optional[str] = None


class MedicalReport(BaseModel):
    reportDate: str
    reportType: str
    psaLevel: Optional[str] = None
    findings: Optional[str] = None


class AgentRequest(BaseModel):
    profile: PatientProfile
    reports: list[MedicalReport] = []
    question: Optional[str] = None


class AgentResponse(BaseModel):
    analysis: str
    tools_used: list[dict]
    iterations: int


@app.get("/api/agent/health")
async def health_check():
    return {"status": "ok", "service": "oncocare-ai-agent"}


@app.post("/api/agent/analyze", response_model=AgentResponse)
async def analyze_patient(request: AgentRequest):
    try:
        patient_context = {
            "profile": request.profile.model_dump(),
            "reports": [r.model_dump() for r in request.reports],
        }

        result = await run_agent(patient_context, request.question)
        return AgentResponse(**result)
    except Exception as e:
        print(f"[agent] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AGENT_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
