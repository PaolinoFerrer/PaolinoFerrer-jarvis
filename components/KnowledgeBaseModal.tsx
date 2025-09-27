import React, { useState } from 'react';
import { KnowledgeSource } from '../types.ts';
import { TrashIcon, WebIcon, FileIcon, UploadIcon, PlusIcon } from './icons.tsx';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: KnowledgeSource[];
  onDelete: (sourceId: string) => void;
  onRefresh: () => void;
  onAddWebSource: (source: { uri: string, title: string }) => void;
  onAddFile: (file: File) => void;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ 
    isOpen, onClose, sources, onDelete, onRefresh, onAddWebSource, onAddFile 
}) => {
  const [webUrl, setWebUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    if (window.confirm('Sei sicuro di voler rimuovere questa fonte dalla base di conoscenza di Jarvis?')) {
      onDelete(sourceId);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (webUrl.trim()) {
      // Simple title extraction from URL
      let title = webUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
      onAddWebSource({ uri: webUrl, title });
      setWebUrl('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddFile = () => {
    if (selectedFile) {
      onAddFile(selectedFile);
      setSelectedFile(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-jarvis-bg/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-jarvis-surface w-full max-w-3xl rounded-lg shadow-xl p-6 m-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-jarvis-primary">Base di Conoscenza</h2>
            <button onClick={onRefresh} className="text-sm text-jarvis-secondary hover:text-jarvis-primary">Aggiorna</button>
        </div>
        
        {/* --- Add Sources Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-jarvis-bg/50 rounded-lg">
          {/* Add Web URL */}
          <form onSubmit={handleAddUrl} className="space-y-2">
            <label className="text-sm font-semibold text-jarvis-text-secondary">Aggiungi fonte Web</label>
            <div className="flex gap-2">
              <input 
                type="url" 
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://esempio.it/normativa"
                className="flex-grow bg-jarvis-bg border border-jarvis-text/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-jarvis-primary"
              />
              <button type="submit" className="p-2 bg-jarvis-primary/80 text-white rounded-md hover:bg-jarvis-primary disabled:opacity-50" disabled={!webUrl.trim()}>
                  <PlusIcon className="w-5 h-5"/>
              </button>
            </div>
          </form>

          {/* Add File */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-jarvis-text-secondary">Carica un file</label>
             <div className="flex gap-2">
                <label htmlFor="kb-file-upload" className="flex-grow cursor-pointer bg-jarvis-bg border border-jarvis-text/10 rounded-md px-3 py-1.5 text-sm text-jarvis-text-secondary hover:border-jarvis-primary truncate">
                    {selectedFile ? selectedFile.name : 'Seleziona un file...'}
                </label>
                <input id="kb-file-upload" type="file" className="hidden" onChange={handleFileChange} />
                <button onClick={handleAddFile} className="p-2 bg-jarvis-primary/80 text-white rounded-md hover:bg-jarvis-primary disabled:opacity-50" disabled={!selectedFile}>
                    <UploadIcon className="w-5 h-5"/>
                </button>
            </div>
          </div>
        </div>

        <p className="text-jarvis-text-secondary mb-4 text-sm border-t border-jarvis-text/10 pt-4">
            Fonti attuali che Jarvis utilizzerà per fornire risposte più accurate e contestualizzate.
        </p>

        {/* --- Sources List --- */}
        <div className="flex-1 overflow-y-auto pr-2">
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map(source => (
                <div key={source.id} className="bg-jarvis-bg/50 rounded-lg p-3 flex items-center justify-between hover:bg-jarvis-bg transition-colors">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    {source.type === 'web' ? <WebIcon className="w-5 h-5 text-jarvis-secondary flex-shrink-0"/> : <FileIcon className="w-5 h-5 text-jarvis-secondary flex-shrink-0"/>}
                    <div className="flex-1 overflow-hidden">
                        <p className="font-semibold text-jarvis-text truncate" title={source.title}>{source.title}</p>
                        {source.type === 'web' && (
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-jarvis-secondary hover:underline truncate block" title={source.uri}>
                                {source.uri}
                            </a>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        source.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                        source.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                        {source.status}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, source.id)}
                      className="p-2 text-jarvis-text-secondary hover:bg-red-500/20 hover:text-red-400 rounded-full"
                      title="Rimuovi fonte"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-jarvis-text-secondary py-10">La base di conoscenza è vuota.</p>
          )}
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;