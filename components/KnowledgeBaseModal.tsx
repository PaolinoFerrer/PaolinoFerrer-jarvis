
import React, { useState, useRef } from 'react';
import { uploadKnowledgeDocuments } from '../services/jarvisApi.ts';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({ isOpen, onClose }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Per favore, seleziona almeno un file da caricare.");
      return;
    }
    setIsUploading(true);
    try {
      await uploadKnowledgeDocuments(selectedFiles);
      setSelectedFiles(null); // Reset input after upload
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Si è verificato un errore durante il caricamento. (Simulazione)");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-jarvis-bg/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-jarvis-surface w-full max-w-2xl rounded-lg shadow-xl p-6 m-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-jarvis-primary">Base di Conoscenza</h2>
        </div>
        
        <div className="text-jarvis-text-secondary mb-6">
            <p>Arricchisca le competenze di Jarvis caricando documenti e normative. I file verranno elaborati e diventeranno la fonte primaria di informazione per le sue analisi, garantendo risposte sempre aggiornate e basate su fonti da lei approvate.</p>
        </div>

        <div className="bg-jarvis-bg/50 p-4 rounded-lg border border-jarvis-text/10">
            <h3 className="font-semibold text-lg mb-3 text-jarvis-secondary">Carica Nuovi Documenti</h3>
            <div className="flex items-center gap-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.json"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-jarvis-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-jarvis-primary file:text-white hover:file:bg-jarvis-secondary"
                />
                <button
                    onClick={handleUpload}
                    disabled={!selectedFiles || isUploading}
                    className="px-6 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary disabled:opacity-50 disabled:cursor-wait"
                >
                    {isUploading ? 'Caricamento...' : 'Carica'}
                </button>
            </div>
        </div>
        
        <div className="mt-6 flex-1 overflow-y-auto pr-2 border-t border-jarvis-text/10 pt-4">
             <h3 className="font-semibold text-lg mb-3 text-jarvis-secondary">Documenti Caricati</h3>
             <p className="text-center text-jarvis-text-secondary py-8 italic">
                (La lista dei documenti caricati e il loro stato di elaborazione apparirà qui nella prossima versione)
             </p>
        </div>


        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-jarvis-primary/50 text-white rounded-lg hover:bg-jarvis-primary/80"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;
