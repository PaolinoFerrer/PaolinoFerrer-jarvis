// FIX: Define and export all necessary types to resolve circular dependency and missing export errors.
export interface FindingPhoto {
  analysis: string;
  base64?: string;
}

export interface Finding {
  id: string;
  description: string;
  hazard: string;
  riskLevel: number;
  regulation: string;
  recommendation: string;
  photo?: FindingPhoto;
}

export interface ReportSection {
  title: string;
  findings: Finding[];
}

export type Report = ReportSection[];

export interface SavedReport {
  id:string; // timestamp
  name: string;
  savedAt: string; // ISO date string
  report: Report;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  photo?: string; // data URL for image
  sources?: { uri: string; title: string }[];
  suggestedSources?: { uri: string; title: string }[]; // NUOVO: Per la Fase 2 (apprendimento)
}

export interface DriveFile {
  id: string;
  name: string;
}

export interface ReportMetadata {
  driveId: string | null;
  name: string | null;
}