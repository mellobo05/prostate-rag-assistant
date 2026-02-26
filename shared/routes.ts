import { z } from "zod";
import { insertPatientProfileSchema, patientProfiles, insertMedicalReportSchema, medicalReports } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  profiles: {
    list: {
      method: 'GET' as const,
      path: '/api/profiles' as const,
      responses: {
        200: z.array(z.custom<typeof patientProfiles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/profiles/:id' as const,
      responses: {
        200: z.custom<typeof patientProfiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/profiles' as const,
      input: insertPatientProfileSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof patientProfiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  reports: {
    list: {
      method: 'GET' as const,
      path: '/api/profiles/:patientId/reports' as const,
      responses: {
        200: z.array(z.custom<typeof medicalReports.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/profiles/:patientId/reports' as const,
      input: insertMedicalReportSchema.omit({ patientId: true }),
      responses: {
        201: z.custom<typeof medicalReports.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  analysis: {
    generateHistory: {
      method: 'POST' as const,
      path: '/api/profiles/:patientId/analyze' as const,
      responses: {
        200: z.object({ analysis: z.string() }),
        404: errorSchemas.notFound,
      },
    }
  },
  // Patient voice chat
  patientVoice: {
    chat: {
      method: 'POST' as const,
      path: '/api/profiles/:patientId/voice-chat' as const,
      input: z.object({
        audio: z.string() // base64
      }),
      responses: {
        200: z.any() // SSE stream, not easily typed via standard JSON
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type PatientProfileInput = z.infer<typeof api.profiles.create.input>;
export type MedicalReportInput = z.infer<typeof api.reports.create.input>;
