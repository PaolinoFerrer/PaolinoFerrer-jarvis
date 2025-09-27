
import { sendChatMessage } from './geminiService.ts';
import { Report } from '../types.ts';

/**
 * In un'applicazione reale, questa sarebbe una chiamata HTTP al nostro backend.
 * Per ora, è un wrapper attorno al servizio Gemini per simulare il cambiamento architetturale.
 * Questo è il punto di ingresso per tutte le interazioni con l'AI da ora in poi.
 */
export async function askJarvis(
    message: string,
    image?: { mimeType: string; data: string }
): Promise<{ 
    conversationalResponse: string; 
    report: Report;
    sources?: { uri: string; title: string }[];
    suggestedSources?: { uri: string; title: string }[]; // Per la Fase 2
}> {
    console.log("Chiamata a jarvisApi.askJarvis. In futuro, questo contatterà il backend RAG.");
    
    // Simuliamo la chiamata al backend che, per ora, chiama semplicemente Gemini.
    const geminiResponse = await sendChatMessage(message, image);
    
    // In futuro, il backend restituirà anche le fonti suggerite.
    // Per ora, restituiamo un array vuoto per mantenere la coerenza del tipo di dati.
    return {
        ...geminiResponse,
        suggestedSources: [] 
    };
}

/**
 * In futuro, questa funzione caricherà i file sul backend per l'elaborazione
 * e l'inserimento nel database vettoriale.
 * @param files L'elenco dei file selezionati dall'utente.
 */
export async function uploadKnowledgeDocuments(files: FileList): Promise<void> {
    console.log("Invio dei file al backend della base di conoscenza:", files);
    
    // Qui, in una vera applicazione, useremmo fetch() per inviare i file al server
    // con una richiesta POST di tipo multipart/form-data.
    /* Esempio futuro:
    const formData = new FormData();
    for (const file of files) {
        formData.append('documents', file);
    }
    const response = await fetch('https://IL-TUO-BACKEND-JARVIS.run.app/api/knowledge', {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        throw new Error("Errore durante il caricamento dei documenti.");
    }
    */
   
   // Per ora, mostriamo solo un avviso di successo per simulare l'operazione.
   alert(`(Simulazione) ${files.length} file(s) sono stati inviati al backend per l'elaborazione. Saranno disponibili per Jarvis a breve.`);
}
