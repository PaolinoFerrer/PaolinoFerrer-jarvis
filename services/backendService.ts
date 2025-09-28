// Fix: Replaced placeholder content with a mock implementation of the backend service.
import { KnowledgeSource } from '../types';

const KNOWLEDGE_BASE_KEY = 'jarvis-knowledge-base';

// Helper function to simulate a delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


const getInitialMockData = (): Record<string, KnowledgeSource> => ({
    'web-1': {
        id: 'web-1',
        type: 'web',
        uri: 'https://www.lavoro.gov.it/temi-e-priorita/salute-e-sicurezza/focus-on/testo-unico-sicurezza-sul-lavoro/Pagine/default.aspx',
        title: 'Testo Unico Sicurezza sul Lavoro (D.Lgs. 81/08)',
        status: 'ready',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    'file-1': {
        id: 'file-1',
        type: 'file',
        uri: 'mock-file-uri/linee-guida-magazzino.pdf',
        title: 'Linee Guida Interne - Stoccaggio Magazzino.pdf',
        status: 'ready',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
    }
});


const getKnowledgeBase = (): Record<string, KnowledgeSource> => {
    try {
        const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        const initialData = getInitialMockData();
        localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(initialData));
        return initialData;
    } catch (error) {
        console.error("Failed to load knowledge base from localStorage", error);
        return getInitialMockData();
    }
};

const saveKnowledgeBase = (kb: Record<string, KnowledgeSource>) => {
    try {
        localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(kb));
    } catch (error) {
        console.error("Failed to save knowledge base to localStorage", error);
    }
};

export const listKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
    await delay(500);
    const kb = getKnowledgeBase();
    const sources = Object.values(kb).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sources;
};

export const addWebKnowledgeSource = async (uri: string, title: string): Promise<KnowledgeSource> => {
    await delay(500);
    const kb = getKnowledgeBase();
    const newSource: KnowledgeSource = {
        id: `web-${Date.now()}`,
        type: 'web',
        uri,
        title,
        status: 'ready',
        createdAt: new Date().toISOString()
    };
    kb[newSource.id] = newSource;
    saveKnowledgeBase(kb);
    return newSource;
};

export const addFileKnowledgeSource = async (file: File): Promise<KnowledgeSource> => {
    await delay(1000); // Simulate upload and processing
    const kb = getKnowledgeBase();
    const newSource: KnowledgeSource = {
        id: `file-${Date.now()}`,
        type: 'file',
        uri: `mock-file-uri/${file.name}`,
        title: file.name,
        status: 'ready',
        createdAt: new Date().toISOString()
    };
    kb[newSource.id] = newSource;
    saveKnowledgeBase(kb);
    return newSource;
};

export const deleteKnowledgeSource = async (sourceId: string): Promise<void> => {
    await delay(300);
    const kb = getKnowledgeBase();
    if(kb[sourceId]) {
        delete kb[sourceId];
        saveKnowledgeBase(kb);
    }
};

/**
 * Simulates a RAG search against the knowledge base.
 * In a real scenario, this would involve embedding and vector search.
 * Here, we just do a simple keyword match on the title.
 */
export const searchKnowledgeBase = async (query: string): Promise<string> => {
    await delay(300);
    const kb = getKnowledgeBase();
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    if (queryWords.length === 0) return "";
    
    const relevantSources = Object.values(kb).filter(source => {
        const titleLower = source.title.toLowerCase();
        return queryWords.some(word => titleLower.includes(word));
    });

    if (relevantSources.length > 0) {
        const context = `Riferimento trovato: "${relevantSources[0].title}". Applicare le procedure indicate in questo documento.`;
        console.log("BACKEND MOCK: Found knowledge context:", context);
        return context;
    }
    
    console.log("BACKEND MOCK: No relevant knowledge context found.");
    return "";
};
