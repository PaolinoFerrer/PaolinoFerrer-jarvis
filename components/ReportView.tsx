// Fix: Replaced placeholder content with a functional ReportView component.
import React from 'react';
import { Report, Workplace, Task, Finding } from '../types';
import ImprovementPlan from './ImprovementPlan';
import { SaveIcon, DownloadIcon } from './icons';

interface ReportViewProps {
  report: Report;
  onSave: () => void;
  isLoggedIn: boolean;
}

const getRiskColor = (level: number): string => {
  if (level >= 8) return 'text-red-400';
  if (level >= 5) return 'text-yellow-400';
  return 'text-green-400';
};

const FindingRow: React.FC<{ finding: Finding }> = ({ finding }) => (
    <tr className="border-b border-jarvis-text/10 last:border-b-0">
        <td className="p-3 align-top">{finding.description}</td>
        <td className="p-3 align-top">{finding.hazard}</td>
        <td className="p-3 align-top font-bold text-center">
            <span className={getRiskColor(finding.riskLevel)}>
                {finding.riskLevel}
            </span>
        </td>
        <td className="p-3 align-top">{finding.recommendation}</td>
    </tr>
);


const TaskSection: React.FC<{ task: Task }> = ({ task }) => (
    <div className="mt-4 bg-jarvis-bg/50 p-4 rounded-lg">
        <h4 className="font-semibold text-jarvis-text">{task.name}</h4>
        {task.requiredDpi.length > 0 && (
            <div className="text-xs text-jarvis-text-secondary mt-1">
                <strong>DPI: </strong>{task.requiredDpi.map(d => d.name).join(', ')}
            </div>
        )}
        {task.findings.length > 0 ? (
             <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm text-left text-jarvis-text-secondary">
                    <thead className="text-xs text-jarvis-text uppercase bg-jarvis-bg">
                        <tr>
                            <th scope="col" className="p-3 w-1/3">Descrizione Rilievo</th>
                            <th scope="col" className="p-3 w-1/3">Pericolo Identificato</th>
                            <th scope="col" className="p-3 text-center">Livello Rischio</th>
                            <th scope="col" className="p-3 w-1/3">Raccomandazione</th>
                        </tr>
                    </thead>
                    <tbody>
                        {task.findings.map(finding => <FindingRow key={finding.id} finding={finding} />)}
                    </tbody>
                </table>
             </div>
        ) : (
             <p className="text-sm text-jarvis-text-secondary italic mt-2">Nessun rilievo per questa mansione.</p>
        )}
    </div>
);

const WorkplaceSection: React.FC<{ workplace: Workplace }> = ({ workplace }) => (
    <div className="bg-jarvis-surface p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-jarvis-primary border-b border-jarvis-primary/20 pb-2">
            {workplace.name}
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

  return (
    <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
        <header className="p-4 border-b border-jarvis-text/10 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold text-jarvis-text">Anteprima Report DVR</h2>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onSave}
                    disabled={!isLoggedIn || !hasContent}
                    className="flex items-center gap-2 px-4 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary disabled:bg-jarvis-text-secondary disabled:cursor-not-allowed transition-colors text-sm"
                    title={!isLoggedIn ? "Accedi a Google Drive per salvare" : "Salva in Google Drive"}
                >
                    <SaveIcon className="w-4 h-4" />
                    Salva
                </button>
                 {/* Placeholder for future PDF download functionality */}
                 <button
                    disabled={!hasContent}
                    className="flex items-center gap-2 p-2 text-jarvis-text-secondary rounded-full hover:bg-jarvis-bg disabled:opacity-50"
                    title="Scarica PDF (funzione non disponibile)"
                 >
                     <DownloadIcon className="w-5 h-5"/>
                 </button>
            </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
            {hasContent ? (
                <div className="space-y-6">
                    {report.map(workplace => (
                        <WorkplaceSection key={workplace.id} workplace={workplace} />
                    ))}
                    <ImprovementPlan report={report} />
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-jarvis-text-secondary">
                    <div className="bg-jarvis-bg p-8 rounded-full mb-4">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
