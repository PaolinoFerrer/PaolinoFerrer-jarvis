
import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import ReportView from './components/ReportView';
import { ChatMessage, Report } from './types';
import { sendChatMessage, startChat } from './services/geminiService';
import { BrainCircuitIcon } from './components/icons';

const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
      resolve({ mimeType, data });
    };
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [report, setReport] = useState<Report>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize chat on component mount
    startChat();
    setMessages([{
      id: 'init',
      role: 'system',
      text: 'Buongiorno. Sono Jarvis, il suo assistente per i sopralluoghi di sicurezza. Per iniziare, mi dica quale area, macchinario o mansione vuole ispezionare.'
    }]);
  }, []);

  const handleSendMessage = async (text: string, file?: File) => {
    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };
    
    let imagePayload;
    if (file) {
      try {
        imagePayload = await fileToBase64(file);
        userMessage.photo = `data:${imagePayload.mimeType};base64,${imagePayload.data}`;
      } catch (err) {
        setError("Impossibile caricare l'immagine.");
        setIsLoading(false);
        return;
      }
    }
    
    setMessages(prev => [...prev, userMessage]);

    try {
      const { conversationalResponse, report: newReportData } = await sendChatMessage(text, imagePayload);
      
      const botMessage: ChatMessage = {
        id: Date.now().toString() + '-bot',
        role: 'model',
        text: conversationalResponse
      };

      setMessages(prev => [...prev, botMessage]);

      // Add base64 photo data to the new report from the user message
      const updatedReportWithPhotos = newReportData.map(section => ({
        ...section,
        findings: section.findings.map(finding => {
          const originalFinding = report.flatMap(s => s.findings).find(f => f.id === finding.id);
          if (originalFinding?.photo) {
            return { ...finding, photo: originalFinding.photo };
          }
          if (userMessage.photo && newReportData.flatMap(s => s.findings).some(f => f.id === finding.id)) {
             const latestFindingId = [...section.findings].sort((a,b) => b.id.localeCompare(a.id))[0].id;
             if (finding.id === latestFindingId && finding.photo?.analysis) {
                return {...finding, photo: { base64: userMessage.photo, analysis: finding.photo.analysis }}
             }
          }
          return finding;
        })
      }));

      // This logic tries to find the latest finding and attach the photo to it.
      // A more robust solution might require Gemini to return an ID to which the photo belongs.
      if (userMessage.photo) {
          let photoAttached = false;
          for (let i = updatedReportWithPhotos.length - 1; i >= 0 && !photoAttached; i--) {
              const section = updatedReportWithPhotos[i];
              for (let j = section.findings.length - 1; j >= 0 && !photoAttached; j--) {
                  const finding = section.findings[j];
                  if (finding.photo && finding.photo.analysis && !finding.photo.base64) {
                      finding.photo.base64 = userMessage.photo;
                      photoAttached = true;
                  }
              }
          }
      }


      setReport(updatedReportWithPhotos);

    } catch (e) {
      const err = e as Error;
      setError(err.message);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-err',
        role: 'system',
        text: `Si è verificato un errore: ${err.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen p-4 flex flex-col bg-jarvis-bg font-sans">
      <header className="flex items-center gap-4 pb-4 border-b border-jarvis-text/10">
        <BrainCircuitIcon className="w-10 h-10 text-jarvis-primary"/>
        <div>
          <h1 className="text-2xl font-bold text-jarvis-secondary">Jarvis</h1>
          <p className="text-sm text-jarvis-text-secondary">Assistente per Sopralluoghi di Sicurezza</p>
        </div>
      </header>
      {error && (
        <div className="bg-red-500/20 text-red-300 p-3 rounded-lg my-4" role="alert">
          <strong>Errore:</strong> {error}
        </div>
      )}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden pt-4">
        <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
        <ReportView report={report} />
      </main>
    </div>
  );
};

export default App;