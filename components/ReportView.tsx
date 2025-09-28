import React, { useState } from 'react';
// Fix: Removed file extensions from imports.
import { Report, Workplace, Task, Finding } from '../types';
import { DownloadIcon, SaveIcon } from './icons';
import ImprovementPlan from './ImprovementPlan';

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

const calculateRawRisk = (finding: Finding): number => {
    const d = finding.damage > 0 ? finding.damage : 1;
    const p = finding.probability > 0 ? finding.probability : 1;
    const e = finding.exposure > 0 ? finding.exposure : 1;
    return (d * d) * p * e;
};

const MethodologyExplanation: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const factors = [
        { name: 'Danno (D)', description: 'Gravità del potenziale infortunio', scale: ['1: Lieve', '2: Medio', '3: Grave', '4: Gravissimo'] },
        { name: 'Probabilità (P)', description: 'Probabilità che l\'evento accada', scale: ['1: Improbabile', '2: Poco Probabile', '3: Probabile', '4: Molto Probabile'] },
        { name: 'Esposizione (E)', description: 'Frequenza di esposizione al pericolo', scale: ['1: Rara', '2: Occasionale', '3: Frequente', '4: Continua'] },
    ];
    
    const riskTiers = [
        { name: 'BASSO (1-4)', range: 'R ≤ 15', color: 'text-green-400' },
        { name: 'MEDIO (5-7)', range: '15 < R ≤ 70', color: 'text-yellow-400' },
        { name: 'ALTO (8-10)', range: 'R > 70', color: 'text-red-400' },
    ];

    return (
        <div className="mb-4 border border-jarvis-text/10 rounded-lg">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 bg-jarvis-bg/30 hover:bg-jarvis-bg/50 rounded-t-lg"
            >
                <h3 className="font-semibold text-jarvis-text-secondary">Metodologia di Valutazione del Rischio</h3>
                 <svg className={`w-5 h-5 text-jarvis-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="p-4 text-sm bg-jarvis-bg/20 rounded-b-lg">
                    <p className="mb-3 text-jarvis-text-secondary">Il livello di rischio viene calcolato con una formula che dà un peso esponenziale alla gravità del danno potenziale.</p>
                    <div className="text-center font-mono tracking-wider bg-jarvis-bg p-2 rounded-md mb-4">
                        Rischio Grezzo (R) = Danno² &times; Probabilità &times; Esposizione
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {factors.map(factor => (
                            <div key={factor.name}>
                                <p className="font-bold text-jarvis-text">{factor.name}</p>
                                <p className="text-xs text-jarvis-text-secondary mb-1">{factor.description}</p>
                                <ul className="text-xs text-jarvis-text-secondary space-y-0.5">
                                    {factor.scale.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    
                    <div>
                         <p className="font-bold text-jarvis-text mb-1">Fasce di Rischio</p>
                         <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {riskTiers.map(tier => (
                                <p key={tier.name} className={tier.color}>
                                    <strong className="font-semibold">{tier.name}:</strong>
                                    <span className="font-mono ml-1">{tier.range}</span>
                                </p>
                            ))}
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const RiskBadge: React.FC<{ finding: Finding }> = ({ finding }) => {
    const rawRisk = calculateRawRisk(finding);
    return (
        <div className={`text-sm rounded-lg border text-center ${getRiskColor(finding.riskLevel)}`}>
            <p className="font-bold px-3 py-1">Rischio: {finding.riskLevel}/10</p>
            <p className="text-xs border-t border-current opacity-70 px-3 py-0.5 font-mono" title={`Valore grezzo del rischio: ${rawRisk}`}>
                D:{finding.damage}²&times;P:{finding.probability}&times;E:{finding.exposure}={rawRisk}
            </p>
        </div>
    );
};

const ReportView: React.FC<ReportViewProps> = ({ report, onSave, isLoggedIn }) => {

  const handleExport = () => {
    let content = `Documento di Valutazione del Rischio - ${new Date().toLocaleString('it-IT')}\n\n`;
    
    content += `========================================\n`;
    content += `METODOLOGIA DI VALUTAZIONE\n`;
    content += `========================================\n`;
    content += `Formula: Rischio Grezzo = Danno^2 * Probabilità * Esposizione\n`;
    content += `Fasce: BASSO (R <= 15), MEDIO (15 < R <= 70), ALTO (R > 70)\n\n`;
    
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
              const rawRisk = calculateRawRisk(finding);
              content += `  Rilievo #${findIndex + 1}:\n`;
              content += `    Descrizione: ${finding.description}\n`;
              content += `    Pericolo: ${finding.hazard}\n`;
              content += `    Rischio Calcolato: ${finding.riskLevel}/10 (Calcolo: D:${finding.damage}^2 x P:${finding.probability} x E:${finding.exposure} = ${rawRisk})\n`;
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

    const allFindings = report.flatMap(workplace => 
        workplace.tasks.flatMap(task => 
            task.findings.map(finding => ({ ...finding, workplaceName: workplace.name, taskName: task.name }))
        )
    );

    if (allFindings.length > 0) {
        content += `\n\n========================================\n`;
        content += `APPENDICE: PIANO DI MIGLIORAMENTO\n`;
        content += `========================================\n\n`;

        const categorizedFindings = {
            red: allFindings.filter(f => f.riskLevel >= 8).sort((a,b) => b.riskLevel - a.riskLevel),
            yellow: allFindings.filter(f => f.riskLevel >= 5 && f.riskLevel < 8).sort((a,b) => b.riskLevel - a.riskLevel),
            green: allFindings.filter(f => f.riskLevel < 5).sort((a,b) => b.riskLevel - a.riskLevel),
        };

        if (categorizedFindings.red.length > 0) {
            content += `*** RISANAMENTO IMMEDIATO (RISCHIO ALTO) ***\n\n`;
            categorizedFindings.red.forEach(f => {
                content += `- Pericolo: ${f.hazard} (Rischio: ${f.riskLevel}/10)\n`;
                content += `  Luogo: ${f.workplaceName} / ${f.taskName}\n`;
                content += `  Raccomandazione: ${f.recommendation}\n\n`;
            });
        }
        if (categorizedFindings.yellow.length > 0) {
            content += `*** RISANAMENTO RAPIDO (RISCHIO MEDIO) ***\n\n`;
            categorizedFindings.yellow.forEach(f => {
                content += `- Pericolo: ${f.hazard} (Rischio: ${f.riskLevel}/10)\n`;
                content += `  Luogo: ${f.workplaceName} / ${f.taskName}\n`;
                content += `  Raccomandazione: ${f.recommendation}\n\n`;
            });
        }
        if (categorizedFindings.green.length > 0) {
            content += `*** OBIETTIVO DI MIGLIORAMENTO (RISCHIO BASSO) ***\n\n`;
            categorizedFindings.green.forEach(f => {
                content += `- Pericolo: ${f.hazard} (Rischio: ${f.riskLevel}/10)\n`;
                content += `  Luogo: ${f.workplaceName} / ${f.taskName}\n`;
                content += `  Raccomandazione: ${f.recommendation}\n\n`;
            });
        }
    }

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
    <div className="bg-jarvis-surface rounded-lg p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6 gap-4 flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
          {isReportEmpty ? (
            <div className="text-center text-jarvis-text-secondary py-10 h-full flex flex-col justify-center">
              <p>Il report è vuoto.</p>
              <p>Inizia la conversazione per aggiungere rilievi.</p>
            </div>
          ) : (
            <>
              <MethodologyExplanation />
              <div className="space-y-8">
                {report.map((workplace) => (
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
                                    <div className={`font-bold mb-2 flex justify-between items-start gap-4 border-b border-jarvis-text/10 pb-2`}>
                                        <p className="flex-1 pt-1">{finding.hazard}</p>
                                        <RiskBadge finding={finding} />
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
                ))}
              </div>
              <ImprovementPlan report={report} />
            </>
          )}
      </div>
    </div>
  );
};

export default ReportView;