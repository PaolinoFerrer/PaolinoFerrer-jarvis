import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KnowledgeSource } from '../types';
import * as apiClient from '../services/apiClient';
import {
  TrashIcon,
  SpinnerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  SearchIcon,
  PlusIcon
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

  // State for assisted search
  const [searchTopic, setSearchTopic] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{title: string, uri: string}[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);


  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSources = await apiClient.listKnowledgeSources();
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
      // Optional: Polling to see source status updates
      // const interval = setInterval(fetchSources, 5000); 
      // return () => clearInterval(interval);
    }
  }, [isOpen, fetchSources]);

  const handleDelete = async (sourceId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa fonte di conoscenza?')) {
      try {
        await apiClient.deleteKnowledgeSource(sourceId);
        setSources(prev => prev.filter(s => s.id !== sourceId));
      } catch (e) {
        alert("Errore durante l'eliminazione.");
      }
    }
  };
  
  const handleAddWebSource = async (e: React.FormEvent, url?: string, title?: string) => {
      e.preventDefault();
      const finalUrl = url || newWebUrl;
      const finalTitle = title || newWebTitle;

      if (!finalUrl.trim() || !finalTitle.trim()) {
          alert("Per favore, inserisci sia l'URL che il titolo.");
          return;
      }
      try {
          await apiClient.addWebKnowledgeSource(finalUrl, finalTitle);
          setNewWebUrl('');
          setNewWebTitle('');
          setSearchResults(prev => prev.filter(r => r.uri !== finalUrl));
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
          await apiClient.addFileKnowledgeSource(newFile);
          setNewFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          fetchSources(); // Refresh list
      } catch (e) {
          alert("Errore durante l'aggiunta del file.");
      }
  };

  const handleSearchSources = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTopic.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);
    setSearchPerformed(true);
    try {
        const results = await apiClient.findWebSources(searchTopic);
        setSearchResults(results);
    } catch (e) {
        console.error("Error during source search:", e);
        setSearchError("Si è verificato un errore durante la ricerca. Riprova.");
    } finally {
        setIsSearching(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-jarvis-bg/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-jarvis-surface w-full max-w-4xl rounded-lg shadow-xl p-6 m-4 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-jarvis-primary">Base di Conoscenza</h2>
          <button onClick={fetchSources} className="text-sm text-jarvis-secondary hover:text-jarvis-primary">Aggiorna Elenco</button>
        </div>

        {/* --- ADD SOURCES AREA --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4 pb-4 border-b border-jarvis-text/10">
          
          {/* Assisted Search */}
          <div className="space-y-3">
            <h3 className="font-semibold text-jarvis-text">Ricerca Assistita Fonti</h3>
            <form onSubmit={handleSearchSources} className="flex gap-2">
                <input type="text" value={searchTopic} onChange={e => setSearchTopic(e.target.value)} placeholder="Es: normativa antincendio" className="flex-1 bg-jarvis-bg p-2 rounded-md border border-jarvis-text/10 focus:outline-none focus:ring-1 focus:ring-jarvis-primary"/>
                <button type="submit" disabled={isSearching} className="p-2 bg-jarvis-primary/20 text-jarvis-primary rounded-md hover:bg-jarvis-primary/30 disabled:opacity-50">
                    {isSearching ? <SpinnerIcon className="w-5 h-5"/> : <SearchIcon className="w-5 h-5"/>}
                </button>
            </form>
             <div className="pt-2 min-h-[5rem] max-h-40 overflow-y-auto">
                {isSearching ? (
                    <div className="flex items-center justify-center h-full text-jarvis-text-secondary">
                        <SpinnerIcon className="w-5 h-5 mr-2" />
                        <span>Ricerca in corso...</span>
                    </div>
                ) : searchError ? (
                    <div className="flex items-center justify-center h-full text-red-400">
                        <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                        <span>{searchError}</span>
                    </div>
                ) : searchPerformed && searchResults.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-jarvis-text-secondary">
                        <span>Nessun risultato trovato.</span>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="space-y-2">
                        {searchResults.map((result, i) => (
                            <div key={i} className="bg-jarvis-bg/50 p-2 rounded-md flex justify-between items-center gap-2">
                                <div className="overflow-hidden">
                                    <p className="text-sm font-semibold truncate" title={result.title}>{result.title}</p>
                                    <a href={result.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-jarvis-text-secondary hover:underline truncate block">{result.uri}</a>
                                </div>
                                <button onClick={(e) => handleAddWebSource(e, result.uri, result.title)} className="p-1.5 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/30 flex-shrink-0" title="Aggiungi alla conoscenza">
                                    <PlusIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
          </div>

          {/* Manual Add */}
          <div className="space-y-3">
            <h3 className="font-semibold text-jarvis-text">Aggiunta Manuale</h3>
             <form onSubmit={handleAddWebSource} className="space-y-2">
                <input type="text" value={newWebTitle} onChange={e => setNewWebTitle(e.target.value)} placeholder="Titolo Pagina Web" className="w-full bg-jarvis-bg p-2 rounded-md border border-jarvis-text/10 focus:outline-none focus:ring-1 focus:ring-jarvis-primary"/>
                <input type="url" value={newWebUrl} onChange={e => setNewWebUrl(e.target.value)} placeholder="URL Pagina Web" className="w-full bg-jarvis-bg p-2 rounded-md border border-jarvis-text/10 focus:outline-none focus:ring-1 focus:ring-jarvis-primary"/>
                <button type="submit" className="w-full px-4 py-2 bg-jarvis-primary/20 text-jarvis-primary rounded-md hover:bg-jarvis-primary/30 text-sm">Aggiungi Web Manualmente</button>
            </form>
             <form onSubmit={handleAddFileSource} className="space-y-2">
                <div className="flex items-center gap-2 bg-jarvis-bg p-1 rounded-md border border-jarvis-text/10">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="w-full text-sm text-jarvis-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-jarvis-primary/20 file:text-jarvis-primary hover:file:bg-jarvis-primary/30"/>
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-jarvis-primary/20 text-jarvis-primary rounded-md hover:bg-jarvis-primary/30 text-sm disabled:opacity-50" disabled={!newFile}>Aggiungi File</button>
            </form>
          </div>
        </div>


        {/* --- SOURCES LIST --- */}
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