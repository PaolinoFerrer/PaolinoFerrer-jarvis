
export interface Finding {
  id: string;
  description: string;
  hazard: string;
  riskLevel: number; // 1-10
  regulation: string;
  recommendation: string;
  photo?: {
    base64: string;
    analysis: string;
  };
}

export interface ReportSection {
  title: string;
  findings: Finding[];
}

export type Report = ReportSection[];

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  photo?: string; // base64 url
}
