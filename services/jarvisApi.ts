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
    suggestedSources?: { uri: string; title: string }[];
}> {
    console.log("Chiamata a jarvisApi.askJarvis. In futuro, questo contatterà il backend RAG.");
    
    const geminiResponse = await sendChatMessage(message, image);
    
    // FASE 2: Simulazione dell'identificazione di nuove fonti da parte del backend.
    // Se la risposta di Gemini contiene fonti web, ne prendiamo una a caso e la
    // proponiamo come "suggerimento" da aggiungere alla base di conoscenza.
    const suggestedSources: { uri: string; title: string }[] = [];
    if (geminiResponse.sources && geminiResponse.sources.length > 0) {
        // In un sistema reale, qui confronteremmo le fonti con quelle già nel DB.
        // Per la simulazione, ne suggeriamo una a caso.
        const randomSource = geminiResponse.sources[Math.floor(Math.random() * geminiResponse.sources.length)];
        suggestedSources.push(randomSource);
    }

    return {
        ...geminiResponse,
        suggestedSources: suggestedSources, 
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


/**
 * Simula l'aggiunta di una fonte approvata dall'utente alla base di conoscenza.
 * @param source La fonte da aggiungere.
 */
export async function addSourceToKnowledgeBase(source: { uri: string; title: string }): Promise<void> {
    console.log("Aggiunta della fonte alla base di conoscenza:", source);
    
    // In un sistema reale, qui faremmo una chiamata POST al backend con l'URI della fonte.
    // Il backend si occuperebbe di scaricare, processare e indicizzare il contenuto.
    /* Esempio futuro:
    const response = await fetch('https://IL-TUO-BACKEND-JARVIS.run.app/api/knowledge/add-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: source.uri, title: source.title })
    });
    if (!response.ok) {
        throw new Error("Errore durante l'aggiunta della fonte.");
    }
    */
   
   alert(`(Simulazione) La fonte "${source.title}" è stata aggiunta alla base di conoscenza di Jarvis.`);
}