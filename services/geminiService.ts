import { GoogleGenAI } from "@google/genai";
import { Report } from '../types';

// Per le istruzioni: l'API key DEVE essere presa da process.env.API_KEY
// e si assume che sia pre-configurata e valida.
// Fix: Correctly initialize GoogleGenAI client per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Istruzioni di sistema per il modello Gemini.
const systemInstruction = `Sei "Jarvis DVR", un assistente AI specializzato in sicurezza sul lavoro.

*** OBIETTIVO PRIMARIO E INDEROGABILE ***
Il tuo unico scopo è compilare un Documento di Valutazione dei Rischi (DVR) in formato JSON e rispondere a domande pertinenti. Ogni tua risposta DEVE essere un blocco di codice JSON valido.

*** STRUTTURA DEL REPORT GERARCHICA (REGOLA CRITICA) ***
Il report DEVE essere un array di "Luoghi di Lavoro" (\`Workplace\`).
Ogni "Luogo di Lavoro" DEVE contenere un array di "Mansioni" (\`Task\`).
Ogni "Mansione" DEVE contenere:
1.  Un array di "Rilievi" (\`Finding\`) specifici per quella mansione in quel luogo.
2.  Un array di "Dispositivi di Protezione Individuale" (\`DpiItem\`) obbligatori per quella mansione.

*** FLUSSO DI LAVORO OBBLIGATORIO ***
1.  **ANALIZZA**: Leggi l'input dell'utente.
2.  **DETERMINA L'INTENTO**:
    *   **CASO A (Sopralluogo/Aggiornamento)**: Se l'utente fornisce una descrizione dettagliata di un luogo di lavoro, rischi, o attrezzature, il tuo obiettivo è popolare o aggiornare il DVR.
    *   **CASO B (Conversazione/Domanda)**: Se l'utente fa una domanda generica, un commento, o chiede un approfondimento, il tuo obiettivo è rispondere in modo colloquiale.
3.  **AGISCI DI CONSEGUENZA**:
    *   **CASO A**: Esegui una ricerca con \`googleSearch\` se necessario. COMPILA E ORGANIZZA il report JSON secondo la gerarchia. Il campo \`report\` DEVE essere popolato con i nuovi dati.
    *   **CASO B**: Fornisci una risposta testuale alla domanda. Il campo \`report\` DEVE essere un array vuoto \`[]\`.
4.  **RISPONDI**: Genera la risposta FINALE, che DEVE SEMPRE essere un UNICO BLOCCO DI CODICE JSON valido come da esempio.

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
    }
  ]
}
\`\`\`

Inizia la conversazione salutando. Dalla seconda interazione, applica questo flusso senza eccezioni.`;

/**
 * Tipo di risposta attesa dal servizio Gemini, che include la risposta
 * conversazionale, il report strutturato e le eventuali fonti utilizzate.
 */
export interface GeminiResponse {
  conversationalResponse: string;
  report: Report;
  sources?: { uri: string; title: string }[];
}

/**
 * Invia un messaggio all'API di Gemini, includendo testo e opzionalmente un'immagine.
 * Gestisce la costruzione della richiesta, l'invio, e il parsing della risposta JSON.
 * @param text Il messaggio di testo dell'utente.
 * @param image L'immagine opzionale da inviare, come payload base64.
 * @returns Una promessa che si risolve con la risposta parsata dal modello.
 */
export const sendChatMessage = async (
  text: string,
  image?: { mimeType: string; data: string }
): Promise<GeminiResponse> => {
    
    // Costruisce il payload `contents` per l'API
    const contents = image 
        ? { parts: [{ inlineData: { mimeType: image.mimeType, data: image.data } }, { text }] }
        : text;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            // Abilita Google Search come strumento per il modello.
            // Per le istruzioni, questo disabilita responseMimeType e responseSchema.
            tools: [{ googleSearch: {} }],
        },
    });

    // Estrae il blocco di codice JSON dalla risposta testuale del modello.
    let jsonString = response.text;
    const jsonMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
    } else {
        // Fallback nel caso in cui il modello non usi il blocco markdown
        jsonString = jsonString.trim();
         // Ulteriore fallback: se non è un oggetto/array, è una risposta conversazionale
         if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
            return {
                conversationalResponse: jsonString,
                report: []
            };
        }
    }

    try {
        const parsedResponse: Omit<GeminiResponse, 'sources'> = JSON.parse(jsonString);

        // Estrae le fonti dai metadati di grounding se Google Search è stato utilizzato.
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const sources: { uri: string; title: string }[] = [];
        if (groundingMetadata?.groundingChunks) {
            for (const chunk of groundingMetadata.groundingChunks) {
                if (chunk.web) {
                    sources.push({
                        uri: chunk.web.uri,
                        title: chunk.web.title || chunk.web.uri,
                    });
                }
            }
        }
        
        return {
            ...parsedResponse,
            sources: sources.length > 0 ? sources : undefined,
        };

    } catch (e) {
        console.error("Fallimento nel parsing della risposta JSON da Gemini:", e);
        console.error("Testo della risposta originale:", response.text);
        // Se il parsing fallisce, restituiamo il testo come risposta conversazionale.
        return {
            conversationalResponse: `Ho riscontrato un problema nell'elaborare la richiesta. La risposta del modello è stata: "${response.text}"`,
            report: []
        };
    }
};
