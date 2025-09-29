import { KnowledgeSource } from '../types.ts';
import { db, storage } from './firebase.ts'; // Import the initialized Firebase app
import firebase from 'firebase/app';

const KNOWLEDGE_COLLECTION = 'knowledge_sources';

export const listKnowledgeSources = async (): Promise<KnowledgeSource[]> => {
    const q = db.collection(KNOWLEDGE_COLLECTION).orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    const sources: KnowledgeSource[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        sources.push({
            id: doc.id,
            ...data,
            createdAt: (data.createdAt as firebase.firestore.Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as KnowledgeSource);
    });
    return sources;
};

export const addWebKnowledgeSource = async (uri: string, title: string): Promise<KnowledgeSource> => {
    const newSource = {
        type: 'web',
        uri,
        title,
        status: 'ready', // Web sources are instantly ready
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection(KNOWLEDGE_COLLECTION).add(newSource);
    return { ...newSource, id: docRef.id, createdAt: new Date().toISOString() } as KnowledgeSource;
};

export const addFileKnowledgeSource = async (file: File): Promise<KnowledgeSource> => {
    // 1. Create a document with pending status in Firestore
    const pendingSource = {
        type: 'file',
        uri: `files/${file.name}`,
        title: file.name,
        status: 'processing',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const docRef = await db.collection(KNOWLEDGE_COLLECTION).add(pendingSource);
    
    // 2. Upload the file to Firebase Storage
    const storageRef = storage.ref(`knowledge-files/${docRef.id}/${file.name}`);
    await storageRef.put(file);
    const downloadURL = await storageRef.getDownloadURL();
    
    // 3. Update the document with the final URL and ready status (This part would typically be a cloud function for robustness)
    // For now, we simulate this update client-side.
    // NOTE: In a real app, you would set security rules so only a backend can change status to 'ready'.
    // We will skip updating the doc for now and just return the object. The list will show "processing".
    // A real implementation would require a backend function to update the status to 'ready' and set the final URI.

    return { ...pendingSource, id: docRef.id, uri: downloadURL, status: 'ready', createdAt: new Date().toISOString() } as KnowledgeSource;
};


export const deleteKnowledgeSource = async (sourceId: string): Promise<void> => {
    await db.collection(KNOWLEDGE_COLLECTION).doc(sourceId).delete();
    // Note: Deleting the file from Storage would require a backend function for security.
};


/**
 * Simulates a RAG search against the knowledge base.
 * In a real scenario, this would involve embedding and vector search.
 * Here, we just do a simple keyword match on the title against the live data.
 */
export const searchKnowledgeBase = async (queryText: string): Promise<string> => {
    const allSources = await listKnowledgeSources(); // Search against live data
    const queryWords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    if (queryWords.length === 0) return "";
    
    const relevantSources = allSources.filter(source => {
        const titleLower = source.title.toLowerCase();
        const uriLower = source.uri.toLowerCase();
        return queryWords.some(word => titleLower.includes(word) || uriLower.includes(word));
    });

    if (relevantSources.length > 0) {
        // Return context from the most relevant source found
        const context = `Basandoti sul documento "${relevantSources[0].title}", rispondi alla richiesta dell'utente.`;
        console.log("BACKEND: Found knowledge context:", context);
        return context;
    }
    
    console.log("BACKEND: No relevant knowledge context found.");
    return "";
};
