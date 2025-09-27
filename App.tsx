import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, Report, DriveFile, KnowledgeSource } from './types';
import ChatInterface from './components/ChatInterface';
import ReportView from './components/ReportView';
import ArchiveModal from './components/ArchiveModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import { BrainCircuitIcon } from './components/icons';
import { sendChatMessage, startChat } from './services/geminiService';
import * as drive from './services/googleDriveService';
import * as kb from './services/jarvisApi';

// Fix: Replaced placeholder content with a full implementation of the App component.
function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [report, setReport] = useState<Report>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth & Drive state
  const [isLoggedIn, setIsLoggedIn] = useState(drive.isSignedIn());
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  
  // Knowledge Base state
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);

  useEffect(() => {
    startChat();
    setMessages([
      {
        id: 'init-1',
        role: 'model',
        text: 'Ciao! Sono Jarvis, il tuo assistente per la sicurezza sul lavoro. Come posso aiutarti a compilare il Documento di Valutazione dei Rischi oggi? Descrivi una situazione o carica una foto.'
      }
    ]);
    loadKnowledgeSources();
  }, []);

  const handleSendMessage = async (text: string, file?: File) => {
    setError(null);
    const userMessageId = `user-${Date.now()}`;
    let photoUrl: string | undefined;

    if (file) {
      photoUrl = URL.createObjectURL(file);
    }

    const newUserMessage: ChatMessage = { id: userMessageId, role: 'user', text, photo: photoUrl };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      let imagePayload;
      if (file) {
        const reader = new FileReader();
        const data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imagePayload = { mimeType: file.type, data };
      }

      const response = await sendChatMessage(text, imagePayload);
      
      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: response.conversationalResponse,
        sources: response.sources
      };
      
      setMessages(prev => [...prev, modelMessage]);
      setReport(currentReport => {
          const updatedReport = [...currentReport];
          response.report.forEach(newWorkplace => {
              const existingWorkplaceIndex = updatedReport.findIndex(w => w.name.toLowerCase() === newWorkplace.name.toLowerCase());
              if(existingWorkplaceIndex > -1) {
                  newWorkplace.tasks.forEach(newTask => {
                      const existingTaskIndex = updatedReport[existingWorkplaceIndex].tasks.findIndex(t => t.name.toLowerCase() === newTask.name.toLowerCase());
                      if(existingTaskIndex > -1) {
                          const existingTask = updatedReport[existingWorkplaceIndex].tasks[existingTaskIndex];
                          existingTask.findings = [...existingTask.findings, ...newTask.findings];
                          existingTask.requiredDpi = [...new Set([...existingTask.requiredDpi, ...newTask.requiredDpi].map(d => d.name))].map(name => ({ name }));
                      } else {
                          updatedReport[existingWorkplaceIndex].tasks.push(newTask);
                      }
                  });
              } else {
                  updatedReport.push(newWorkplace);
              }
          });
          return updatedReport;
      });

    } catch (e: any) {
      const errorMessage = `Errore: ${e.message}`;
      setError(errorMessage);
      const errorBotMessage: ChatMessage = { id: `err-${Date.now()}`, role: 'model', text: errorMessage };
      setMessages(prev => [...prev, errorBotMessage]);
    } finally {
      setIsLoading(false);
      // Photo URL is kept for rendering in the chat message
    }
  };

  // --- Auth Handlers ---
  const handleLogin = async () => {
    await drive.signIn();
    setIsLoggedIn(true);
  };
  const handleLogout = async () => {
    await drive.signOut();
    setIsLoggedIn(false);
  };

  // --- Google Drive Handlers ---
  const handleOpenArchive = async () => {
    if (!isLoggedIn) {
        alert("Effettua il login con Google per accedere all'archivio.");
        return;
    }
    await loadDriveFiles();
    setIsArchiveOpen(true);
  };
  const loadDriveFiles = async () => {
    const files = await drive.listReports();
    setDriveFiles(files);
  };
  const handleSaveReport = async () => {
    if (report.length === 0) {
      alert("Il report è vuoto, non c'è nulla da salvare.");
      return;
    }
    try {
      await drive.saveReport(report);
      alert("Report salvato con successo su Google Drive!");
      await loadDriveFiles();
    } catch (e: any) {
      alert(`Errore durante il salvataggio del report: ${e.message}`);
    }
  };
  const handleLoadReport = async (file: DriveFile) => {
    try {
        const loadedReport = await drive.loadReport(file.id);
        setReport(loadedReport);
        setMessages(prev => [...prev, {
            id: `sys-${Date.now()}`,
            role: 'model',
            text: `Report "${file.name}" caricato da Google Drive.`
        }]);
        setIsArchiveOpen(false);
    } catch (e: any) {
        alert(`Errore durante il caricamento del report: ${e.message}`);
    }
  };
  const handleDeleteReport = async (fileId: string) => {
    try {
        await drive.deleteReport(fileId);
        alert("Report eliminato con successo.");
        await loadDriveFiles();
    } catch (e: any) {
        alert(`Errore durante l'eliminazione del report: ${e.message}`);
    }
  };

  // --- Knowledge Base Handlers ---
  const loadKnowledgeSources = useCallback(async () => {
    const sources = await kb.listSources();
    setKnowledgeSources(sources);
  }, []);
  const handleAddWebSource = async (source: { uri: string; title: string }) => {
    await kb.addSource(source.uri, source.title);
    await loadKnowledgeSources();
  };
  const handleAddFileSource = async (file: File) => {
    await kb.addFile(file);
    await loadKnowledgeSources();
  };
  const handleDeleteSource = async (sourceId: string) => {
    await kb.deleteSource(sourceId);
    await loadKnowledgeSources();
  };


  return (
    <div className="bg-jarvis-bg min-h-screen text-jarvis-text font-sans">
      <header className="bg-jarvis-surface/80 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-jarvis-text/10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BrainCircuitIcon className="w-8 h-8 text-jarvis-primary" />
            <h1 className="text-2xl font-bold text-white">Jarvis<span className="text-jarvis-secondary"> DVR</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsKnowledgeBaseOpen(true)} className="text-sm text-jarvis-text-secondary hover:text-jarvis-primary transition-colors">Base di Conoscenza</button>
             <button onClick={handleOpenArchive} className="text-sm text-jarvis-text-secondary hover:text-jarvis-primary transition-colors">Archivio</button>
             {isLoggedIn ? (
                <button onClick={handleLogout} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-500/30">Logout</button>
             ) : (
                <button onClick={handleLogin} className="bg-jarvis-primary/80 text-white px-4 py-2 rounded-lg text-sm hover:bg-jarvis-primary">Login with Google</button>
             )}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-80px)]">
        <div className="h-full">
            <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
            />
        </div>
        <div className="h-full">
            <ReportView 
                report={report}
                onSave={handleSaveReport}
                isLoggedIn={isLoggedIn}
            />
        </div>
      </main>
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
          <p>{error}</p>
        </div>
      )}

      <ArchiveModal 
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        reports={driveFiles}
        onLoad={handleLoadReport}
        onDelete={handleDeleteReport}
        onRefresh={loadDriveFiles}
      />
      
      <KnowledgeBaseModal
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
        sources={knowledgeSources}
        onDelete={handleDeleteSource}
        onRefresh={loadKnowledgeSources}
        onAddWebSource={handleAddWebSource}
        onAddFile={onAddFileSource}
      />

    </div>
  );
}

export default App;
