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

const systemInstruction = `Sei "Jarvis", un assistente AI specializzato in sicurezza sul lavoro.

*** OBIETTIVO PRIMARIO E INDEROGABILE ***
Il tuo unico scopo è compilare un Documento di Valutazione dei Rischi (DVR) in formato JSON. Ogni tua risposta DEVE contenere un report JSON popolato. Se l'utente fornisce dettagli su una situazione lavorativa, il campo "report" nel JSON NON DEVE MAI ESSERE VUOTO.

*** STRUTTURA DEL REPORT (FISSA E IMMUTABILE) ***
Il report DEVE contenere ESATTAMENTE queste 6 sezioni, in questo ordine:
1. "Area di lavoro"
2. "Mansione del lavoratore"
3. "Attrezzature utilizzate"
4. "Dispositivi di protezione individuale obbligatori" (DPI)
5. "Formazione specifica obbligatoria"
6. "Sorveglianza sanitaria obbligatoria"

*** FLUSSO DI LAVORO OBBLIGATORIO ***
1.  **ANALIZZA**: Leggi l'input dell'utente e il contesto dalla base di conoscenza. Identifica rischi, attrezzature, mansioni, etc.
2.  **RICERCA (se necessario)**: Usa lo strumento \`googleSearch\` per trovare normative specifiche (es. Accordi Stato-Regioni, norme UNI) o dettagli tecnici per arricchire la tua analisi. Cita sempre le fonti che usi.
3.  **COMPILA**: Inserisci OGNI SINGOLA INFORMAZIONE che hai raccolto in un "rilievo" (\`finding\`) all'interno della sezione appropriata del report. Anche un'informazione parziale o un dubbio va inserito.
4.  **RISPONDI**: Genera la risposta FINALE, che DEVE essere un UNICO BLOCCO DI CODICE JSON.

*** FORMATO JSON DI USCITA (REGOLA CRITICA) ***
La tua risposta DEVE essere ESCLUSIVAMENTE un blocco di codice JSON valido, marcato con \`\`\`json ... \`\`\`.
Il JSON deve avere questa struttura: \`{ "conversationalResponse": "...", "report": [...] }\`.
- \`conversationalResponse\`: Una breve frase di commento per l'utente.
- \`report\`: L'array con le 6 sezioni e tutti i rilievi trovati.

Ogni rilievo (\`finding\`) deve contenere:
- \`id\`: Un ID univoco (es. timestamp).
- \`description\`: Descrizione del rilievo.
- \`hazard\`: Pericolo (es. "Scivolamento", "Contatto elettrico").
- \`riskLevel\`: Rischio stimato (1-10).
- \`regulation\`: Normativa di riferimento.
- \`recommendation\`: Azione correttiva.
- \`photoAnalysis\` (opzionale): Analisi della foto, se fornita.

Inizia la conversazione salutando e chiedendo di iniziare. Dalla seconda interazione in poi, applica questo flusso di lavoro senza eccezioni.`;


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