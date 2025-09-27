import React from 'react';
import { Report, Workplace, Task } from '../types.ts';
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
    report.forEach(workplace => {
      content += `========================================\n`;
      content += `LUOGO DI LAVORO: ${workplace.name.toUpperCase()}\n`;
      content += `========================================\n\n`;
      if (!workplace.tasks || workplace.tasks.length === 0) {
        content += `Nessuna mansione specificata per questo luogo di lavoro.\n\n`;
      } else {
        workplace.tasks.forEach((task) => {
          content += `  ----------------------------------------\n`;
          content += `  MANSIONE: ${task.name}\n`;
          content += `  ----------------------------------------\n\n`;
          
          content += `  *** RILIEVI DI RISCHIO ***\n`;
          if (!task.findings || task.findings.length === 0) {
             content += `  - Nessun rilievo specifico per questa mansione.\n\n`;
          } else {
            task.findings.forEach((finding, findIndex) => {
              content += `  Rilievo #${findIndex + 1}:\n`;
              content += `    Descrizione: ${finding.description}\n`;
              content += `    Pericolo: ${finding.hazard}\n`;
              content += `    Rischio: ${finding.riskLevel}/10\n`;
              content += `    Normativa: ${finding.regulation}\n`;
              content += `    Raccomandazione: ${finding.recommendation}\n\n`;
            });
          }

          content += `  *** DISPOSITIVI DI PROTEZIONE INDIVIDUALE (DPI) ***\n`;
           if (!task.requiredDpi || task.requiredDpi.length === 0) {
             content += `  - Nessun DPI specifico per questa mansione.\n\n`;
           } else {
              task.requiredDpi.forEach(dpi => {
                content += `  - ${dpi.name}${dpi.notes ? ` (${dpi.notes})` : ''}\n`;
              });
              content += `\n`;
           }
        });
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-sicurezza-jarvis-${Date.now()}.txt`;
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
  };

  const isReportEmpty = report.length === 0 || report.every(w => !w.tasks || w.tasks.length === 0);
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
        {isReportEmpty ? (
          <div className="text-center text-jarvis-text-secondary py-10">
            <p>Il report è vuoto.</p>
            <p>Inizia la conversazione per aggiungere rilievi.</p>
          </div>
        ) : (
          report.map((workplace) => (
            <div key={workplace.id}>
              <h3 className="text-xl font-semibold border-b-2 border-jarvis-primary/30 pb-2 mb-4 text-jarvis-secondary">
                Luogo: {workplace.name}
              </h3>
              {(!workplace.tasks || workplace.tasks.length === 0) ? (
                <p className="text-jarvis-text-secondary italic ml-2">Nessuna mansione specificata.</p>
              ) : (
                <div className="space-y-6 pl-2">
                  {workplace.tasks.map((task) => (
                    <div key={task.id} className="bg-jarvis-bg/30 rounded-lg p-4 border border-jarvis-text/10">
                        <h4 className="text-lg font-semibold text-jarvis-primary mb-3">{task.name}</h4>
                        
                        <div className="space-y-4">
                          {task.findings.map((finding) => (
                            <div key={finding.id} className="bg-jarvis-bg/50 rounded-lg p-3">
                              <div className={`font-bold mb-2 flex justify-between items-center border-b border-jarvis-text/10 pb-2`}>
                                  <p>{finding.hazard}</p>
                                  <span className={`px-3 py-1 text-sm rounded-full border ${getRiskColor(finding.riskLevel)}`}>
                                    Rischio: {finding.riskLevel}/10
                                  </span>
                              </div>
                              <p className="text-sm text-jarvis-text-secondary mb-2"><strong className="text-jarvis-text">Descrizione:</strong> {finding.description}</p>
                              <p className="text-sm text-jarvis-text-secondary mb-2"><strong className="text-jarvis-text">Normativa:</strong> {finding.regulation}</p>
                              <p className="text-sm text-jarvis-text-secondary"><strong className="text-jarvis-text">Raccomandazione:</strong> {finding.recommendation}</p>
                            </div>
                          ))}
                        </div>

                        {task.requiredDpi && task.requiredDpi.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-jarvis-text/10">
                                <h5 className="font-semibold text-jarvis-text-secondary mb-2">DPI Obbligatori:</h5>
                                <ul className="list-disc list-inside text-sm text-jarvis-text-secondary space-y-1">
                                    {task.requiredDpi.map((dpi, i) => <li key={i}>{dpi.name}</li>)}
                                </ul>
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
