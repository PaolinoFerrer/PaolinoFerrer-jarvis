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
Il tuo unico scopo è compilare un Documento di Valutazione dei Rischi (DVR) in formato JSON, seguendo una struttura gerarchica precisa. Ogni tua risposta DEVE contenere un report JSON popolato. Il campo "report" NON DEVE MAI ESSERE VUOTO se l'utente descrive una situazione.

*** STRUTTURA DEL REPORT GERARCHICA (REGOLA CRITICA) ***
Il report DEVE essere un array di "Luoghi di Lavoro" (\`Workplace\`).
Ogni "Luogo di Lavoro" DEVE contenere un array di "Mansioni" (\`Task\`).
Ogni "Mansione" DEVE contenere:
1.  Un array di "Rilievi" (\`Finding\`) specifici per quella mansione in quel luogo.
2.  Un array di "Dispositivi di Protezione Individuale" (\`DpiItem\`) obbligatori per quella mansione.

*** FLUSSO DI LAVORO OBBLIGATORIO ***
1.  **ANALIZZA**: Leggi l'input dell'utente e il contesto dalla base di conoscenza per identificare luoghi, mansioni, rischi e DPI.
2.  **RICERCA (se necessario)**: Usa \`googleSearch\` per trovare normative e dettagli tecnici. Cita le fonti.
3.  **COMPILA E ORGANIZZA**: Raggruppa tutte le informazioni secondo la gerarchia Luogo -> Mansione -> Rilievi/DPI.
4.  **RISPONDI**: Genera la risposta FINALE, che DEVE essere un UNICO BLOCCO DI CODICE JSON.

*** FORMATO JSON DI USCITA (ESEMPIO OBBLIGATORIO) ***
La tua risposta DEVE essere ESCLUSIVAMENTE un blocco di codice JSON valido, marcato con \`\`\`json ... \`\`\`.
Il JSON deve avere questa struttura: \`{ "conversationalResponse": "...", "report": [...] }\`.
\`\`\`json
{
  "conversationalResponse": "Ho analizzato la situazione e compilato il report come richiesto.",
  "report": [
    {
      "id": "workplace-1719502538901",
      "name": "Ufficio Amministrativo",
      "tasks": [
        {
          "id": "task-1719502538902",
          "name": "Impiegato videoterminalista",
          "findings": [
            {
              "id": "finding-1719502538903",
              "description": "Presenza di ciabatte per terra con cavi elettrici esposti.",
              "hazard": "Rischio elettrico e di inciampo",
              "riskLevel": 7,
              "regulation": "D.Lgs. 81/08 Titolo II, Capo II",
              "recommendation": "Riorganizzare i cavi utilizzando canaline o passacavi."
            }
          ],
          "requiredDpi": [
            { "name": "Nessun DPI specifico richiesto per la mansione in condizioni normali." }
          ]
        }
      ]
    },
    {
      "id": "workplace-1719502538904",
      "name": "Officina",
      "tasks": [
        {
          "id": "task-1719502538905",
          "name": "Addetto ai torni",
          "findings": [
             {
              "id": "finding-1719502538906",
              "description": "Torni con pedane in legno usurate e sporcizia.",
              "hazard": "Rischio scivolamento e contatto con organi in movimento",
              "riskLevel": 8,
              "regulation": "D.Lgs. 81/08 Allegato IV",
              "recommendation": "Sostituire le pedane con materiale antiscivolo e pulire regolarmente l'area."
            }
          ],
          "requiredDpi": [
            { "name": "Scarpe antinfortunistiche" },
            { "name": "Occhiali di protezione" },
            { "name": "Guanti anti-taglio" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

Inizia la conversazione salutando. Dalla seconda interazione, applica questo flusso senza eccezioni.`;


export async function sendChatMessage(
    message: string,
    image?: { mimeType: string; data: string }
): Promise<{ 
    conversationalResponse: string; 
    report: Report;
    sources?: { uri: string; title: string }[];
}> {
    const currentAi = getAi();
    // Create a new stateless chat session for each message to improve reliability
    const chat = currentAi.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
            tools: [{googleSearch: {}}], 
        },
    });
    
    let messagePayload: string | Part[];

    if (image) {
        messagePayload = [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            { text: message }
        ];
    } else {
        messagePayload = message;
    }

    const response: GenerateContentResponse = await chat.sendMessage({ message: messagePayload });
    
    try {
        const rawText = response.text.trim();
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
        
        let jsonToParse: string;
        if (jsonMatch && jsonMatch[1]) {
            jsonToParse = jsonMatch[1];
        } else if (rawText.startsWith('{') && rawText.endsWith('}')) {
            jsonToParse = rawText;
        } else {
            console.error("No valid JSON block found in response:", rawText);
            throw new Error("La risposta dell'AI non contiene un blocco JSON valido e formattato correttamente.");
        }

        const parsed = JSON.parse(jsonToParse);
        if (!parsed.report || !parsed.conversationalResponse) {
            throw new Error("Il JSON ricevuto dall'AI non ha la struttura richiesta (manca 'report' o 'conversationalResponse').");
        }
        
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
    } catch (e: any) {
        // Intercept specific API errors to provide a clearer message to the user.
        if (e instanceof Error && e.message.includes('INTERNAL')) {
             throw new Error("Si è verificato un errore interno con il servizio AI. Riprova tra poco.");
        }
        console.error("Failed to parse JSON response from Gemini:", response.text, e);
        throw new Error("La risposta dell'AI non è in un formato JSON valido o la sua struttura è inaspettata.");
    }
}
