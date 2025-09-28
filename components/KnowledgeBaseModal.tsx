// Fix: This file was empty. Implemented the KnowledgeBaseModal component.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KnowledgeSource } from '../types';
import * as backendService from '../services/backendService';
import {
  TrashIcon,
  SpinnerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
} from './icons';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusIcons: Record<KnowledgeSource['status'], React.ReactNode> = {
  processing: <SpinnerIcon className="w-5 h-5 text-yellow-400" />,
  ready: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
  pending: <SpinnerIcon className="w-5 h-5 text-gray-400" />,
  error: <ExclamationCircleIcon className="w-5 h-5 text-red-400" />,
};

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [newWebUrl, setNewWebUrl] = useState('');
  const [newWebTitle, setNewWebTitle] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSources = await backendService.listKnowledgeSources();
      setSources(fetchedSources);
    } catch (e) {
      setError("Impossibile caricare le fonti di conoscenza.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSources();
      // Poll for status updates
      const interval = setInterval(fetchSources, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchSources]);

  const handleDelete = async (sourceId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa fonte di conoscenza?')) {
      try {
        await backendService.deleteKnowledgeSource(sourceId);
        setSources(prev => prev.filter(s => s.id !== sourceId));
      } catch (e) {
        alert("Errore durante l'eliminazione.");
      }
    }
  };
  
  const handleAddWebSource = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newWebUrl.trim() || !newWebTitle.trim()) {
          alert("Per favore, inserisci sia l'URL che il titolo.");
          return;
      }
      try {
          await backendService.addWebKnowledgeSource(newWebUrl, newWebTitle);
          setNewWebUrl('');
          setNewWebTitle('');
          fetchSources(); // Refresh list
      } catch (e) {
          alert("Errore durante l'aggiunta della fonte web.");
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setNewFile(e.target.files[0]);
    }
  };

  const handleAddFileSource = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newFile) {
          alert("Per favore, seleziona un file.");
          return;
      }
       try {
          await backendService.addFileKnowledgeSource(newFile);
          setNewFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          fetchSources(); // Refresh list
      } catch (e) {
          alert("Errore durante l'aggiunta del file.");
      }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-jarvis-bg/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-jarvis-surface w-full max-w-3xl rounded-lg shadow-xl p-6 m-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-jarvis-primary">Knowledge Base</h2>
          <button onClick={fetchSources} className="text-sm text-jarvis-secondary hover:text-jarvis-primary">Aggiorna</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-jarvis-text/10">
          <form onSubmit={handleAddWebSource}>
              <h3 className="font-semibold text-jarvis-text mb-2">Aggiungi Pagina Web</h3>
              <div className="space-y-2">
                  <input type="text" value={newWebTitle} onChange={e => setNewWebTitle(e.target.value)} placeholder="Titolo (es. INAIL Rischio Elettrico)" className="w-full bg-jarvis-bg p-2 rounded-md border border-jarvis-text/10 focus:outline-none focus:ring-1 focus:ring-jarvis-primary"/>
                  <input type="url" value={newWebUrl} onChange={e => setNewWebUrl(e.target.value)} placeholder="URL" className="w-full bg-jarvis-bg p-2 rounded-md border border-jarvis-text/10 focus:outline-none focus:ring-1 focus:ring-jarvis-primary"/>
              </div>
              <button type="submit" className="mt-2 w-full px-4 py-2 bg-jarvis-primary/20 text-jarvis-primary rounded-md hover:bg-jarvis-primary/30">Aggiungi Web</button>
          </form>
           <form onSubmit={handleAddFileSource}>
              <h3 className="font-semibold text-jarvis-text mb-2">Aggiungi Documento</h3>
               <div className="flex items-center gap-2 bg-jarvis-bg p-2 rounded-md border border-jarvis-text/10">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="w-full text-sm text-jarvis-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-jarvis-primary/20 file:text-jarvis-primary hover:file:bg-jarvis-primary/30"/>
               </div>
              <button type="submit" className="mt-2 w-full px-4 py-2 bg-jarvis-primary/20 text-jarvis-primary rounded-md hover:bg-jarvis-primary/30 disabled:opacity-50" disabled={!newFile}>Aggiungi File</button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading && sources.length === 0 ? (
            <p className="text-center text-jarvis-text-secondary py-10">Caricamento...</p>
          ) : error ? (
            <p className="text-center text-red-400 py-10">{error}</p>
          ) : sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map(source => (
                <div key={source.id} className="bg-jarvis-bg/50 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {source.type === 'web' ? <GlobeAltIcon className="w-5 h-5 text-jarvis-secondary flex-shrink-0" /> : <DocumentTextIcon className="w-5 h-5 text-jarvis-secondary flex-shrink-0" />}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-jarvis-text truncate">{source.title}</p>
                      <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-jarvis-text-secondary hover:underline truncate block">{source.uri}</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span title={source.status}>{statusIcons[source.status]}</span>
                    <button onClick={() => handleDelete(source.id)} className="p-2 text-jarvis-text-secondary hover:bg-red-500/20 hover:text-red-400 rounded-full" title="Elimina">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-jarvis-text-secondary py-10">Nessuna fonte di conoscenza aggiunta.</p>
          )}
        </div>
        <div className="mt-6 text-right">
          <button onClick={onClose} className="px-6 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary">Chiudi</button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;
