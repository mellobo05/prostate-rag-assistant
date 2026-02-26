import { db } from "./db";
import {
  patientProfiles,
  medicalReports,
  type InsertPatientProfile,
  type PatientProfile,
  type InsertMedicalReport,
  type MedicalReport
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getProfiles(): Promise<PatientProfile[]>;
  getProfile(id: number): Promise<PatientProfile | undefined>;
  getProfileByUserIdAndId(userId: string, id: number): Promise<PatientProfile | undefined>;
  getProfilesByUser(userId: string): Promise<PatientProfile[]>;
  createProfile(profile: InsertPatientProfile): Promise<PatientProfile>;
  updateProfileHistory(id: number, history: string): Promise<PatientProfile>;

  getReports(patientId: number): Promise<MedicalReport[]>;
  createReport(report: InsertMedicalReport): Promise<MedicalReport>;
}

export class DatabaseStorage implements IStorage {
  async getProfiles(): Promise<PatientProfile[]> {
    return await db.select().from(patientProfiles);
  }

  async getProfilesByUser(userId: string): Promise<PatientProfile[]> {
    return await db.select().from(patientProfiles).where(eq(patientProfiles.userId, userId));
  }

  async getProfile(id: number): Promise<PatientProfile | undefined> {
    const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.id, id));
    return profile;
  }

  async getProfileByUserIdAndId(userId: string, id: number): Promise<PatientProfile | undefined> {
    const profiles = await db.select()
      .from(patientProfiles)
      .where(eq(patientProfiles.id, id));
    return profiles.find(p => p.userId === userId);
  }

  async createProfile(profile: InsertPatientProfile): Promise<PatientProfile> {
    const [newProfile] = await db.insert(patientProfiles).values(profile).returning();
    return newProfile;
  }

  async updateProfileHistory(id: number, history: string): Promise<PatientProfile> {
    const [updated] = await db.update(patientProfiles)
      .set({ medicalHistory: history })
      .where(eq(patientProfiles.id, id))
      .returning();
    return updated;
  }

  async getReports(patientId: number): Promise<MedicalReport[]> {
    return await db.select().from(medicalReports).where(eq(medicalReports.patientId, patientId));
  }

  async createReport(report: InsertMedicalReport): Promise<MedicalReport> {
    const [newReport] = await db.insert(medicalReports).values(report).returning();
    return newReport;
  }
}

export const storage = new DatabaseStorage();
