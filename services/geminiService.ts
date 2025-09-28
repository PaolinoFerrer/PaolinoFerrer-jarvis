// Fix: This file was empty. Implemented the geminiService to handle interactions with the @google/genai API.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Report, KnowledgeSource } from '../types';

// The instructions state: The API key must be obtained exclusively from the environment variable process.env.API_KEY
// I am assuming the build process defines `process.env.API_KEY`.
const apiKey = process.env.API_KEY;

if (!apiKey) {
  // In a real app, this should be handled more gracefully, but for this exercise,
  // we follow the instructions that the key is pre-configured and available.
  // Using a placeholder for development if the key isn't set, and logging a warning.
  console.warn("API_KEY not found in environment variables. Using a placeholder. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "placeholder-api-key" });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const reportSchema = {
    type: Type.OBJECT,
    properties: {
        workplaces: {
            type: Type.ARRAY,
            description: "List of workplaces analyzed.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "Unique identifier for the workplace (e.g., 'workplace-123')." },
                    name: { type: Type.STRING, description: "Name of the workplace (e.g., 'Magazzino')." },
                    tasks: {
                        type: Type.ARRAY,
                        description: "List of tasks performed in the workplace.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: "Unique identifier for the task (e.g., 'task-456')." },
                                name: { type: Type.STRING, description: "Name of the task (e.g., 'Carrellista')." },
                                findings: {
                                    type: Type.ARRAY,
                                    description: "List of safety findings related to the task.",
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            id: { type: Type.STRING, description: "Unique identifier for the finding (e.g., 'finding-789')." },
                                            description: { type: Type.STRING, description: "Detailed description of the observation." },
                                            hazard: { type: Type.STRING, description: "The identified hazard." },
                                            riskLevel: { type: Type.NUMBER, description: "Risk level from 1 (low) to 10 (high)." },
                                            regulation: { type: Type.STRING, description: "Reference to the relevant safety regulation (e.g., 'D.Lgs. 81/08')." },
                                            recommendation: { type: Type.STRING, description: "Suggested action to mitigate the risk." },
                                        },
                                        required: ["id", "description", "hazard", "riskLevel", "regulation", "recommendation"]
                                    }
                                },
                                requiredDpi: {
                                    type: Type.ARRAY,
                                    description: "List of required Personal Protective Equipment (DPI).",
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING, description: "Name of the DPI." },
                                            notes: { type: Type.STRING, description: "Optional notes about the DPI." },
                                        },
                                        required: ["name"]
                                    }
                                }
                            },
                             required: ["id", "name", "findings", "requiredDpi"]
                        }
                    }
                },
                required: ["id", "name", "tasks"]
            }
        }
    },
    required: ["workplaces"]
};

const systemInstruction = `You are Jarvis, an AI assistant specializing in workplace safety assessment in Italy, conforming to D.Lgs. 81/08. Your primary function is to help a safety technician identify and document risks.

Before the user's request, you may be provided with a 'Knowledge Base Context' section containing relevant information from trusted documents. You MUST prioritize this context when answering.

You MUST ALWAYS respond with a JSON object that contains THREE keys: "reportUpdate", "chatResponse", and "citations".

1.  "reportUpdate": An object structured according to the provided JSON schema, representing the *complete, updated state* of the safety report based on the user's latest input. Do not just send a fragment; send the whole report structure. If the input is insufficient for a valid finding, return the existing report. Generate unique IDs for new items.

2.  "chatResponse": A concise, friendly, and professional string in Italian. This is your conversational reply. Confirm you've processed the input or ask for clarifications.

3.  "citations": An array of strings, containing the 'id's of any documents from the 'Knowledge Base Context' that you used to formulate your response. If you didn't use any context, return an empty array.

Example for the user describing a forklift driver in a warehouse with an uneven floor:
The user says: "Nel magazzino il carrellista deve fare attenzione perché la pavimentazione è rovinata"
Your JSON response should be:
{
  "reportUpdate": { /* ... report data ... */ },
  "chatResponse": "Rilievo registrato per il magazzino. La pavimentazione sconnessa è un rischio significativo. C'è altro da aggiungere per la mansione di carrellista o passiamo a un'altra area?",
  "citations": []
}

If you use a provided context about flooring regulations from a document with id 'kb-file-123', your response might be:
{
  "reportUpdate": { /* ... report data with specific regulation from the document ... */ },
  "chatResponse": "Rilievo registrato. Come indicato nel D.Lgs. 81/08, la pavimentazione deve essere priva di protuberanze. Ho aggiunto la raccomandazione di ripristino.",
  "citations": ["kb-file-123"]
}

If the user asks a general question, use the googleSearch tool to find relevant information, summarize it in the 'chatResponse' and include the sources. Do not update the report in this case unless the query is clearly a finding.
`;

