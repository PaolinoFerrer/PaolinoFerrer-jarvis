import React from 'react';
import { Report, Workplace, Task, Finding } from '../types';
import ImprovementPlan from './ImprovementPlan';
import { SaveIcon, DownloadIcon } from './icons';

interface ReportViewProps {
  report: Report;
  onSave: () => void;
  isLoggedIn: boolean;
}

const getRiskPresentation = (level: number): { color: string; bgColor: string; borderColor: string } => {
  if (level >= 8) return { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' };
  if (level >= 5) return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' };
  return { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' };
};

const Methodology: React.FC = () => (
    <details className="bg-jarvis-bg/50 rounded-lg p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-jarvis-text">Metodologia di Valutazione del Rischio</summary>
        <div className="mt-3 pt-3 border-t border-jarvis-text/10 text-jarvis-text-secondary space-y-2 text-xs">
            <p>Il livello di rischio (1-10) è calcolato con la formula non-lineare:</p>
            <p className="font-mono bg-jarvis-bg p-2 rounded-md text-center text-jarvis-text">Rischio = (Danno Potenziale)² × Probabilità di Accadimento × Frequenza di Esposizione</p>
            <p>Questa formula dà un peso maggiore alla gravità potenziale di un incidente. I valori (da 1 a 4) per D, P, e F sono stimati dall'IA in base alla descrizione fornita.</p>
        </div>
    </details>
);

const FindingCard: React.FC<{ finding: Finding }> = ({ finding }) => {
    const riskPresentation = getRiskPresentation(finding.riskLevel);
    const rawRisk = finding.damage * finding.damage * finding.probability * finding.exposure;

    return (
        <div className={`border ${riskPresentation.borderColor} ${riskPresentation.bgColor} rounded-lg p-4`}>
            <div className="flex justify-between items-start gap-4">
                <h5 className="font-bold text-jarvis-text">{finding.hazard}</h5>
                <div className={`text-center flex-shrink-0 ml-4 px-3 py-1 rounded-full text-sm font-bold ${riskPresentation.bgColor} border ${riskPresentation.borderColor} ${riskPresentation.color}`}>
                    Rischio: {finding.riskLevel}/10
                </div>
            </div>
            
             <div className="mt-2 text-xs text-jarvis-text-secondary font-mono bg-jarvis-bg/50 p-2 rounded-md">
                 Calcolo: D{finding.damage}² × P{finding.probability} × F{finding.exposure} = {rawRisk}
             </div>

            <div className="mt-4 space-y-2 text-sm text-jarvis-text-secondary">
                <p><strong className="text-jarvis-text/80 font-semibold">Descrizione:</strong> {finding.description}</p>
                <p><strong className="text-jarvis-text/80 font-semibold">Normativa:</strong> {finding.regulation}</p>
                <p><strong className="text-jarvis-text/80 font-semibold">Raccomandazione:</strong> {finding.recommendation}</p>
            </div>
        </div>
    );
};


const TaskSection: React.FC<{ task: Task }> = ({ task }) => (
    <div className="mt-4">
        <h4 className="font-semibold text-jarvis-text">{task.name} ({task.findings.length} rilievi)</h4>
        {task.requiredDpi.length > 0 && (
            <div className="text-xs text-jarvis-text-secondary mt-1">
                <strong>DPI Obbligatori: </strong>{task.requiredDpi.map(d => d.name).join(', ')}
            </div>
        )}
        {task.findings.length > 0 ? (
             <div className="mt-3 space-y-3">
                {task.findings.map(finding => <FindingCard key={finding.id} finding={finding} />)}
             </div>
        ) : (
             <p className="text-sm text-jarvis-text-secondary italic mt-2">Nessun rilievo per questa mansione.</p>
        )}
    </div>
);

const WorkplaceSection: React.FC<{ workplace: Workplace }> = ({ workplace }) => (
    <div className="bg-jarvis-surface p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-jarvis-primary border-b border-jarvis-primary/20 pb-2">
            Luogo: {workplace.name}
        </h3>
        {workplace.tasks.length > 0 ? (
            <div className="space-y-4 mt-2">
                {workplace.tasks.map(task => <TaskSection key={task.id} task={task} />)}
            </div>
        ) : (
            <p className="text-sm text-jarvis-text-secondary italic mt-2">Nessuna mansione definita per questo ambiente.</p>
        )}
    </div>
);


const ReportView: React.FC<ReportViewProps> = ({ report, onSave, isLoggedIn }) => {
  const hasContent = report && report.length > 0;

  const downloadTxtFile = () => {
    let content = `DOCUMENTO DI VALUTAZIONE DEL RISCHIO (DVR)\n`;
    content += `=============================================\n\n`;

    report.forEach(workplace => {
        content += `LUOGO DI LAVORO: ${workplace.name}\n`;
        content += `-------------------------------------------------\n\n`;
        workplace.tasks.forEach(task => {
            content += `  MANSIONE: ${task.name}\n\n`;
            if (task.requiredDpi.length > 0) {
                 content += `  DPI OBBLIGATORI: ${task.requiredDpi.map(d => d.name).join(', ')}\n\n`;
            }
            task.findings.forEach(finding => {
                const rawRisk = finding.damage * finding.damage * finding.probability * finding.exposure;
                content += `    PERICOLO: ${finding.hazard}\n`;
                content += `      - Livello Rischio: ${finding.riskLevel}/10\n`;
                content += `      - Calcolo: Danno ${finding.damage}² × Probabilità ${finding.probability} × Frequenza ${finding.exposure} = ${rawRisk}\n`;
                content += `      - Descrizione: ${finding.description}\n`;
                content += `      - Normativa: ${finding.regulation}\n`;
                content += `      - Raccomandazione: ${finding.recommendation}\n\n`;
            });
        });
    });

    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `report-dvr-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
        <header className="p-4 border-b border-jarvis-text/10 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold text-jarvis-text">Report in Tempo Reale</h2>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onSave}
                    disabled={!isLoggedIn || !hasContent}
                    className="flex items-center gap-2 px-4 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary disabled:bg-jarvis-text-secondary disabled:cursor-not-allowed transition-colors text-sm"
                    title={!isLoggedIn ? "Accedi per salvare" : "Salva su Database"}
                >
                    <SaveIcon className="w-4 h-4" />
                    Salva
                </button>
                 <button
                    onClick={downloadTxtFile}
                    disabled={!hasContent}
                    className="flex items-center gap-2 p-2 text-jarvis-text-secondary rounded-full hover:bg-jarvis-bg disabled:opacity-50"
                    title="Esporta come .txt"
                 >
                     <DownloadIcon className="w-5 h-5"/>
                 </button>
            </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
            {hasContent ? (
                <div className="space-y-6">
                    <Methodology />
                    {report.map(workplace => (
                        <WorkplaceSection key={workplace.id} workplace={workplace} />
                    ))}
                    <ImprovementPlan report={report} />
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-jarvis-text-secondary">
                    <div className="bg-jarvis-bg p-8 rounded-full mb-4">
                       <svg xmlns="http://www.w.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-jarvis-text">Il report è vuoto</h3>
                    <p className="max-w-md mt-1">Inizia a descrivere un ambiente di lavoro o un potenziale rischio nella chat. I rilievi che aggiungerai compariranno qui.</p>
                </div>
            )}
        </main>
    </div>
  );
};

export default ReportView;