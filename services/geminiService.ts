import { GoogleGenAI, Chat, Type, Part, GenerateContentResponse } from "@google/genai";
import { Report } from '../types.ts';

let ai: GoogleGenAI;
const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("La chiave API di Gemini non è configurata. L'applicazione non può funzionare.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

const systemInstruction = `Sei "Jarvis", un assistente AI specializzato in sicurezza sul lavoro, basato su D.Lgs. 81/08 e normative correlate. Il tuo compito è assistere un professionista durante un sopralluogo, compilando un Documento di Valutazione dei Rischi (DVR) in tempo reale.

Le tue responsabilità sono:
1.  **Mantenere il Contesto**: Ricorda sempre l'area, il macchinario o la mansione corrente. Se l'utente dice "Iniziamo il sopralluogo in...", crea una nuova sezione nel report con quel titolo. Se dice "passiamo a...", crea un'altra nuova sezione.
2.  **Analizzare i Rilievi**: Quando l'utente descrive un problema, analizza il testo e qualsiasi immagine fornita.
3.  **Usare la Ricerca Web**: Per normative specifiche, recenti o tecniche (es. Accordi Stato-Regioni 2024/2025, norme UNI/CEI, normative antincendio), DEVI utilizzare la ricerca web per fornire le informazioni più aggiornate e precise.
4.  **Rispondere in JSON**: La tua risposta DEVE SEMPRE contenere un blocco di codice JSON valido, marcato con \`\`\`json ... \`\`\`. Questo blocco JSON è l'unica cosa che devi restituire.
5.  **Struttura JSON**: Il JSON deve avere la seguente struttura: \`{ "conversationalResponse": "Una breve risposta testuale per l'utente", "report": [...] }\`. Il campo "report" deve contenere l'array completo e aggiornato di tutte le sezioni del sopralluogo.
6.  **Struttura Dati per Rilievo**: Per ogni rilievo, devi estrarre o dedurre:
    -   \`id\`: Un ID univoco (es. timestamp).
    -   \`description\`: La descrizione del rilievo.
    -   \`hazard\`: Il pericolo specifico (es. "Contatto elettrico diretto").
    -   \`riskLevel\`: Una stima del rischio da 1 a 10.
    -   \`regulation\`: La normativa di riferimento (es. "D.Lgs. 81/08, Titolo III"). Se usi la ricerca, cita la fonte.
    -   \`recommendation\`: Un'azione correttiva suggerita.
    -   \`photoAnalysis\`: Se viene fornita un'immagine, descrivi brevemente ciò che è rilevante per il rischio.

Inizia la conversazione salutando e chiedendo di iniziare. Mantieni un tono professionale e di supporto.`;

// The schema is now for documentation, the model will follow the instruction in the prompt.
const reportSchema = {
    type: Type.OBJECT,
    properties: {
        conversationalResponse: {
            type: Type.STRING,
            description: "Una breve risposta conversazionale in italiano per l'utente (massimo 2 frasi)."
        },
        report: {
            type: Type.ARRAY,
            description: "L'intero documento di valutazione del rischio aggiornato.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Il titolo della sezione (es. Ufficio Amministrativo)." },
                    findings: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                description: { type: Type.STRING },
                                hazard: { type: Type.STRING },
                                riskLevel: { type: Type.INTEGER },
                                regulation: { type: Type.STRING },
                                recommendation: { type: Type.STRING },
                                photo: {
                                    type: Type.OBJECT,
                                    properties: {
                                        analysis: { type: Type.STRING }
                                    },
                                    nullable: true,
                                }
                            },
                             required: ["id", "description", "hazard", "riskLevel", "regulation", "recommendation"]
                        }
                    }
                },
                required: ["title", "findings"]
            }
        }
    },
    required: ["conversationalResponse", "report"]
};

let chat: Chat;

export function startChat() {
    const currentAi = getAi();
    chat = currentAi.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            // FIX: Removed responseMimeType and responseSchema as they are unsupported with tools.
            tools: [{googleSearch: {}}], // Enable Google Search
        },
    });
}

export async function sendChatMessage(
    message: string,
    image?: { mimeType: string; data: string }
): Promise<{ 
    conversationalResponse: string; 
    report: Report;
    sources?: { uri: string; title: string }[];
}> {
    if (!chat) {
        startChat();
    }
    
    const parts: Part[] = [];
    if (image) {
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            },
        });
    }
    parts.push({ text: message });

    const response: GenerateContentResponse = await chat.sendMessage({ message: parts });
    
    try {
        const rawText = response.text.trim();
        
        // Find the JSON block within the response text
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
        
        let jsonToParse: string;
        if (jsonMatch && jsonMatch[1]) {
            jsonToParse = jsonMatch[1];
        } else if (rawText.startsWith('{') && rawText.endsWith('}')) {
            // Fallback for when the model returns raw JSON without the markdown block
            jsonToParse = rawText;
        }
        else {
            console.error("No valid JSON block found in response:", rawText);
            throw new Error("La risposta dell'AI non contiene un blocco JSON valido e formattato correttamente.");
        }

        const parsed = JSON.parse(jsonToParse);
        if (!parsed.report || !parsed.conversationalResponse) {
            throw new Error("Il JSON ricevuto dall'AI non ha la struttura richiesta (manca 'report' o 'conversationalResponse').");
        }
        
        // Extract grounding sources if available
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
             const sources = groundingMetadata.groundingChunks
                .filter(chunk => chunk.web)
                .map(chunk => ({
                    uri: chunk.web.uri,
                    title: chunk.web.title,
                }));
             parsed.sources = sources;
        }

        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", response.text, e);
        throw new Error("La risposta dell'AI non è in un formato JSON valido o la sua struttura è inaspettata.");
    }
}