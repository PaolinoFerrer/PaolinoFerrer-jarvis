// Fix: This file was empty. Implemented the geminiService to handle interactions with the @google/genai API.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Report } from '../types';

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

const systemInstruction = `You are Jarvis, an AI assistant specializing in workplace safety assessment in Italy, conforming to D.Lgs. 81/08.
Your primary function is to help a safety technician identify and document risks.
When the user describes a situation, a task, or a workplace, you must analyze it and update a comprehensive safety report.
You MUST ALWAYS respond with a JSON object that contains two keys: "reportUpdate" and "chatResponse".

1.  "reportUpdate": This key will contain an object structured according to the provided JSON schema. This object should represent the *complete, updated state* of the safety report based on the user's latest input. Do not just send a fragment; send the whole report structure. If the user's input doesn't contain enough information to create a valid finding, return the existing report structure or an empty one if it's the first turn. Generate unique IDs for new items (e.g., 'workplace-168...').

2.  "chatResponse": This key will contain a concise, friendly, and professional string in Italian. This is your conversational reply to the user. You should confirm that you've processed their input, ask for clarifications if needed, or prompt them for the next piece of information.

Example for the user describing a forklift driver in a warehouse with an uneven floor:
The user says: "Nel magazzino il carrellista deve fare attenzione perché la pavimentazione è rovinata"
Your JSON response should be:
{
  "reportUpdate": {
    "workplaces": [
      {
        "id": "workplace-1689341829",
        "name": "Magazzino",
        "tasks": [
          {
            "id": "task-1689341855",
            "name": "Carrellista",
            "findings": [
              {
                "id": "finding-1689341870",
                "description": "La pavimentazione del magazzino presenta sconnessioni e rotture.",
                "hazard": "Rischio di inciampo per il personale, instabilità e potenziale ribaltamento del carrello elevatore.",
                "riskLevel": 6,
                "regulation": "D.Lgs. 81/08, Allegato IV",
                "recommendation": "Effettuare un'immediata manutenzione e ripristino della pavimentazione per eliminare le sconnessioni.",
              }
            ],
            "requiredDpi": [
              { "name": "Scarpe antinfortunistiche" }
            ]
          }
        ]
      }
    ]
  },
  "chatResponse": "Rilievo registrato per il magazzino. La pavimentazione sconnessa è un rischio significativo. C'è altro da aggiungere per la mansione di carrellista o passiamo a un'altra area?"
}

If the user asks a general question, use the googleSearch tool to find relevant information, summarize it in the 'chatResponse' and include the sources. Do not update the report in this case unless the query is clearly a finding.
`;

export interface GeminiResponse {
  reportUpdate: Report;
  chatResponse: string;
  sources?: { uri: string; title: string }[];
}

export const generateResponse = async (
  currentReport: Report,
  prompt: string,
  file?: File
): Promise<GeminiResponse> => {
    
    const fullPrompt = `Based on the current report state provided below, please process my request.\n\nCurrent Report State:\n${JSON.stringify(currentReport, null, 2)}\n\nUser Request:\n${prompt}`;
    const textPart = { text: fullPrompt };
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
                        chatResponse: { type: Type.STRING }
                    },
                    required: ["reportUpdate", "chatResponse"]
                },
            },
        });

        const text = response.text.trim();
        let parsedResponse: any;
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

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            uri: chunk.web?.uri,
            title: chunk.web?.title,
        })).filter((source: any) => source.uri && source.title) ?? [];
        
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
        return [];
    }
};