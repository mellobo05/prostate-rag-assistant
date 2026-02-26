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
