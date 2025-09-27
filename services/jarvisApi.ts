import { KnowledgeSource } from '../types.ts';

// This is a mock API. In a real application, this would make fetch requests
// to a backend server (e.g., 'https://api.jarvis-app.com/sources').

const API_ENDPOINT = '/api/knowledge'; // Using a local proxy for development

let mockKnowledgeBase: KnowledgeSource[] = [
    {
        id: '1',
        type: 'web',
        uri: 'https://www.gazzettaufficiale.it/eli/id/2008/04/30/008G0104/sg',
        title: 'D.Lgs. 81/08 - Testo Unico Sicurezza Lavoro',
        status: 'ready',
        createdAt: new Date().toISOString()
    }
];

export const listSources = async (): Promise<KnowledgeSource[]> => {
    console.log('API: Listing sources');
    // In a real app:
    // const response = await fetch(API_ENDPOINT);
    // if (!response.ok) throw new Error('Failed to fetch sources');
    // return response.json();
    return Promise.resolve([...mockKnowledgeBase]);
};

export const addSource = async (uri: string, title: string): Promise<KnowledgeSource> => {
    console.log('API: Adding source', { uri, title });
    // In a real app:
    // const response = await fetch(API_ENDPOINT, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ uri, title, type: 'web' })
    // });
    // if (!response.ok) throw new Error('Failed to add source');
    // return response.json();

    const newSource: KnowledgeSource = {
        id: Date.now().toString(),
        type: 'web',
        uri,
        title,
        status: 'ready', // Mocking as instantly ready
        createdAt: new Date().toISOString()
    };
    mockKnowledgeBase.push(newSource);
    return Promise.resolve(newSource);
};

export const deleteSource = async (sourceId: string): Promise<void> => {
    console.log('API: Deleting source', sourceId);
    // In a real app:
    // const response = await fetch(`${API_ENDPOINT}/${sourceId}`, { method: 'DELETE' });
    // if (!response.ok) throw new Error('Failed to delete source');
    
    const index = mockKnowledgeBase.findIndex(s => s.id === sourceId);
    if (index > -1) {
        mockKnowledgeBase.splice(index, 1);
    } else {
        throw new Error("Source not found");
    }
    return Promise.resolve();
};
