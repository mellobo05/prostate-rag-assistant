import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useUploadPdf(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`/api/profiles/${patientId}/upload-pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload PDF");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reports.list.path, patientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", patientId, "documents"] });
    },
  });
}

export function useQueryDocuments(patientId: number) {
  return useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch(`/api/profiles/${patientId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to query documents");
      }
      return res.json();
    },
  });
}

export function useDocuments(patientId: number) {
  return useQuery({
    queryKey: ["/api/profiles", patientId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${patientId}/documents`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!patientId,
  });
}
