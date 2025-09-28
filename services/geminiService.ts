// Fix: This file was empty. Implemented the geminiService to handle interactions with the @google/genai API.
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Report, KnowledgeSource, Finding } from '../types';

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
                                            damage: { type: Type.NUMBER, description: "Severity of Damage (1-4)." },
                                            probability: { type: Type.NUMBER, description: "Likelihood of Occurrence (1-4)." },
                                            exposure: { type: Type.NUMBER, description: "Frequency of Exposure (1-4)." },
                                            regulation: { type: Type.STRING, description: "Reference to the relevant safety regulation (e.g., 'D.Lgs. 81/08')." },
                                            recommendation: { type: Type.STRING, description: "Suggested action to mitigate the risk." },
                                        },
                                        required: ["id", "description", "hazard", "damage", "probability", "exposure", "regulation", "recommendation"]
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

When a user describes a hazard, your task is to evaluate three factors based on the scales below and return their numeric values in the JSON. DO NOT invent a final risk score.

RISK CALCULATION FACTORS:
Your response for each finding MUST include integer values (1-4) for "damage", "probability", and "exposure".

1.  **Danno (damage) - Severity of potential harm:**
    *   1 (Lieve): Minor injury, quick recovery (e.g., scratch).
    *   2 (Medio): Injury requiring medical attention.
    *   3 (Grave): Serious injury with partial permanent disability.
    *   4 (Gravissimo): Fatal or total disability injury.

2.  **Probabilità (probability) - Likelihood of occurrence:**
    *   1 (Improbabile): Almost impossible.
    *   2 (Poco Probabile): Could happen, but unlikely.
    *   3 (Probabile): Foreseeable during the work lifecycle.
    *   4 (Molto Probabile): Almost certain to happen.

3.  **Esposizione (exposure) - Frequency of exposure to the hazard:**
    *   1 (Rara): Less than once a month.
    *   2 (Occasionale): Weekly exposure.
    *   3 (Frequente): Daily exposure.
    *   4 (Continua): Constant exposure during the shift.

You may be provided with a 'Knowledge Base Context' section. You MUST prioritize this context when answering.

You MUST ALWAYS respond with a JSON object that contains THREE keys: "reportUpdate", "chatResponse", and "citations".

1.  "reportUpdate": An object structured according to the provided JSON schema. For each finding, you must provide the 'damage', 'probability', and 'exposure' values.
2.  "chatResponse": A concise, friendly, and professional string in Italian. This is your conversational reply.
3.  "citations": An array of 'id's of any documents from the 'Knowledge Base Context' that you used. If none, return an empty array.

Example for the user saying: "Nel magazzino il carrellista deve fare attenzione perché la pavimentazione è molto rovinata e ci passano continuamente"
Your JSON response should be:
{
  "reportUpdate": {
    "workplaces": [
      {
        "id": "workplace-1",
        "name": "Magazzino",
        "tasks": [
          {
            "id": "task-1",
            "name": "Carrellista",
            "findings": [
              {
                "id": "finding-1",
                "description": "La pavimentazione del magazzino presenta buche e dislivelli nell'area di transito dei carrelli elevatori.",
                "hazard": "Rischio di ribaltamento del carrello elevatore",
                "damage": 3,
                "probability": 3,
                "exposure": 4,
                "regulation": "D.Lgs. 81/08, Allegato IV",
                "recommendation": "Ripristinare immediatamente la pavimentazione per garantire una superficie liscia e sicura."
              }
            ],
            "requiredDpi": []
          }
        ]
      }
    ]
  },
  "chatResponse": "Rilievo registrato. La pavimentazione sconnessa è un rischio significativo. Data l'esposizione continua, ho assegnato una priorità alta. C'è altro?",
  "citations": []
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

// Maps raw risk score (1-64) to a 1-10 scale
const mapRawRiskToLevel = (rawRisk: number): number => {
    if (rawRisk > 27) { // High Risk (maps 28-64 to 8-10)
        return 8 + Math.round(((rawRisk - 28) / (64 - 28)) * 2);
    }
    if (rawRisk > 9) { // Medium Risk (maps 10-27 to 5-7)
        return 5 + Math.round(((rawRisk - 10) / (27 - 10)) * 2);
    }
    // Low Risk (maps 1-9 to 1-4)
    return 1 + Math.round(((rawRisk - 1) / (9 - 1)) * 3);
};

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
        
        const reportUpdateFromGemini: Report = parsedResponse.reportUpdate?.workplaces ?? currentReport;
        
        // **RISK CALCULATION LOGIC**
        // Iterate through the report and calculate the riskLevel for each finding
        const calculatedReport = reportUpdateFromGemini.map(workplace => ({
            ...workplace,
            tasks: workplace.tasks.map(task => ({
                ...task,
                findings: task.findings.map(finding => {
                    // Ensure factors are valid numbers, default to 1 if not.
                    const d = finding.damage > 0 ? finding.damage : 1;
                    const p = finding.probability > 0 ? finding.probability : 1;
                    const e = finding.exposure > 0 ? finding.exposure : 1;
                    
                    const rawRisk = d * p * e;
                    const calculatedLevel = mapRawRiskToLevel(rawRisk);
                    
                    return { ...finding, riskLevel: calculatedLevel };
                })
            }))
        }));


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
            reportUpdate: calculatedReport,
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