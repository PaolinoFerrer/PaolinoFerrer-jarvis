import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface.tsx';
import ReportView from './components/ReportView.tsx';
import ArchiveModal from './components/ArchiveModal.tsx';
import { ChatMessage, Report, DriveFile, ReportMetadata } from './types.ts';
import { sendChatMessage, startChat } from './services/geminiService.ts';
import * as driveService from './services/googleDriveService.ts';
import { BrainCircuitIcon, ArchiveIcon, PlusIcon, GoogleIcon, LogoutIcon } from './components/icons.tsx';

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

const getInitialMessages = (): ChatMessage[] => [{
  id: 'init',
  role: 'system',
  text: 'Buongiorno. Sono Jarvis. Per iniziare, acceda con il suo account Google per poter salvare e caricare i sopralluoghi.'
}];

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages());
  const [report, setReport] = useState<Report>([]);
  const [reportMetadata, setReportMetadata] = useState<ReportMetadata>({ driveId: null, name: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  
  useEffect(() => {
    // Initialize AI chat on component mount
    startChat();
  }, []);

  const handleSignIn = async () => {
    try {
      await driveService.signIn();
      setIsSignedIn(true);
      setMessages([{
        id: 'init-signed-in',
        role: 'system',
        text: 'Accesso eseguito. Ora può iniziare un nuovo sopralluogo o caricarne uno dall\'archivio.'
      }]);
    } catch (e) {
      setError('Accesso a Google Drive fallito.');
      console.error(e);
    }
  };

  const handleSignOut = () => {
    driveService.signOut();
    setIsSignedIn(false);
    setReport([]);
    setReportMetadata({ driveId: null, name: null });
    setMessages(getInitialMessages());
  };


  const handleSendMessage = async (text: string, file?: File, context?: string) => {
    setIsLoading(true);
    setError(null);

    const fullMessage = context ? `${context}\n\n${text}` : text;

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
      const { conversationalResponse, report: newReportData } = await sendChatMessage(fullMessage, imagePayload);
      
      const botMessage: ChatMessage = {
        id: Date.now().toString() + '-bot',
        role: 'model',
        text: conversationalResponse
      };

      setMessages(prev => [...prev, botMessage]);

      const processedReport = newReportData.map(newSection => {
          const oldSection = report.find(s => s.title === newSection.title);
          return {
              ...newSection,
              findings: newSection.findings.map(newFinding => {
                  const oldFinding = oldSection?.findings.find(f => f.id === newFinding.id);
                  if (oldFinding?.photo?.base64 && newFinding.photo) {
                      return { ...newFinding, photo: { ...newFinding.photo, base64: oldFinding.photo.base64 }};
                  }
                  return newFinding;
              })
          };
      });

      if (userMessage.photo) {
          let photoAttached = false;
          for (let i = processedReport.length - 1; i >= 0 && !photoAttached; i--) {
              const section = processedReport[i];
              for (let j = section.findings.length - 1; j >= 0 && !photoAttached; j--) {
                  const finding = section.findings[j];
                  if (finding.photo && finding.photo.analysis && !finding.photo.base64) {
                      finding.photo.base64 = userMessage.photo;
                      photoAttached = true;
                  }
              }
          }
      }
      setReport(processedReport);

    } catch (e) {
      const err = e as Error;
      setError(err.message);
      const errorMessage: ChatMessage = { id: Date.now().toString() + '-err', role: 'system', text: `Si è verificato un errore: ${err.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async () => {
    const isEditing = !!reportMetadata.driveId;
    let fileName = reportMetadata.name;

    if (!isEditing) {
        fileName = prompt("Inserisci un nome per questo sopralluogo:");
    } else {
        const action = confirm(`Stai modificando "${fileName}".\n\n- Clicca OK per salvare le modifiche (sovrascrivere).\n- Clicca Annulla per salvarlo come una nuova copia.`);
        if (!action) {
            fileName = prompt("Inserisci un nuovo nome per la copia:", `${fileName} (copia)`);
        }
    }

    if (!fileName) return;

    setIsLoading(true);
    try {
        const fileIdToSave = isEditing && fileName === reportMetadata.name ? reportMetadata.driveId : null;
        const savedFile = await driveService.saveFile(report, fileName, fileIdToSave);
        setReportMetadata({ driveId: savedFile.id, name: savedFile.name.replace('.jarvis.report.json', '') });
        alert(`Report "${fileName}" salvato con successo su Google Drive!`);
    } catch (e) {
        setError('Errore durante il salvataggio su Google Drive.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleLoadReport = async (file: DriveFile) => {
    setIsLoading(true);
    try {
      const loadedReport = await driveService.loadFile(file.id);
      setReport(loadedReport);
      setReportMetadata({ driveId: file.id, name: file.name });
      
      const systemMessage: ChatMessage = {
        id: Date.now().toString() + '-sys',
        role: 'system',
        text: `Sopralluogo "${file.name}" caricato. I nuovi rilievi verranno aggiunti a questo contesto.`
      };
      setMessages([systemMessage]);
      
      const contextForAI = `Sto continuando un sopralluogo precedentemente salvato. Ecco il report attuale in formato JSON: ${JSON.stringify(loadedReport)}. I miei prossimi messaggi saranno aggiunte o modifiche a questo report.`;
      handleSendMessage(`Ok, sono pronto a continuare dal report caricato.`, undefined, contextForAI);

      setIsArchiveOpen(false);
    } catch (e) {
      setError('Errore durante il caricamento del report da Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewInspection = () => {
    if (report.length > 0 && !window.confirm("Sei sicuro di voler iniziare un nuovo sopralluogo? I dati non salvati andranno persi.")) {
      return;
    }
    setReport([]);
    setReportMetadata({ driveId: null, name: null });
    setMessages([{
        id: 'init-new',
        role: 'system',
        text: 'Nuovo sopralluogo avviato. Mi dica quale area, macchinario o mansione vuole ispezionare.'
      }]);
    startChat(); // Reset AI conversation context
  };
  
  const handleDeleteReport = async (reportId: string) => {
    try {
        await driveService.deleteFile(reportId);
        setDriveFiles(prev => prev.filter(f => f.id !== reportId));
    } catch (e) {
        setError('Errore durante l\'eliminazione del file da Google Drive.');
    }
  };

  const handleOpenArchive = async () => {
      setIsLoading(true);
      try {
          const files = await driveService.listFiles();
          setDriveFiles(files);
          setIsArchiveOpen(true);
      } catch(e) {
          setError("Impossibile caricare i file dall'archivio di Google Drive.");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <>
      <div className="h-screen w-screen p-4 flex flex-col bg-jarvis-bg font-sans">
        <header className="flex items-center justify-between gap-4 pb-4 border-b border-jarvis-text/10">
          <div className="flex items-center gap-4">
            <BrainCircuitIcon className="w-10 h-10 text-jarvis-primary"/>
            <div>
              <h1 className="text-2xl font-bold text-jarvis-secondary">Jarvis</h1>
              <p className="text-sm text-jarvis-text-secondary">Assistente per Sopralluoghi di Sicurezza</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
                <>
                    <button onClick={handleNewInspection} className="flex items-center gap-2 bg-jarvis-surface text-jarvis-text-secondary px-4 py-2 rounded-lg hover:bg-jarvis-bg hover:text-jarvis-primary transition-colors" title="Nuovo Sopralluogo">
                        <PlusIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Nuovo</span>
                    </button>
                    <button onClick={handleOpenArchive} className="flex items-center gap-2 bg-jarvis-surface text-jarvis-text-secondary px-4 py-2 rounded-lg hover:bg-jarvis-bg hover:text-jarvis-primary transition-colors" title="Archivio Google Drive">
                        <ArchiveIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Archivio</span>
                    </button>
                    <button onClick={handleSignOut} className="flex items-center gap-2 bg-jarvis-surface text-red-400/80 px-4 py-2 rounded-lg hover:bg-jarvis-bg hover:text-red-400 transition-colors" title="Esci">
                        <LogoutIcon className="w-5 h-5"/>
                    </button>
                </>
            ) : (
                <button onClick={handleSignIn} className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                    <GoogleIcon className="w-5 h-5"/>
                    <span className="font-medium">Accedi con Google</span>
                </button>
            )}
          </div>
        </header>
        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg my-4" role="alert">
            <strong>Errore:</strong> {error} <button onClick={() => setError(null)} className="float-right font-bold">X</button>
          </div>
        )}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden pt-4">
          <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
          <ReportView report={report} onSave={handleSaveReport} isLoggedIn={isSignedIn} />
        </main>
      </div>
      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        reports={driveFiles}
        onLoad={handleLoadReport}
        onDelete={handleDeleteReport}
        onRefresh={handleOpenArchive}
      />
    </>
  );
};

export default App;
