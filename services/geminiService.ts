// Fix: Replaced placeholder content with a mock implementation of the Gemini service.
import { Report, ChatMessage, Finding } from '../types';

// Helper function to simulate a delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Mocks the response from the Gemini API for chat and report generation.
 * This function simulates analyzing user input and updating the safety report.
 */
export const generateResponse = async (
  currentReport: Report,
  text: string,
  file?: File,
  knowledgeContext?: string
): Promise<{ chatResponse: string; reportUpdate: Report, sources?: ChatMessage['sources'] }> => {
  await delay(1500); // Simulate network latency

  console.log('GEMINI MOCK: Generating response for:', { text, file, knowledgeContext });

  const newReport = JSON.parse(JSON.stringify(currentReport)); // Deep copy
  let chatResponse = "Non ho capito la tua richiesta. Prova a descrivere un rischio o una mansione.";
  
  const lowerText = text.toLowerCase();

  // Basic keyword-based logic for mocking
  if (lowerText.includes('scaffale') || lowerText.includes('magazzino') || file) {
    const workplaceName = "Magazzino Principale";
    const taskName = "Stoccaggio Materiali";

    let workplace = newReport.find((w: any) => w.name === workplaceName);
    if (!workplace) {
      workplace = { id: `wp-${Date.now()}`, name: workplaceName, tasks: [] };
      newReport.push(workplace);
    }

    let task = workplace.tasks.find((t: any) => t.name === taskName);
    if (!task) {
      task = { id: `task-${Date.now()}`, name: taskName, findings: [], requiredDpi: [{name: 'Guanti da lavoro'}, {name: 'Scarpe antinfortunistiche'}] };
      workplace.tasks.push(task);
    }
    
    const newFinding: Finding = {
      id: `find-${Date.now()}`,
      description: file ? `Materiale stoccato in modo disordinato su scaffalatura, come da foto.` : `Identificato potenziale rischio di caduta materiale da scaffalatura.`,
      hazard: "Caduta di oggetti dall'alto",
      damage: 3, // Grave
      probability: 2, // Possibile
      exposure: 3, // Frequente
      riskLevel: 6, // D*P*E = 3*2*3 = 18 -> Mappato su scala 1-10
      regulation: "D.Lgs. 81/08 - Allegato IV",
      recommendation: "Verificare la stabilità e il corretto stoccaggio del materiale. Fissare gli scaffali e non superare il carico massimo.",
      photo: file ? { analysis: 'Analisi della foto allegata.', base64: 'mock-base64-string' } : undefined
    };

    task.findings.push(newFinding);
    chatResponse = `Ho aggiunto un nuovo rilievo per il **${workplaceName}**, mansione **${taskName}**.
- **Rilievo**: ${newFinding.description}
- **Rischio**: ${newFinding.hazard} (Livello: ${newFinding.riskLevel}/10)
- **Raccomandazione**: ${newFinding.recommendation}`;

    if(knowledgeContext) {
        chatResponse += `\n\n_Informazioni dalla base di conoscenza: ${knowledgeContext}_`
    }


  } else if (lowerText.includes('ufficio') || lowerText.includes('cavo')) {
      chatResponse = "Ho capito. Per l'area ufficio, ho aggiunto un rilievo relativo ai cavi di alimentazione a terra che costituiscono un pericolo di inciampo. Ho raccomandato di utilizzare delle canaline passacavo.";
      // A more complete mock would also update the report here.
  }

  return { chatResponse, reportUpdate: newReport, sources: [] };
};


/**
 * Mocks a search for web sources using Gemini with Google Search tool.
 */
export const findWebSources = async (topic: string): Promise<{ title: string; uri: string }[]> => {
    await delay(1000);
    console.log("GEMINI MOCK: Searching web for:", topic);

    if (!topic || topic.trim().length < 3) {
        return [];
    }
    
    // Simulate an error if the query is too generic
    if (topic.toLowerCase().includes('sicurezza')) {
        throw new Error("La tua ricerca è troppo generica. Prova a specificare una normativa o un rischio (es: 'rischio elettrico cantiere').");
    }

    // Return mock data based on topic
    if (topic.toLowerCase().includes('antincendio')) {
        return [
            { title: "Norme di prevenzione incendi - Vigili del Fuoco", uri: "https://www.vigilfuoco.it/aspx/norme_prevenzione.aspx" },
            { title: "D.M. 10 marzo 1998 - Criteri generali di sicurezza antincendio", uri: "https://www.gazzettaufficiale.it/eli/id/1998/04/07/098A3228/sg" }
        ];
    }
    if (topic.toLowerCase().includes('81/08')) {
        return [
             { title: "DECRETO LEGISLATIVO 9 aprile 2008, n. 81 - Normattiva", uri: "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2008-04-09;81" },
             { title: "Testo Unico Sicurezza sul Lavoro (D.Lgs. 81/08)", uri: "https://www.lavoro.gov.it/temi-e-priorita/salute-e-sicurezza/focus-on/testo-unico-sicurezza-sul-lavoro/Pagine/default.aspx" }
        ];
    }

    return [
        { title: `Risultati di ricerca per: ${topic}`, uri: `https://www.google.com/search?q=${encodeURIComponent(topic)}` },
        { title: "INAIL - Istituto Nazionale per l'Assicurazione contro gli Infortuni sul Lavoro", uri: "https://www.inail.it" }
    ];
};
