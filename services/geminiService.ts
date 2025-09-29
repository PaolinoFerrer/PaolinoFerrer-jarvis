import { GoogleGenAI, GenerateContentResponse, Type, Part } from '@google/genai';
import { Report, ChatMessage } from '../types';

// Dichiarato ma non inizializzato per evitare crash all'avvio.
let ai: GoogleGenAI | null = null;

/**
 * Inizializza e restituisce in modo pigro l'istanza del client GoogleGenAI.
 * Questo impedisce all'app di bloccarsi al caricamento se la chiave API non è disponibile.
 */
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        // Il costruttore solleverà un errore se la chiave API non è valida o mancante.
        // Questo errore verrà catturato dal blocco try...catch della funzione chiamante.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


// Helper function to convert a File object to a Gemini Part
const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

// Define the precise JSON schema for the model's output
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        chatResponse: {
            type: Type.STRING,
            description: "A friendly, conversational response in Italian summarizing the changes made to the report. Must be detailed."
        },
        reportUpdate: {
            type: Type.ARRAY,
            description: "The entire updated safety report structure (DVR). MUST include all previous workplaces, tasks, and findings, plus any new ones. Do not omit existing data.",
            items: { // Workplace
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    tasks: {
                        type: Type.ARRAY,
                        items: { // Task
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                name: { type: Type.STRING },
                                requiredDpi: {
                                    type: Type.ARRAY,
                                    items: { // DpiItem
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            notes: { type: Type.STRING, nullable: true }
                                        },
                                        required: ['name']
                                    }
                                },
                                findings: {
                                    type: Type.ARRAY,
                                    items: { // Finding
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            hazard: { type: Type.STRING },
                                            damage: { type: Type.NUMBER, description: "Magnitude of Damage (1-4)" },
                                            probability: { type: Type.NUMBER, description: "Probability of Occurrence (1-4)" },
                                            exposure: { type: Type.NUMBER, description: "Frequency of Exposure (1-4)" },
                                            riskLevel: { type: Type.NUMBER, description: "Calculated risk level (1-10)" },
                                            regulation: { type: Type.STRING, description: "Relevant safety regulation (e.g., D.Lgs. 81/08)" },
                                            recommendation: { type: Type.STRING },
                                            photo: {
                                                type: Type.OBJECT,
                                                nullable: true,
                                                properties: {
                                                    analysis: { type: Type.STRING, description: "Brief analysis of the photo if one was provided." }
                                                },
                                                required: ['analysis']
                                            }
                                        },
                                        required: ['id', 'description', 'hazard', 'damage', 'probability', 'exposure', 'riskLevel', 'regulation', 'recommendation']
                                    }
                                }
                            },
                            required: ['id', 'name', 'requiredDpi', 'findings']
                        }
                    }
                },
                required: ['id', 'name', 'tasks']
            }
        }
    },
    required: ['chatResponse', 'reportUpdate']
};


/**
 * Generates a response from the Gemini API for chat and report generation.
 * This function analyzes user input and updates the safety report.
 */
export const generateResponse = async (
  currentReport: Report,
  text: string,
  file?: File,
  knowledgeContext?: string
): Promise<{ chatResponse: string; reportUpdate: Report, sources?: ChatMessage['sources'] }> => {

    const systemInstruction = `Sei Jarvis, un assistente AI esperto in sicurezza sul lavoro (D.Lgs. 81/08) che aiuta a compilare un Documento di Valutazione del Rischio (DVR).
    Il tuo compito è analizzare la richiesta dell'utente, l'eventuale foto, il contesto della base di conoscenza e lo stato attuale del report (in JSON).
    Devi aggiornare il report JSON aggiungendo o modificando luoghi di lavoro, mansioni o rilievi (findings).
    Quando aggiungi un nuovo elemento, genera un ID univoco (es: 'wp-', 'task-', 'find-' seguito da un timestamp).
    Per ogni rilievo, valuta Danno(1-4), Probabilità(1-4), Esposizione(1-4) e calcola il Rischio(1-10) usando una formula non lineare che dia più peso al danno.
    Devi SEMPRE restituire l'INTERO report aggiornato, non solo le modifiche.
    La tua risposta DEVE essere un oggetto JSON che rispetta lo schema fornito.
    La 'chatResponse' deve essere una sintesi in italiano, colloquiale e chiara delle modifiche apportate al report.`;

    const model = 'gemini-2.5-flash';
    const parts: Part[] = [
        { text: `Contesto dalla base di conoscenza: ${knowledgeContext || 'Nessuno'}` },
        { text: `Stato attuale del Report (DVR) in formato JSON:\n${JSON.stringify(currentReport, null, 2)}`},
        { text: `Richiesta utente: "${text}"`},
    ];

    if (file) {
        try {
            const imagePart = await fileToGenerativePart(file);
            parts.unshift(imagePart); // Add image at the beginning for better analysis
             parts.push({ text: "Analizza attentamente l'immagine fornita per identificare pericoli visibili e usala come base per il nuovo rilievo."});
        } catch (error) {
            console.error("Error processing file:", error);
            return {
                chatResponse: "Si è verificato un errore durante l'elaborazione del file. Riprova.",
                reportUpdate: currentReport
            };
        }
    }
    
    try {
        const client = getAiClient(); // Ottieni il client inizializzato in modo pigro
        const response: GenerateContentResponse = await client.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonResponse = JSON.parse(response.text);

        // Basic validation
        if (!jsonResponse.chatResponse || !jsonResponse.reportUpdate) {
            throw new Error("Invalid JSON structure in response.");
        }
        
        return {
            chatResponse: jsonResponse.chatResponse,
            reportUpdate: jsonResponse.reportUpdate,
            sources: [] // Sources for Gemini responses are not from grounding search in this case
        };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            chatResponse: "Mi dispiace, si è verificato un errore durante la comunicazione con l'intelligenza artificiale. Controlla la console per i dettagli.",
            reportUpdate: currentReport
        };
    }
};

/**
 * Searches for web sources using Gemini with Google Search tool.
 */
export const findWebSources = async (topic: string): Promise<{ title: string; uri: string }[]> => {
    if (!topic || topic.trim().length < 3) {
        return [];
    }
    
    // Simulate an error if the query is too generic (as per old mock, good UX)
    if (topic.toLowerCase().includes('sicurezza') && topic.trim().split(' ').length < 2) {
        throw new Error("La tua ricerca è troppo generica. Prova a specificare una normativa o un rischio (es: 'rischio elettrico cantiere').");
    }

    try {
        const client = getAiClient(); // Ottieni il client inizializzato in modo pigro
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Trova fonti web autorevoli e pertinenti sulla seguente tematica di sicurezza sul lavoro in Italia: "${topic}". Concentrati su fonti istituzionali (INAIL, Ministero del Lavoro, Normattiva) o siti specializzati affidabili.`,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (!groundingChunks) {
            return [];
        }

        const sources = groundingChunks.map(chunk => ({
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || 'Fonte Sconosciuta'
        })).filter(source => source.uri); // Filter out empty URIs
        
        // Deduplicate sources based on URI
        const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
        
        // FIX: The type inference for `uniqueSources` was failing, resulting in `unknown[]`.
        // We cast it to the correct type to resolve the assignment error on the return statement.
        return uniqueSources as { title: string; uri: string }[];

    } catch (error) {
        console.error("Error during web source search:", error);
        throw new Error("Si è verificato un errore durante la ricerca delle fonti. Riprova.");
    }
};