export interface GeminiResponse {
  reportUpdate: Report;
  chatResponse: string;
  sources?: { uri: string; title: string }[];
}

interface ParsedGeminiResponse {
    reportUpdate: { workplaces: Report };
    chatResponse: string;
    citations?: string[];
}


export const generateResponse = async (
  currentReport: Report,
  prompt: string,
  file?: File,
  knowledgeContext?: KnowledgeSource[]
): Promise<GeminiResponse> => {

    let augmentedPrompt = `Based on the current report state provided below, please process my request.\n\nCurrent Report State:\n${JSON.stringify(currentReport, null, 2)}`;
    
    if (knowledgeContext && knowledgeContext.length > 0) {
        const contextString = knowledgeContext.map(source => 
            `[Source ID: ${source.id}, Title: ${source.title}, Content URI: ${source.uri}]`
        ).join('\n');
        
        augmentedPrompt = `--- INIZIO CONTESTO BASE DI CONOSCENZA ---\n${contextString}\n--- FINE CONTESTO BASE DI CONOSCENZA ---\n\n${augmentedPrompt}`;
    }

    augmentedPrompt += `\n\nUser Request:\n${prompt}`;
    
    const textPart = { text: augmentedPrompt };
    const parts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [textPart];

    if (file) {
      try {
        const imagePart = await fileToGenerativePart(file);
        parts.push(imagePart);
      } catch (error) {
        console.error("Error processing file:", error);
        return {
          reportUpdate: currentReport,
          chatResponse: "Si è verificato un errore durante l'elaborazione del file allegato. Riprova.",
        };
      }
    }

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: parts },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        reportUpdate: reportSchema,
                        chatResponse: { type: Type.STRING },
                        citations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["reportUpdate", "chatResponse", "citations"]
                },
            },
        });

        const text = response.text.trim();
        let parsedResponse: ParsedGeminiResponse;
        try {
            parsedResponse = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini JSON response:", text);
            return {
                reportUpdate: currentReport,
                chatResponse: text || "Mi scuso, ma non sono riuscito a elaborare correttamente la richiesta. Potresti riformularla?",
            };
        }
        
        const reportUpdate: Report = parsedResponse.reportUpdate?.workplaces ?? currentReport;

        // Handle sources from either RAG or Google Search
        let sources: { uri: string; title: string }[] = [];
        
        // RAG sources (priority)
        if (parsedResponse.citations && parsedResponse.citations.length > 0 && knowledgeContext) {
            sources = parsedResponse.citations
                .map(id => knowledgeContext.find(s => s.id === id))
                .filter((source): source is KnowledgeSource => !!source)
                .map(source => ({ uri: source.uri, title: source.title }));
        }

        // Google Search sources (fallback)
        if (sources.length === 0) {
            const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
            const webSources = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
                uri: chunk.web?.uri,
                title: chunk.web?.title,
            })).filter((source: any) => source.uri && source.title) ?? [];
            if (webSources.length > 0) {
                sources = webSources;
            }
        }
        
        return {
            reportUpdate,
            chatResponse: parsedResponse.chatResponse || "Ecco l'aggiornamento.",
            sources: sources.length > 0 ? sources : undefined,
        };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return {
            reportUpdate: currentReport,
            chatResponse: "Si è verificato un errore di connessione con l'IA. Riprova tra poco.",
        };
    }
};

export const findWebSources = async (topic: string): Promise<{ title: string; uri: string }[]> => {
    const prompt = `Agisci come un ricercatore esperto di sicurezza sul lavoro in Italia. Il mio obiettivo è trovare fonti online autorevoli e pertinenti (siti istituzionali, normativi, associazioni di categoria, riviste specializzate) sull'argomento "${topic}". Restituisci un elenco di massimo 5 risultati. Per ogni risultato, fornisci un titolo chiaro e l'URL completo. La tua risposta DEVE essere solo ed esclusivamente un oggetto JSON contenente una singola chiave "sources", che è un array di oggetti, ognuno con le chiavi "title" e "uri". Non includere testo aggiuntivo, spiegazioni o saluti.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sources: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    uri: { type: Type.STRING }
                                },
                                required: ["title", "uri"]
                            }
                        }
                    },
                    required: ["sources"]
                }
            }
        });
        
        const text = response.text.trim();
        const parsedResponse = JSON.parse(text);
        return parsedResponse.sources || [];

    } catch (error) {
        console.error("Error finding web sources:", error);
        throw new Error("Failed to fetch web sources from Gemini API.");
    }
};