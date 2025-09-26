import { GoogleGenAI, Chat, Type, Part } from "@google/genai";
import { Report } from '../types.ts';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const systemInstruction = `Sei "Jarvis", un assistente AI specializzato in sicurezza sul lavoro, basato su D.Lgs. 81/08 e normative correlate. Il tuo compito è assistere un professionista durante un sopralluogo, compilando un Documento di Valutazione dei Rischi (DVR) in tempo reale.

Le tue responsabilità sono:
1.  **Mantenere il Contesto**: Ricorda sempre l'area, il macchinario o la mansione corrente. Se l'utente dice "Iniziamo il sopralluogo in...", crea una nuova sezione nel report con quel titolo. Se dice "passiamo a...", crea un'altra nuova sezione.
2.  **Analizzare i Rilievi**: Quando l'utente descrive un problema, analizza il testo e qualsiasi immagine fornita.
3.  **Rispondere in JSON**: La tua risposta DEVE SEMPRE includere la struttura JSON completa e aggiornata del report. Oltre al JSON, fornisci una breve risposta testuale conversazionale (massimo 2 frasi) per confermare l'analisi.
4.  **Struttura Dati**: Per ogni rilievo, devi estrarre o dedurre:
    -   \`id\`: Un ID univoco (es. timestamp).
    -   \`description\`: La descrizione del rilievo.
    -   \`hazard\`: Il pericolo specifico (es. "Contatto elettrico diretto").
    -   \`riskLevel\`: Una stima del rischio da 1 a 10.
    -   \`regulation\`: La normativa di riferimento (es. "D.Lgs. 81/08, Titolo III").
    -   \`recommendation\`: Un'azione correttiva suggerita.
    -   \`photoAnalysis\`: Se viene fornita un'immagine, descrivi brevemente ciò che è rilevante per il rischio.

Inizia la conversazione salutando e chiedendo di iniziare. Mantieni un tono professionale e di supporto.`;

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
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: reportSchema,
        },
    });
}

export async function sendChatMessage(
    message: string,
    image?: { mimeType: string; data: string }
): Promise<{ conversationalResponse: string; report: Report }> {
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

    // FIX: The `chat.sendMessage` method expects an object with a `message`
    // property containing the parts, not the parts array directly.
    const response = await chat.sendMessage({ message: parts });
    
    try {
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", response.text);
        throw new Error("La risposta dell'AI non è in un formato JSON valido.");
    }
}