export type UserRole = 'admin' | 'technician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface DpiItem {
  name: string;
  notes?: string;
}

export interface Finding {
  id: string;
  description: string;
  hazard: string;
  damage: number; // Valore da 1 a 4 per la Magnitudo del Danno
  probability: number; // Valore da 1 a 4 per la Probabilità di accadimento
  exposure: number; // Valore da 1 a 4 per la Frequenza di Esposizione
  riskLevel: number; // Valore calcolato (1-10) da D*P*E
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