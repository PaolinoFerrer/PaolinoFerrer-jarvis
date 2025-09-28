import { KnowledgeSource } from '../types';

const KNOWLEDGE_BASE_KEY = 'jarvis-knowledge-base-mock';

const getInitialKnowledgeData = (): Record<string, KnowledgeSource> => ({
    'kb-web-1': {
        id: 'kb-web-1',
        type: 'web',
        uri: 'https://www.inail.it/cs/internet/comunicazione/pubblicazioni/catalogo-generale/quaderno-microrischi-uffici.html',
        title: 'INAIL - Quaderno Microrischi Uffici',
        status: 'ready',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    'kb-file-1': {
        id: 'kb-file-1',
        type: 'file',
        uri: 'docs/d-lgs-81-08.pdf',
        title: 'D.Lgs. 81/08 Testo Unico Sicurezza',
        status: 'ready',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
});

const getMockKnowledgeBase = (): Record<string, KnowledgeSource> => {
    try {
        const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        const initialData = getInitialKnowledgeData();
        localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(initialData));
        return initialData;
    } catch (error) {
        console.error("Failed to load mock knowledge base from localStorage", error);
        return getInitialKnowledgeData();
    }
};

const saveMockKnowledgeBase = (kb: Record<string, KnowledgeSource>) => {
    try {
        localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(kb));
    } catch (error) {
        console.error("Failed to save mock knowledge base to localStorage", error);
    }
};

export const listKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
    console.log("BACKEND: Listing knowledge sources");
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network latency
    const kb = getMockKnowledgeBase();
    const sources = Object.values(kb).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.resolve(sources);
};

const processSource = (sourceId: string) => {
    setTimeout(() => {
        const kb = getMockKnowledgeBase();
        if (kb[sourceId] && kb[sourceId].status === 'processing') {
            kb[sourceId].status = 'ready';
            saveMockKnowledgeBase(kb);
            console.log(`BACKEND: Source ${sourceId} is now ready.`);
            // Note: In a real app, you'd want to notify the UI of this change.
        }
    }, 3000); // Simulate 3 seconds processing time
};

export const addWebKnowledgeSource = async (uri: string, title: string): Promise<void> => {
    console.log("BACKEND: Adding web source", { uri, title });
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    const kb = getMockKnowledgeBase();
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
    saveMockKnowledgeBase(kb);
    processSource(newId);
    return Promise.resolve();
};

export const addFileKnowledgeSource = async (file: File): Promise<void> => {
    console.log("BACKEND: Adding file source", file.name);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    const kb = getMockKnowledgeBase();
    const newId = `kb-file-${Date.now()}`;
    const newSource: KnowledgeSource = {
        id: newId,
        type: 'file',
        uri: `docs/${file.name}`, // Mock URI
        title: file.name,
        status: 'processing',
        createdAt: new Date().toISOString(),
    };
    kb[newId] = newSource;
    saveMockKnowledgeBase(kb);
    processSource(newId);
    return Promise.resolve();
};

export const deleteKnowledgeSource = async (sourceId: string): Promise<void> => {
    console.log("BACKEND: Deleting source", sourceId);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    const kb = getMockKnowledgeBase();
    if (kb[sourceId]) {
        delete kb[sourceId];
        saveMockKnowledgeBase(kb);
        return Promise.resolve();
    }
    throw new Error("Source to delete not found in mock knowledge base.");
};
