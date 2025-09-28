// Fix: This file was empty. Implementing a mock backend service for the knowledge base.
import { KnowledgeSource } from '../types';

const KB_STORAGE_KEY = 'jarvis-knowledge-base-mock';

// Initialize with some default data for demonstration
const getInitialMockData = (): Record<string, KnowledgeSource> => ({
    'kb-web-1': {
        id: 'kb-web-1',
        type: 'web',
        uri: 'https://www.inail.it/cs/internet/comunicazione/pubblicazioni/catalogo-generale/pubbl-d-lgs-81-2008-testo-unico-sicurezza.html',
        title: 'INAIL - Testo Unico Sicurezza D.Lgs. 81/2008',
        status: 'ready',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    'kb-file-1': {
        id: 'kb-file-1',
        type: 'file',
        uri: 'blob:mock-file-uri-1',
        title: 'linee_guida_movimentazione_carichi.pdf',
        status: 'ready',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
    }
});

const getMockKb = (): Record<string, KnowledgeSource> => {
    try {
        const stored = localStorage.getItem(KB_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        const initialData = getInitialMockData();
        localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(initialData));
        return initialData;
    } catch (error) {
        console.error("Failed to load mock KB from localStorage", error);
        return getInitialMockData();
    }
};

const saveMockKb = (kb: Record<string, KnowledgeSource>) => {
    try {
        localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kb));
    } catch (error) {
        console.error("Failed to save mock KB to localStorage", error);
    }
};

// Simulate backend processing delay
const simulateProcessing = (sourceId: string) => {
    setTimeout(() => {
        const kb = getMockKb();
        if (kb[sourceId] && kb[sourceId].status === 'processing') {
            kb[sourceId].status = 'ready';
            saveMockKb(kb);
            console.log(`BACKEND: Source ${sourceId} is now ready.`);
        }
    }, 3000 + Math.random() * 3000); // 3-6 second delay
};

export const listKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
    console.log("BACKEND: Listing knowledge sources");
    const kb = getMockKb();
    const sources = Object.values(kb).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.resolve(sources);
};

export const addWebKnowledgeSource = async (uri: string, title: string): Promise<KnowledgeSource> => {
    console.log("BACKEND: Adding web source", { uri, title });
    const kb = getMockKb();
    const newId = `kb-web-${Date.now()}`;
    const newSource: KnowledgeSource = {
        id: newId,
        type: 'web',
        uri,
        title,
        status: 'processing',
        createdAt: new Date().toISOString(),
    };
    kb[newId] = newSource;
    saveMockKb(kb);
    simulateProcessing(newId);
    return Promise.resolve(newSource);
};

export const addFileKnowledgeSource = async (file: File): Promise<KnowledgeSource> => {
    console.log("BACKEND: Adding file source", file.name);
    const kb = getMockKb();
    const newId = `kb-file-${Date.now()}`;
    const newSource: KnowledgeSource = {
        id: newId,
        type: 'file',
        uri: `blob:mock-file/${file.name}`, // In a real app, this would be a server URI
        title: file.name,
        status: 'processing',
        createdAt: new Date().toISOString(),
    };
    kb[newId] = newSource;
    saveMockKb(kb);
    simulateProcessing(newId);
    return Promise.resolve(newSource);
};

export const deleteKnowledgeSource = async (sourceId: string): Promise<void> => {
    console.log("BACKEND: Deleting source", sourceId);
    const kb = getMockKb();
    if (kb[sourceId]) {
        delete kb[sourceId];
        saveMockKb(kb);
        return Promise.resolve();
    }
    throw new Error("Source to delete not found.");
};

// This is the RAG search function. In a real backend, this would perform a vector search.
// Here, we'll just simulate it by returning the content of the first "ready" source that seems relevant.
export const searchKnowledgeBase = async (query: string): Promise<string | undefined> => {
    console.log("BACKEND: Searching knowledge base for:", query);
    const kb = getMockKb();
    const readySources = Object.values(kb).filter(s => s.status === 'ready');

    if (readySources.length === 0) {
        return undefined;
    }
    
    // Simple keyword matching for mock implementation
    const queryWords = query.toLowerCase().split(/\s+/);
    const foundSource = readySources.find(source => 
        queryWords.some(word => source.title.toLowerCase().includes(word))
    );

    if (foundSource) {
        console.log("BACKEND: Found relevant context in", foundSource.title);
        // In a real system, we'd return chunks of content. Here, we just return a reference.
        return `Fonte: "${foundSource.title}" - ${foundSource.uri}`;
    }

    console.log("BACKEND: No relevant context found.");
    return undefined;
};
