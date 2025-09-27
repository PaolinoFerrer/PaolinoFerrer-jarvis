import { KnowledgeSource } from '../types.ts';

// This is a mock API. In a real application, this would make fetch requests
// to a backend server (e.g., 'https://api.jarvis-app.com/sources').

const KB_STORAGE_KEY = 'jarvis-knowledge-base';

// Initial default state if localStorage is empty
const initialKnowledgeBase: KnowledgeSource[] = [
    {
        id: '1',
        type: 'web',
        uri: 'https://www.gazzettaufficiale.it/eli/id/2008/04/30/008G0104/sg',
        title: 'D.Lgs. 81/08 - Testo Unico Sicurezza Lavoro',
        status: 'ready',
        createdAt: new Date().toISOString()
    }
];

// Function to load the KB from localStorage
const loadKnowledgeBase = (): KnowledgeSource[] => {
    try {
        const stored = localStorage.getItem(KB_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load knowledge base from localStorage", e);
    }
    // If nothing is stored or parsing fails, return the initial state and save it
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(initialKnowledgeBase));
    return initialKnowledgeBase;
};

// Function to save the KB to localStorage
const saveKnowledgeBase = (kb: KnowledgeSource[]) => {
    try {
        localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(kb));
    } catch (e) {
        console.error("Failed to save knowledge base to localStorage", e);
    }
};

// The mockKnowledgeBase is now initialized from localStorage
let mockKnowledgeBase: KnowledgeSource[] = loadKnowledgeBase();


export const listSources = async (): Promise<KnowledgeSource[]> => {
    console.log('API: Listing sources');
    mockKnowledgeBase = loadKnowledgeBase(); // Ensure it's fresh on every list
    return Promise.resolve([...mockKnowledgeBase]);
};

export const addSource = async (uri: string, title: string): Promise<KnowledgeSource> => {
    console.log('API: Adding web source', { uri, title });
    mockKnowledgeBase = loadKnowledgeBase();
    if (mockKnowledgeBase.some(s => s.uri === uri)) {
         console.log('API: Source already exists');
         const existing = mockKnowledgeBase.find(s => s.uri === uri)!;
         return Promise.resolve(existing);
    }
    const newSource: KnowledgeSource = {
        id: Date.now().toString(),
        type: 'web',
        uri,
        title,
        status: 'ready', // Mocking as instantly ready
        createdAt: new Date().toISOString()
    };
    mockKnowledgeBase.push(newSource);
    saveKnowledgeBase(mockKnowledgeBase);
    return Promise.resolve(newSource);
};


export const addFile = async (file: File): Promise<KnowledgeSource> => {
    console.log('API: Adding file source', { name: file.name, size: file.size });
    mockKnowledgeBase = loadKnowledgeBase();
    if (mockKnowledgeBase.some(s => s.title === file.name && s.type === 'file')) {
        console.log('API: File already exists');
        const existing = mockKnowledgeBase.find(s => s.title === file.name && s.type === 'file')!;
        return Promise.resolve(existing);
    }
    const newSource: KnowledgeSource = {
        id: Date.now().toString(),
        type: 'file',
        uri: `file://${file.name}`, // Mock URI
        title: file.name,
        status: 'ready', // Mocking as instantly ready
        createdAt: new Date().toISOString()
    };
    mockKnowledgeBase.push(newSource);
    saveKnowledgeBase(mockKnowledgeBase);
    return Promise.resolve(newSource);
};


export const deleteSource = async (sourceId: string): Promise<void> => {
    console.log('API: Deleting source', sourceId);
    mockKnowledgeBase = loadKnowledgeBase();
    const index = mockKnowledgeBase.findIndex(s => s.id === sourceId);
    if (index > -1) {
        mockKnowledgeBase.splice(index, 1);
        saveKnowledgeBase(mockKnowledgeBase);
    } else {
        throw new Error("Source not found");
    }
    return Promise.resolve();
};