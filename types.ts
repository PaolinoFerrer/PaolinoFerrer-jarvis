export interface Finding {
  id: string;
  description: string;
  hazard: string;
  riskLevel: number;
  regulation: string;
  recommendation: string;
  photo?: {
    analysis: string;
    base64?: string; // For displaying the uploaded photo in the report
  };
}

export interface Section {
  title: string;
  findings: Finding[];
}

export type Report = Section[];

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  photo?: string; // base64 URI for display in chat
  sources?: { uri: string; title: string }[];
  suggestedSources?: { uri: string; title: string }[];
}

export interface DriveFile {
  id: string;
  name: string;
}

export interface KnowledgeSource {
    id: string;
    type: 'web' | 'file';
    uri: string;
    title: string;
    status: 'pending' | 'processing' | 'ready' | 'error';
    createdAt: string;
}
