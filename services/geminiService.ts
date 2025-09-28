import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Report, KnowledgeSource, Finding } from '../types';

// The instructions state: The API key must be obtained exclusively from the environment variable process.env.API_KEY
// I am assuming the build process defines `process.env.API_KEY`.
const apiKey = process.env.API_KEY;

if (!apiKey) {
  // Using a more prominent error message for developers if the key is missing.
  console.error("ERRORE CRITICO: La variabile d'ambiente API_KEY non è stata impostata. Le chiamate all'API falliranno.");
}

// Initialize without a placeholder. The SDK will receive undefined if the key is not set.
// API calls will be guarded to prevent errors if the key is missing.
const ai = new GoogleGenAI({ apiKey: apiKey });

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

const systemInstruction = `Sei Jarvis, un assistente IA specializzato nella valutazione della sicurezza sul lavoro in Italia (D.Lgs. 81/08). Il tuo obiettivo è aiutare un tecnico a redigere un Documento di Valutazione dei Rischi (DVR).

**COMPITO PRINCIPALE: ANALISI PROATTIVA DEI RISCHI**
Quando un utente descrive una situazione, un luogo o una mansione, il tuo compito non è solo registrare i pericoli menzionati, ma **identificare in modo proattivo tutti i rischi plausibili e immaginabili associati a quel contesto**. Per ogni rischio che identifichi, devi creare un "finding" separato nel report.

**VALUTAZIONE QUANTITATIVA DEI FATTORI DI RISCHIO**
Per ogni "finding", devi valutare tre fattori basandoti sulle scale sottostanti e restituire i loro valori numerici nel JSON. NON inventare un punteggio di rischio finale; il calcolo avverrà esternamente.

1.  **Danno (damage) - Gravità del potenziale infortunio:**
    *   1 (Lieve): Infortunio leggero, guaribile in pochi giorni (es. graffio).
    *   2 (Medio): Infortunio con prognosi e necessità di cure mediche.
    *   3 (Grave): Infortunio serio con invalidità permanente parziale.
    *   4 (Gravissimo): Infortunio mortale o con invalidità totale.

2.  **Probabilità (probability) - Probabilità che l'evento accada:**
    *   1 (Improbabile): Evento quasi impossibile da verificarsi.
    *   2 (Poco Probabile): Potrebbe accadere, ma solo in circostanze sfortunate.
    *   3 (Probabile): È prevedibile che accada durante il ciclo di vita lavorativo.
    *   4 (Molto Probabile): È quasi certo che accada.

3.  **Frequenza di Esposizione (exposure) - Frequenza con cui si è esposti al pericolo:**
    *   1 (Rara): L'esposizione al rischio avviene meno di una volta al mese.
    *   2 (Occasionale): L'esposizione avviene settimanalmente.
    *   3 (Frequente): L'esposizione avviene quotidianamente.
    *   4 (Continua): L'esposizione è costante durante il turno di lavoro.

**REGOLA CRITICA: GESTIONE DELL'AMBIGUITÀ**
Se le informazioni fornite dall'utente sono insufficienti o ambigue per assegnare con sicurezza i valori di Danno, Probabilità o Frequenza, **NON DEVI INVENTARE I VALORI**. In questo caso, il tuo "reportUpdate" deve essere un oggetto vuoto o contenere solo i rilievi non ambigui. La tua "chatResponse" DEVE contenere una domanda specifica per ottenere i dettagli mancanti. Esempio: "Per valutare il rischio, potresti specificare con che frequenza gli operatori accedono a quell'area?".

**FORMATO DELLA RISPOSTA**
Puoi ricevere un contesto dalla 'Base di Conoscenza'. DEVI dare priorità a questo contesto.
La tua risposta DEVE SEMPRE essere un oggetto JSON con TRE chiavi: "reportUpdate", "chatResponse", and "citations".

1.  "reportUpdate": Un oggetto conforme allo schema JSON, contenente i rilievi (findings) che hai identificato con certezza.
2.  "chatResponse": Una stringa di risposta conversazionale in italiano. Può essere una conferma o una domanda di chiarimento.
3.  "citations": Un array di 'id' dei documenti usati dalla 'Base di Conoscenza'. Se nessuno, array vuoto.

**ESEMPIO DI ANALISI PROATTIVA**
Utente: "Analizziamo il magazzino dove lavora un carrellista."
Tua analisi: Identifichi non solo il rischio menzionato ma anche altri.
- Rischio 1: Pavimentazione sconnessa (menzionato implicitamente o esplicitamente).
- Rischio 2: Interferenza con personale a piedi nelle corsie.
- Rischio 3: Scarsa illuminazione in alcune aree.
- Rischio 4: Stabilità del carico durante il sollevamento.
Per ognuno di questi 4 rischi, crei un "finding" completo nel JSON.

Se l'utente fa una domanda generale, usa lo strumento googleSearch per trovare informazioni, riassumile in 'chatResponse' e includi le fonti. Non aggiornare il report in questo caso, a meno che la domanda non sia chiaramente un rilievo.
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


// New risk calculation logic gives exponential weight to Damage.
// Formula: D^2 * P * E
const calculateRawRisk = (finding: Finding): number => {
    // Ensure factors are valid numbers, default to 1 if not.
    const d = finding.damage > 0 ? finding.damage : 1;
    const p = finding.probability > 0 ? finding.probability : 1;
    const e = finding.exposure > 0 ? finding.exposure : 1;
    
    // Using D^2 gives much higher weight to the severity of the outcome.
    return (d * d) * p * e;
};

// Re-calibrated mapping function for the new risk scale (1-256)
const mapRawRiskToLevel = (rawRisk: number): number => {
    // HIGH RISK (ALTO): R > 70. Maps 71-256 to 8-10. Catastrophic potential (D=4) with non-minimal P/E, 
    // or serious potential (D=3) with high P/E will land here.
    if (rawRisk > 70) {
        return 8 + Math.round(((rawRisk - 71) / (256 - 71)) * 2);
    }
    // MEDIUM RISK (MEDIO): 15 < R <= 70. Maps 16-70 to 5-7. A D=4 event even with P=1, E=1 (raw risk 16)
    // now correctly falls into Medium risk.
    if (rawRisk > 15) { 
        return 5 + Math.round(((rawRisk - 16) / (70 - 16)) * 2);
    }
    // LOW RISK (BASSO): R <= 15. Maps 1-15 to 1-4.
    return 1 + Math.round(((rawRisk - 1) / (15 - 1)) * 3);
};

export const generateResponse = async (
  currentReport: Report,
  prompt: string,
  file?: File,
  knowledgeContext?: KnowledgeSource[]
): Promise<GeminiResponse> => {
    // Fail fast with a user-friendly message if the API key is not configured.
    if (!apiKey) {
        return {
            reportUpdate: currentReport,
            chatResponse: "Errore di configurazione: la chiave API per i servizi IA non è stata impostata. Contatta l'amministratore del sistema.",
        };
    }

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
            // Provide a user-friendly message for specific, known errors like invalid API keys.
            if (text.includes("API_KEY_INVALID") || text.includes("API key not valid")) {
                 return {
                    reportUpdate: currentReport,
                    chatResponse: "Si è verificato un errore di autenticazione. La chiave API fornita non è valida. Contatta l'amministratore del sistema.",
                };
            }
            // Provide a better generic message for other parsing failures.
            return {
                reportUpdate: currentReport,
                chatResponse: "Mi scuso, ma ho ricevuto una risposta in un formato imprevisto e non sono riuscito a elaborarla. Potresti riformulare la tua richiesta?",
            };
        }
        
        const reportUpdateFromGemini: Report = parsedResponse.reportUpdate?.workplaces ?? currentReport;
        
        // **RISK CALCULATION LOGIC**
        // Iterate through the report and calculate the riskLevel for each finding using the new logic
        const calculatedReport = reportUpdateFromGemini.map(workplace => ({
            ...workplace,
            tasks: workplace.tasks.map(task => ({
                ...task,
                findings: task.findings.map(finding => {
                    const rawRisk = calculateRawRisk(finding);
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
        const errorString = String(error);
        // Handle API key errors specifically in the case of a thrown error.
        if (errorString.includes("API_KEY_INVALID") || errorString.includes("API key not valid")) {
            return {
                reportUpdate: currentReport,
                chatResponse: "Si è verificato un errore di autenticazione. La chiave API fornita non è valida. Contatta l'amministratore del sistema.",
            };
        }
        return {
            reportUpdate: currentReport,
            chatResponse: "Si è verificato un errore di connessione con l'IA. Riprova tra poco.",
        };
    }
};

export const findWebSources = async (topic: string): Promise<{ title: string; uri: string }[]> => {
    // Fail fast with a user-friendly message if the API key is not configured.
    if (!apiKey) {
      console.error("findWebSources chiamato senza API_KEY. L'operazione è stata interrotta.");
      throw new Error("Errore di configurazione: la chiave API per i servizi IA non è stata impostata.");
    }

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
        const errorString = String(error);
        if (errorString.includes("API_KEY_INVALID") || errorString.includes("API key not valid")) {
            throw new Error("La chiave API non è valida o non è stata configurata correttamente.");
        }
        throw new Error("Impossibile recuperare le fonti web a causa di un errore.");
    }
};