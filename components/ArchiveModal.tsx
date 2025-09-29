import React from 'react';
import { DriveFile } from '../types.ts';
import { TrashIcon } from './icons.tsx';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DriveFile[];
  onLoad: (file: DriveFile) => void;
  onDelete: (fileId: string) => void;
  onRefresh: () => void;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, reports, onLoad, onDelete, onRefresh }) => {
  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (window.confirm('Sei sicuro di voler eliminare questo report da Google Drive? L\'azione è irreversibile.')) {
      onDelete(reportId);
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
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-jarvis-primary">Archivio Google Drive</h2>
            <button onClick={onRefresh} className="text-jarvis-secondary hover:text-jarvis-primary">Aggiorna</button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="bg-jarvis-bg/50 rounded-lg p-4 flex items-center justify-between hover:bg-jarvis-bg transition-colors">
                  <div>
                    <p className="font-semibold text-jarvis-text">{report.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onLoad(report)}
                      className="px-4 py-2 bg-jarvis-primary/20 text-jarvis-primary rounded-md hover:bg-jarvis-primary/30"
                    >
                      Carica
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, report.id)}
                      className="p-2 text-jarvis-text-secondary hover:bg-red-500/20 hover:text-red-400 rounded-full"
                      title="Elimina report"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-jarvis-text-secondary py-10">Nessun report trovato nel tuo Google Drive.</p>
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

export default ArchiveModal;