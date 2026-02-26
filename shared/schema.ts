export * from "./models/auth";
export * from "./models/chat";

import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { conversations } from "./models/chat";

export const patientProfiles = pgTable("patient_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  cancerType: text("cancer_type").default('Prostate Cancer'),
  stage: text("stage"),
  medicalHistory: text("medical_history"), // overall summary
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalReports = pgTable("medical_reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  reportDate: timestamp("report_date").notNull(),
  reportType: text("report_type").notNull(), // 'PSA', 'PET Scan', 'Biopsy', 'Other'
  psaLevel: text("psa_level"),
  findings: text("findings"),
  createdAt: timestamp("created_at").defaultNow(),
});

// We can link patientProfiles to conversations if we want the patient's chats tied to their profile.
export const patientConversations = pgTable("patient_conversations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
});

export const insertPatientProfileSchema = createInsertSchema(patientProfiles).omit({ id: true, createdAt: true });
export const insertMedicalReportSchema = createInsertSchema(medicalReports).omit({ id: true, createdAt: true });

export type PatientProfile = typeof patientProfiles.$inferSelect;
export type InsertPatientProfile = z.infer<typeof insertPatientProfileSchema>;

export type MedicalReport = typeof medicalReports.$inferSelect;
export type InsertMedicalReport = z.infer<typeof insertMedicalReportSchema>;
