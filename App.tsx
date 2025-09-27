import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface.tsx';
import ReportView from './components/ReportView.tsx';
import ArchiveModal from './components/ArchiveModal.tsx';
import KnowledgeBaseModal from './components/KnowledgeBaseModal.tsx';
import { ChatMessage, Report, DriveFile, KnowledgeSource } from './types.ts';
import { sendChatMessage, startChat } from './services/geminiService.ts';
import * as driveService from './services/googleDriveService.ts';
import * as jarvisApi from './services/jarvisApi.ts';
import { BrainCircuitIcon } from './components/icons.tsx';

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = result.split(';')[0].split(':')[1];
      const data = result.split(',')[1];
      resolve({ mimeType, data });
    };
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [report, setReport] = useState<Report>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Google Drive State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [currentFile, setCurrentFile] = useState<DriveFile | null>(null);

    // Knowledge Base State
    const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
    const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
    

    // Initial greeting from Jarvis
    useEffect(() => {
        startChat(); // Initialize the chat session
        setMessages([
            {
                id: 'init',
                role: 'model',
                text: 'Buongiorno, sono Jarvis. Come posso assisterla con la sua valutazione dei rischi oggi?',
            },
        ]);
    }, []);

    const handleSendMessage = useCallback(async (text: string, file?: File) => {
        setIsLoading(true);
        setError(null);

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
        };
        
        let imagePayload;
        let imageDisplayUrl: string | undefined;
        if (file) {
            const { mimeType, data } = await fileToBase64(file);
            imagePayload = { mimeType, data };
            imageDisplayUrl = `data:${mimeType};base64,${data}`;
            userMessage.photo = imageDisplayUrl;
        }

        setMessages((prev) => [...prev, userMessage]);

        try {
            const { conversationalResponse, report: newReport, sources } = await sendChatMessage(text, imagePayload);
            
            if (imagePayload) {
                // Heuristic to find the finding related to the photo and attach the photo data for display in the report
                const allFindings = newReport.flatMap(s => s.findings);
                const oldFindings = report.flatMap(s => s.findings);
                const newFindings = allFindings.filter(f => !oldFindings.some(of => of.id === f.id) && f.photo?.analysis);

                if (newFindings.length > 0) {
                    const targetFindingId = newFindings[0].id;
                    for (const section of newReport) {
                        const findingInReport = section.findings.find(f => f.id === targetFindingId);
                        if (findingInReport && findingInReport.photo) {
                            findingInReport.photo.base64 = imageDisplayUrl;
                            break;
                        }
                    }
                }
            }

            setReport(newReport);

            const modelMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: conversationalResponse,
                sources: sources?.filter(s => s.uri),
                suggestedSources: sources?.filter(s => s.uri)
            };
            
            setMessages((prev) => [...prev, modelMessage]);

        } catch (err: any) {
            const errorMessage = `Errore: ${err.message || 'Si è verificato un problema.'}`;
            setError(errorMessage);
            setMessages((prev) => [
                ...prev,
                { id: 'error', role: 'model', text: errorMessage },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [report]);

    // Google Drive Handlers
    const handleLogin = async () => {
        try {
            await driveService.signIn();
            setIsLoggedIn(true);
            await handleRefreshArchive();
        } catch (err) {
            console.error('Login failed', err);
            setError("Accesso a Google Drive fallito.");
        }
    };
    
    const handleLogout = async () => {
        await driveService.signOut();
        setIsLoggedIn(false);
        setCurrentFile(null);
    };

    const handleSaveReport = async () => {
        let fileName = currentFile?.name || `Report ${new Date().toLocaleDateString('it-IT')}`;
        if (!currentFile) {
            const newName = prompt("Inserisci il nome del file per il report:", fileName);
            if (newName === null || !newName.trim()) return;
            fileName = newName;
        }
        
        try {
            const savedFile = await driveService.saveFile(report, fileName, currentFile?.id || null);
            setCurrentFile(savedFile);
            alert(`Report salvato come "${savedFile.name}"`);
            await handleRefreshArchive();
        } catch(err) {
            console.error('Save failed', err);
            setError("Salvataggio su Google Drive fallito.");
        }
    };

    const handleOpenArchive = async () => {
        if (!isLoggedIn) {
            alert("Effettua l'accesso con Google per visualizzare l'archivio.");
            return;
        }
        await handleRefreshArchive();
        setIsArchiveOpen(true);
    };

    const handleRefreshArchive = async () => {
        try {
            const files = await driveService.listFiles();
            setDriveFiles(files);
        } catch(err) {
            console.error('Failed to list files', err);
            setError("Impossibile caricare i file da Google Drive.");
        }
    };

    const handleLoadReport = async (file: DriveFile) => {
        if (window.confirm(`Sei sicuro di voler caricare il report "${file.name}"? Le modifiche non salvate andranno perse.`)) {
            try {
                const loadedReport = await driveService.loadFile(file.id);
                setReport(loadedReport);
                setCurrentFile(file);
                startChat(); // Restart chat with new context
                setMessages([
                    {
                        id: 'init-loaded',
                        role: 'model',
                        text: `Report "${file.name}" caricato con successo. Può continuare ad aggiungere rilievi.`,
                    },
                ]);
                setIsArchiveOpen(false);
            } catch (err) {
                console.error('Failed to load file', err);
                setError("Impossibile caricare il report selezionato.");
            }
        }
    };
    
    const handleDeleteReport = async (fileId: string) => {
        try {
            await driveService.deleteFile(fileId);
            alert("Report eliminato con successo.");
            if (currentFile?.id === fileId) {
                handleNewReport(false); // Clear current report if it was deleted
            }
            await handleRefreshArchive();
        } catch (err) {
            console.error('Failed to delete file', err);
            setError("Impossibile eliminare il report.");
        }
    };

    // Knowledge Base Handlers
    const handleOpenKnowledgeBase = async () => {
        await handleRefreshKnowledgeBase();
        setIsKnowledgeBaseOpen(true);
    };

    const handleRefreshKnowledgeBase = async () => {
        try {
            const sources = await jarvisApi.listSources();
            setKnowledgeSources(sources);
        } catch(err) {
            console.error('Failed to list knowledge sources', err);
            setError("Impossibile caricare le fonti di conoscenza.");
        }
    };

    const handleAddSource = async (source: { uri: string; title: string }) => {
        try {
            await jarvisApi.addSource(source.uri, source.title);
            alert(`Fonte "${source.title}" aggiunta alla base di conoscenza.`);
            await handleRefreshKnowledgeBase();
        } catch(err) {
            console.error('Failed to add source', err);
            setError("Impossibile aggiungere la fonte.");
        }
    };

    const handleDeleteSource = async (sourceId: string) => {
        try {
            await jarvisApi.deleteSource(sourceId);
            alert("Fonte eliminata con successo.");
            await handleRefreshKnowledgeBase();
        } catch (err) {
            console.error('Failed to delete source', err);
            setError("Impossibile eliminare la fonte.");
        }
    };

    const handleNewReport = (confirm = true) => {
        const doNewReport = () => {
            setReport([]);
            setCurrentFile(null);
            startChat(); // Restart chat for a new session
            setMessages([
                {
                    id: 'init-new',
                    role: 'model',
                    text: 'Nuovo report iniziato. Inserisci i dettagli del primo rilievo.',
                },
            ]);
        };

        if (confirm) {
            if (window.confirm("Sei sicuro di voler iniziare un nuovo report? Le modifiche non salvate andranno perse.")) {
                doNewReport();
            }
        } else {
            doNewReport();
        }
    };


    return (
        <div className="bg-jarvis-bg text-jarvis-text font-sans min-h-screen flex flex-col">
            <header className="bg-jarvis-surface/80 backdrop-blur-sm sticky top-0 z-10 border-b border-jarvis-text/10 px-6 py-3">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BrainCircuitIcon className="w-8 h-8 text-jarvis-primary" />
                        <h1 className="text-xl font-bold text-jarvis-primary">Jarvis AI</h1>
                        {currentFile && <span className="text-sm text-jarvis-text-secondary hidden md:block">| Lavorando su: {currentFile.name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleNewReport()} className="text-sm px-3 py-1.5 rounded-md hover:bg-jarvis-bg">Nuovo Report</button>
                        <button onClick={handleOpenArchive} className="text-sm px-3 py-1.5 rounded-md hover:bg-jarvis-bg">Archivio Drive</button>
                        <button onClick={handleOpenKnowledgeBase} className="text-sm px-3 py-1.5 rounded-md hover:bg-jarvis-bg">Conoscenza</button>
                        {isLoggedIn ? (
                            <button onClick={handleLogout} className="bg-red-500/20 text-red-400 text-sm px-3 py-1.5 rounded-md hover:bg-red-500/30">Logout</button>
                        ) : (
                            <button onClick={handleLogin} className="bg-jarvis-primary/80 text-white text-sm px-3 py-1.5 rounded-md hover:bg-jarvis-primary">Login con Google</button>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    onAddSource={handleAddSource}
                />
                <ReportView report={report} onSave={handleSaveReport} isLoggedIn={isLoggedIn} />
            </main>

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
                    <p>{error}</p>
                    <button onClick={() => setError(null)} className="absolute top-1 right-2 text-white font-bold">&times;</button>
                </div>
            )}
            
            <ArchiveModal 
                isOpen={isArchiveOpen}
                onClose={() => setIsArchiveOpen(false)}
                reports={driveFiles}
                onLoad={handleLoadReport}
                onDelete={handleDeleteReport}
                onRefresh={handleRefreshArchive}
            />

            <KnowledgeBaseModal
                isOpen={isKnowledgeBaseOpen}
                onClose={() => setIsKnowledgeBaseOpen(false)}
                sources={knowledgeSources}
                onDelete={handleDeleteSource}
                onRefresh={handleRefreshKnowledgeBase}
            />
        </div>
    );
};

export default App;
