import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MedicalReportInput } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useReports(patientId: number) {
  return useQuery({
    queryKey: [api.reports.list.path, patientId],
    queryFn: async () => {
      const url = buildUrl(api.reports.list.path, { patientId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      return parseWithLogging(api.reports.list.responses[200], data, "reports.list");
    },
    enabled: !!patientId,
  });
}

export function useCreateReport(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: MedicalReportInput) => {
      const validated = api.reports.create.input.parse(data);
      const url = buildUrl(api.reports.create.path, { patientId });
      const res = await fetch(url, {
        method: api.reports.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create report");
      }
      return parseWithLogging(api.reports.create.responses[201], await res.json(), "reports.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reports.list.path, patientId] });
    },
  });
}
