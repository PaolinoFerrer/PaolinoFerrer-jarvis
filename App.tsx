import React, { useState, useEffect, useCallback } from 'react';
import { ChatMessage, Report, User, DriveFile, KnowledgeSource } from './types';
import ChatInterface from './components/ChatInterface';
import ReportView from './components/ReportView';
import UserMenu from './components/UserMenu';
import ArchiveModal from './components/ArchiveModal';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import * as apiClient from './services/apiClient';
import { LogoIcon } from './components/icons';


const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init',
            role: 'model',
            text: 'Buongiorno! Sono Jarvis, il tuo assistente per la sicurezza sul lavoro. Descrivi un ambiente, una mansione o un potenziale rischio per iniziare. Puoi anche allegare una foto.'
        }
    ]);
    const [report, setReport] = useState<Report>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Auth state
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    
    // Google Drive state
    const [isLoggedInToDrive, setIsLoggedInToDrive] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    
    // Knowledge Base state
    const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
    const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);

    // --- Effects ---

    useEffect(() => {
        // Initialize user auth
        const allUsers = apiClient.getMockUsers();
        setUsers(allUsers);
        const user = apiClient.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        } else if (allUsers.length > 0) {
            const defaultUser = apiClient.login(allUsers[0].id);
            setCurrentUser(defaultUser);
        }

        // Initialize Google Drive auth
        setIsLoggedInToDrive(apiClient.isDriveSignedIn());
    }, []);
    
    // Effect to fetch knowledge base when modal is opened by an admin
    useEffect(() => {
        const fetchKb = async () => {
            if (isKnowledgeBaseOpen && currentUser?.role === 'admin') {
                const sources = await apiClient.listKnowledgeSources();
                setKnowledgeSources(sources);
            }
        };
        fetchKb();
    }, [isKnowledgeBaseOpen, currentUser]);


    // --- Handlers ---
    const handleSendMessage = useCallback(async (text: string, file?: File) => {
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: text,
            photo: file ? URL.createObjectURL(file) : undefined,
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        // RAG Step 1: Search Knowledge Base
        const knowledgeContext = await apiClient.searchKnowledgeBase(text);
        
        // RAG Step 2: Send context and prompt to Gemini
        const geminiResult = await apiClient.generateResponse(report, text, file, knowledgeContext);

        const modelMessage: ChatMessage = {
            id: `model-${Date.now()}`,
            role: 'model',
            text: geminiResult.chatResponse,
            sources: geminiResult.sources, // Show sources to all users now
        };

        setReport(geminiResult.reportUpdate);
        setMessages(prev => [...prev, modelMessage]);
        setIsLoading(false);

    }, [report, currentUser]);

    const handleLoginDrive = async () => {
        await apiClient.signInToDrive();
        setIsLoggedInToDrive(true);
        handleOpenArchive();
    };

    const handleSaveReport = useCallback(async () => {
        if (report.length === 0) {
            alert("Il report è vuoto. Aggiungi almeno un rilievo prima di salvare.");
            return;
        }
        try {
            const savedFile = await apiClient.saveReport(report);
            alert(`Report salvato con successo come "${savedFile.name}"`);
            await handleRefreshArchive();
        } catch (error) {
            console.error("Failed to save report:", error);
            alert("Errore durante il salvataggio del report.");
        }
    }, [report]);

    const handleRefreshArchive = useCallback(async () => {
        try {
            const files = await apiClient.listReports();
            setDriveFiles(files);
        } catch (error) {
            console.error("Failed to list reports:", error);
            alert("Errore nel caricare i report da Google Drive.");
        }
    }, []);
    
    const handleOpenArchive = useCallback(async () => {
        if (!isLoggedInToDrive) {
             if (window.confirm("Per usare l'archivio, devi accedere con il tuo account Google. Vuoi accedere ora?")) {
                await handleLoginDrive();
             }
             return;
        }
        await handleRefreshArchive();
        setIsArchiveOpen(true);
    }, [isLoggedInToDrive, handleRefreshArchive]);

    const handleLoadReport = useCallback(async (file: DriveFile) => {
        if (!window.confirm(`Sei sicuro di voler caricare il report "${file.name}"? Le modifiche attuali andranno perse.`)) {
            return;
        }
        try {
            const loadedReport = await apiClient.loadReport(file.id);
            setReport(loadedReport);
            setMessages([
                 {
                    id: 'init-load',
                    role: 'model',
                    text: `Report "${file.name}" caricato con successo. Puoi continuare ad aggiungere rilievi.`
                }
            ]);
            setIsArchiveOpen(false);
        } catch (error) {
            console.error("Failed to load report:", error);
            alert("Errore durante il caricamento del report.");
        }
    }, []);

    const handleDeleteReport = useCallback(async (fileId: string) => {
        try {
            await apiClient.deleteReport(fileId);
            alert("Report eliminato con successo.");
            await handleRefreshArchive();
        } catch (error) {
            console.error("Failed to delete report:", error);
            alert("Errore durante l'eliminazione del report.");
        }
    }, [handleRefreshArchive]);

    const handleSwitchUser = (userId: string) => {
        const user = apiClient.login(userId);
        setCurrentUser(user);
    };

    const handleLogout = () => {
        apiClient.logout();
        setCurrentUser(null);
        const allUsers = apiClient.getMockUsers();
         if (allUsers.length > 0) {
            setCurrentUser(apiClient.login(allUsers[0].id));
         }
    };


    return (
        <div className="bg-jarvis-bg min-h-screen text-jarvis-text font-sans flex flex-col p-4 lg:p-6">
            <header className="flex justify-between items-center mb-4 flex-shrink-0 px-2">
                <div className="flex items-center gap-3">
                    <LogoIcon className="w-8 h-8" />
                    <h1 className="text-2xl font-bold text-jarvis-text">Jarvis DVR</h1>
                </div>
                <div className="flex items-center gap-4">
                    {currentUser?.role === 'admin' && (
                        <button onClick={() => setIsKnowledgeBaseOpen(true)} className="text-sm text-jarvis-text-secondary hover:text-jarvis-primary transition-colors">
                            Base di Conoscenza
                        </button>
                    )}
                    <button onClick={handleOpenArchive} className="text-sm text-jarvis-text-secondary hover:text-jarvis-primary transition-colors">
                        Archivio
                    </button>
                    {currentUser && <UserMenu currentUser={currentUser} users={users} onSwitchUser={handleSwitchUser} onLogout={handleLogout} />}
                </div>
            </header>
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-0">
                <ChatInterface 
                    messages={messages} 
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading} 
                />
                <ReportView 
                    report={report}
                    onSave={handleSaveReport}
                    isLoggedIn={isLoggedInToDrive}
                />
            </main>
            <ArchiveModal 
                isOpen={isArchiveOpen}
                onClose={() => setIsArchiveOpen(false)}
                reports={driveFiles}
                onLoad={handleLoadReport}
                onDelete={handleDeleteReport}
                onRefresh={handleRefreshArchive}
            />
            {currentUser?.role === 'admin' && (
                <KnowledgeBaseModal
                    isOpen={isKnowledgeBaseOpen}
                    onClose={() => setIsKnowledgeBaseOpen(false)}
                />
            )}
        </div>
    );
};

export default App;