import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useGenerateAnalysis() {
  return useMutation({
    mutationFn: async (patientId: number) => {
      const url = buildUrl(api.analysis.generateHistory.path, { patientId });
      const res = await fetch(url, {
        method: api.analysis.generateHistory.method,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to generate AI analysis");
      }
      const data = await res.json();
      return api.analysis.generateHistory.responses[200].parse(data);
    },
  });
}

export interface AgentResult {
  analysis: string;
  tools_used: Array<{
    tool: string;
    args: Record<string, any>;
    iteration: number;
  }>;
  iterations: number;
}

export function useAgentAnalysis() {
  return useMutation({
    mutationFn: async ({ patientId, question }: { patientId: number; question?: string }): Promise<AgentResult> => {
      const res = await fetch(`/api/profiles/${patientId}/agent-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: question || null }),
      });
      if (!res.ok) {
        throw new Error("Failed to run agent analysis");
      }
      return res.json();
    },
  });
}
