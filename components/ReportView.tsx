import React from 'react';
import { Report } from '../types.ts';
// FIX: Import SaveIcon from the central icons file
import { DownloadIcon, SaveIcon } from './icons.tsx';

interface ReportViewProps {
  report: Report;
  onSave: () => void;
  isLoggedIn: boolean;
}

const getRiskColor = (level: number) => {
  if (level >= 8) return 'bg-red-500/20 text-red-400 border-red-500/50';
  if (level >= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  return 'bg-green-500/20 text-green-400 border-green-500/50';
};

const ReportView: React.FC<ReportViewProps> = ({ report, onSave, isLoggedIn }) => {

  const handleExport = () => {
    let content = `Documento di Valutazione del Rischio - ${new Date().toLocaleString('it-IT')}\n\n`;
    report.forEach(section => {
      content += `========================================\n`;
      content += `SEZIONE: ${section.title.toUpperCase()}\n`;
      content += `========================================\n\n`;
      if (!section.findings || section.findings.length === 0) {
        content += `Nessun rilievo in questa sezione.\n\n`;
      } else {
        section.findings.forEach((finding, index) => {
          content += `RILIEVO #${index + 1}\n`;
          content += `----------------------------------------\n`;
          content += `Descrizione: ${finding.description}\n`;
          content += `Pericolo Identificato: ${finding.hazard}\n`;
          content += `Livello di Rischio: ${finding.riskLevel}/10\n`;
          content += `Normativa di Riferimento: ${finding.regulation}\n`;
          content += `Azione Correttiva Raccomandata: ${finding.recommendation}\n`;
          if (finding.photo && finding.photo.analysis) {
            content += `Analisi Foto: ${finding.photo.analysis}\n`;
          }
          content += `\n`;
        });
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-sicurezza-jarvis-${Date.now()}.txt`;
    
    // FIX: More robust download trigger for all browsers/devices
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
  };

  const isReportEmpty = report.length === 0 || report.every(s => !s.findings || s.findings.length === 0);
  const isSaveDisabled = isReportEmpty || !isLoggedIn;

  return (
    <div className="bg-jarvis-surface rounded-lg p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-jarvis-primary">Report in Tempo Reale</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSave}
            disabled={isSaveDisabled}
            title={!isLoggedIn ? "Accedi con Google per salvare" : "Salva su Google Drive"}
            className="flex items-center gap-2 bg-jarvis-primary/20 text-jarvis-primary px-4 py-2 rounded-lg hover:bg-jarvis-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SaveIcon className="w-5 h-5" />
            Salva su Drive
          </button>
          <button 
            onClick={handleExport}
            disabled={isReportEmpty}
            className="flex items-center gap-2 bg-jarvis-primary/20 text-jarvis-primary px-4 py-2 rounded-lg hover:bg-jarvis-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DownloadIcon className="w-5 h-5" />
            Esporta
          </button>
        </div>
      </div>
      <div className="space-y-8">
        {report.length === 0 ? (
          <div className="text-center text-jarvis-text-secondary py-10">
            <p>Il report è vuoto.</p>
            <p>Inizia la conversazione per aggiungere rilievi.</p>
          </div>
        ) : (
          report.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xl font-semibold border-b-2 border-jarvis-primary/30 pb-2 mb-4 text-jarvis-secondary">{section.title}</h3>
              {(!section.findings || section.findings.length === 0) ? (
                <p className="text-jarvis-text-secondary italic">Nessun rilievo per questa sezione.</p>
              ) : (
                <div className="space-y-4">
                  {section.findings.map((finding) => (
                    <div key={finding.id} className="bg-jarvis-bg/50 rounded-lg p-4 border border-jarvis-text/10">
                      <div className={`font-bold mb-2 flex justify-between items-center border-b border-jarvis-text/10 pb-2`}>
                          <p>{finding.hazard}</p>
                          <span className={`px-3 py-1 text-sm rounded-full border ${getRiskColor(finding.riskLevel)}`}>
                            Rischio: {finding.riskLevel}/10
                          </span>
                      </div>
                      <p className="text-jarvis-text-secondary mb-2"><strong className="text-jarvis-text">Descrizione:</strong> {finding.description}</p>
                      <p className="text-jarvis-text-secondary mb-2"><strong className="text-jarvis-text">Normativa:</strong> {finding.regulation}</p>
                      <p className="text-jarvis-text-secondary mb-3"><strong className="text-jarvis-text">Raccomandazione:</strong> {finding.recommendation}</p>
                      {finding.photo && (
                         <div className="mt-4 border-t border-jarvis-text/10 pt-3">
                           <p className="text-jarvis-text-secondary mb-2"><strong className="text-jarvis-text">Analisi Foto:</strong> {finding.photo.analysis}</p>
                           {finding.photo.base64 && <img src={finding.photo.base64} alt="Foto del rilievo" className="rounded-lg max-h-48 w-auto" />}
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportView;
