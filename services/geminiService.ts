// Fix: This file was empty. Implementing Gemini API service calls as per application requirements.
import { GoogleGenAI, Type } from "@google/genai";
import { Report } from '../types';

// Helper function to convert File to a Gemini-compatible format
const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

// According to guidelines, the API key must come from process.env.API_KEY.
// This is unusual for a client-side Vite app, but we will follow the instructions.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});


// Schema for the structured response we expect from the model for report updates
const reportUpdateSchema = {
    type: Type.OBJECT,
    properties: {
        chatResponse: {
            type: Type.STRING,
            description: "A friendly and helpful response to the user in Italian. Explain the findings and the updated report."
        },
        updatedReport: {
            type: Type.ARRAY,
            description: "The complete, updated JSON structure of the entire safety report. It must be a valid JSON array of 'Workplace' objects.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    tasks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                name: { type: Type.STRING },
                                findings: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            hazard: { type: Type.STRING },
                                            damage: { type: Type.NUMBER, description: "Magnitude of damage (1-4)" },
                                            probability: { type: Type.NUMBER, description: "Probability of occurrence (1-4)" },
                                            exposure: { type: Type.NUMBER, description: "Frequency of exposure (1-4)" },
                                            riskLevel: { type: Type.NUMBER, description: "Calculated risk level (D*P*E, mapped to 1-10)" },
                                            regulation: { type: Type.STRING, description: "Reference regulation (e.g., 'D.Lgs. 81/08')" },
                                            recommendation: { type: Type.STRING, description: "Suggested corrective action." },
                                            photo: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    analysis: { type: Type.STRING, description: "Brief analysis of the photo if one was attached." },
                                                },
                                                nullable: true,
                                            },
                                        },
                                        required: ["id", "description", "hazard", "damage", "probability", "exposure", "riskLevel", "regulation", "recommendation"]
                                    }
                                },
                                requiredDpi: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            notes: { type: Type.STRING, nullable: true }
                                        },
                                        required: ["name"]
                                    }
                                },
                            },
                            required: ["id", "name", "findings", "requiredDpi"]
                        }
                    },
                },
                required: ["id", "name", "tasks"]
            }
        },
    },
    required: ["chatResponse", "updatedReport"]
};


export const generateResponse = async (
    currentReport: Report,
    prompt: string,
    file?: File,
    knowledgeContext?: string
): Promise<{ chatResponse: string; reportUpdate: Report; sources?: { uri: string, title: string }[] }> => {

    const modelToUse = 'gemini-2.5-flash';

    const systemInstruction = `Sei Jarvis, un assistente AI esperto in sicurezza sul lavoro (HSE) in Italia.
Il tuo compito è aiutare gli utenti a compilare un Documento di Valutazione dei Rischi (DVR).
Analizza il testo e le eventuali immagini fornite dall'utente.
Identifica luoghi di lavoro, mansioni, pericoli, e stima il livello di rischio.
Calcola il livello di rischio come Danno * Probabilità * Esposizione (ognuno da 1 a 4), poi mappa il risultato su una scala da 1 a 10.
Fornisci raccomandazioni e riferimenti normativi (es. D.Lgs. 81/08).
Rispondi sempre in italiano.
Aggiorna la struttura JSON del report in base alla richiesta dell'utente. Se l'utente descrive un nuovo rischio, aggiungilo come un nuovo "finding". Se descrive una nuova mansione, crea una nuova "task". Genera sempre ID univoci (es. 'finding-1715020963888').
Se l'utente fa una domanda generica, rispondi cordialmente senza modificare il report (restituendo l'oggetto 'updatedReport' identico a quello ricevuto).
Se vengono forniti "Contesti dalla Knowledge Base", basa la tua risposta su di essi e includi i link alle fonti.
La tua risposta DEVE essere un oggetto JSON che rispetta lo schema fornito. Non includere mai \`\`\`json o \`\`\`.`;
    
    const requestParts: any[] = [
        { text: `Ecco il report attuale in formato JSON:\n${JSON.stringify(currentReport)}` },
        { text: `Ecco la richiesta dell'utente:\n${prompt}` }
    ];

    if (knowledgeContext) {
        requestParts.unshift({ text: `Contesto dalla Knowledge Base (usalo per formulare la tua risposta):\n${knowledgeContext}` });
    }

    if (file) {
        const imagePart = await fileToGenerativePart(file);
        requestParts.push(imagePart);
    }
    
    try {
        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: { parts: requestParts },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: reportUpdateSchema,
            }
        });

        // The response.text is a stringified JSON.
        const text = response.text;
        const parsedJson = JSON.parse(text);

        const reportUpdate: Report = parsedJson.updatedReport || currentReport;
        const chatResponse: string = parsedJson.chatResponse || "Non sono riuscito a elaborare la richiesta.";

        // Extract sources from grounding metadata if available (for RAG)
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        let sources: { uri: string, title: string }[] = [];
        if (groundingMetadata?.groundingChunks) {
            sources = groundingMetadata.groundingChunks
              .filter(chunk => chunk.web && chunk.web.uri)
              .map(chunk => ({
                title: chunk.web!.title || new URL(chunk.web!.uri!).hostname,
                uri: chunk.web!.uri!,
              }));
            sources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
        }

        return {
            chatResponse,
            reportUpdate,
            sources: sources.length > 0 ? sources : undefined,
        };
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            chatResponse: "Oops! Qualcosa è andato storto durante la comunicazione con l'IA. Riprova.",
            reportUpdate: currentReport,
        };
    }
};

export const findWebSources = async (topic: string): Promise<{ title: string; uri: string }[]> => {
    const modelToUse = 'gemini-2.5-flash';
    const prompt = `Riassumi le normative e le buone pratiche principali in Italia riguardo a questo argomento di sicurezza sul lavoro: "${topic}". Basa la tua risposta sulle informazioni più recenti trovate tramite ricerca web.`;

    try {
        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        // As per guidelines, extract URLs from groundingChunks
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
            const sources = groundingMetadata.groundingChunks
              .filter(chunk => chunk.web && chunk.web.uri)
              .map(chunk => ({
                title: chunk.web!.title || new URL(chunk.web!.uri!).hostname,
                uri: chunk.web!.uri!,
              }));
              
            const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
            return uniqueSources.slice(0, 5); // Return top 5
        }

        console.warn("Nessuna fonte trovata nei metadati di grounding.");
        return [];

    } catch (error) {
        console.error("Errore nella ricerca di fonti web con Gemini:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            throw new Error("La chiave API di Gemini non è valida o non è stata configurata. Contatta l'amministratore.");
        }
        throw new Error("Si è verificato un errore imprevisto durante la ricerca di fonti.");
    }
};
