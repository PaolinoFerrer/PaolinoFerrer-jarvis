import React from 'react';
import { KnowledgeSource } from '../types.ts';
import { TrashIcon } from './icons.tsx';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: KnowledgeSource[];
  onDelete: (sourceId: string) => void;
  onRefresh: () => void;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose, sources, onDelete, onRefresh }) => {
  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    if (window.confirm('Sei sicuro di voler rimuovere questa fonte dalla base di conoscenza di Jarvis?')) {
      onDelete(sourceId);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-jarvis-bg/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-jarvis-surface w-full max-w-3xl rounded-lg shadow-xl p-6 m-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-jarvis-primary">Base di Conoscenza</h2>
            <button onClick={onRefresh} className="text-jarvis-secondary hover:text-jarvis-primary">Aggiorna</button>
        </div>
        <p className="text-jarvis-text-secondary mb-4 text-sm">
            Queste sono le fonti che Jarvis utilizzerà per fornire risposte più accurate e contestualizzate.
            Puoi aggiungere nuove fonti dai suggerimenti che appaiono nella chat dopo una ricerca web.
        </p>
        <div className="flex-1 overflow-y-auto pr-2 border-t border-jarvis-text/10 pt-4">
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map(source => (
                <div key={source.id} className="bg-jarvis-bg/50 rounded-lg p-4 flex items-center justify-between hover:bg-jarvis-bg transition-colors">
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-jarvis-text truncate" title={source.title}>{source.title}</p>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-jarvis-secondary hover:underline truncate block" title={source.uri}>
                        {source.uri}
                    </a>
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
