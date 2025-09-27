export interface DpiItem {
  name: string;
  notes?: string;
}

export interface Finding {
  id: string;
  description: string;
  hazard: string;
  riskLevel: number;
  regulation: string;
  recommendation: string;
  photo?: {
    analysis: string;
    base64?: string; 
  };
}

export interface Task {
  id: string;
  name: string;
  findings: Finding[];
  requiredDpi: DpiItem[];
}

export interface Workplace {
  id: string;
  name: string;
  tasks: Task[];
}

export type Report = Workplace[];

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  photo?: string; 
  sources?: { uri: string; title: string }[];
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