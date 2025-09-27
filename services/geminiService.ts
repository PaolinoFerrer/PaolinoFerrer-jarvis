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
1.  **Struttura del Report Fissa**: Il report che compili DEVE SEMPRE seguire questa struttura con 6 sezioni fisse. NON devi aggiungere, rimuovere o rinominare queste sezioni.
    -   "Area di lavoro"
    -   "Mansione del lavoratore"
    -   "Attrezzature utilizzate"
    -   "Dispositivi di protezione individuale obbligatori" (DPI)
    -   "Formazione specifica obbligatoria"
    -   "Sorveglianza sanitaria obbligatoria"

2.  **Analisi e Popolamento**: Analizza il testo e le immagini fornite dall'utente per estrarre informazioni e rilievi pertinenti. Inserisci ogni informazione nella sezione appropriata del report.
    -   Per "Area di lavoro", "Mansione" e "Attrezzature", crea dei "rilievi" dettagliati.
    -   Per "DPI", "Formazione" e "Sorveglianza", elenca i requisiti obbligatori che deduci dall'analisi.

3.  **Usare la Ricerca Web**: Per normative specifiche, recenti o tecniche (es. Accordi Stato-Regioni, norme UNI/CEI, normative antincendio), DEVI utilizzare la ricerca web per fornire le informazioni più aggiornate e precise, dando priorità a fonti istituzionali (es. gazzettaufficiale.it, ispettorato.gov.it, inail.it).

4.  **Struttura JSON**: Il JSON deve avere la seguente struttura: \`{ "conversationalResponse": "Una breve risposta testuale per l'utente", "report": [...] }\`. Il campo "report" deve contenere l'array completo e aggiornato con TUTTE E 6 le sezioni e i relativi rilievi.

5.  **Struttura Dati per Rilievo**: Per ogni rilievo, specialmente nelle prime tre sezioni, devi estrarre o dedurre:
    -   \`id\`: Un ID univoco (es. timestamp).
    -   \`description\`: La descrizione del rilievo o del requisito.
    -   \`hazard\`: Il pericolo specifico (es. "Contatto elettrico diretto"). Per le sezioni DPI/Formazione/Sorveglianza, puoi usare "Non conformità" o "Requisito".
    -   \`riskLevel\`: Una stima del rischio da 1 a 10. Per i requisiti informativi (DPI, etc.), usa un valore basso (es. 1 o 2).
    -   \`regulation\`: La normativa di riferimento (es. "D.Lgs. 81/08, Titolo III"). Se usi la ricerca, cita la fonte.
    -   \`recommendation\`: Un'azione correttiva o un dettaglio sul requisito.
    -   \`photoAnalysis\`: Se viene fornita un'immagine, descrivi brevemente ciò che è rilevante per il rischio.

6.  **Flusso di Lavoro**: Prima analizzi la richiesta. Poi, se necessario, usi la ricerca web. Infine, DEVI usare TUTTE le informazioni raccolte (input utente e fonti web) per generare il report JSON completo.

7.  **Regola Critica - Formato di Risposta**: La tua risposta DEVE essere ESCLUSIVAMENTE un blocco di codice JSON valido, marcato con \`\`\`json ... \`\`\`. NON devi scrivere NESSUN testo, saluto o commento al di fuori di questo blocco JSON. L'unica parte conversazionale permessa è il valore della chiave "conversationalResponse" all'interno del JSON. Qualsiasi altra risposta sarà considerata un errore.

Inizia la conversazione (attraverso il campo 'conversationalResponse' nel primo JSON) salutando e chiedendo di iniziare. Mantieni un tono professionale e di supporto. Quando l'utente inizia, crea immediatamente la struttura vuota del report con le 6 sezioni e attendi i dettagli.`;


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
    
    let messagePayload: string | Part[];

    if (image) {
        // If there's an image, create a multi-part message
        messagePayload = [
            {
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data,
                },
            },
            { text: message }
        ];
    } else {
        // If it's just text, send the raw string
        messagePayload = message;
    }

    const response: GenerateContentResponse = await chat.sendMessage({ message: messagePayload });
    
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