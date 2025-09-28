// Fix: This file was empty. Implementing the ReportView component to display report data.
import React from 'react';
import { Report, Finding } from '../types';
import { SaveIcon, BrainCircuitIcon } from './icons';
import ImprovementPlan from './ImprovementPlan';

const getRiskColor = (level: number): string => {
    if (level >= 8) return 'text-red-500';
    if (level >= 5) return 'text-yellow-500';
    return 'text-green-500';
};

const FindingCard: React.FC<{ finding: Finding }> = ({ finding }) => (
    <div className="bg-jarvis-bg p-4 rounded-lg border border-jarvis-text/10">
        <div className="flex justify-between items-start">
            <p className="font-semibold text-jarvis-text">{finding.description}</p>
            <span className={`font-bold text-lg ${getRiskColor(finding.riskLevel)}`}>
                {finding.riskLevel}/10
            </span>
        </div>
        <div className="mt-3 text-sm text-jarvis-text-secondary space-y-1">
            <p><strong className="text-jarvis-text/80">Pericolo:</strong> {finding.hazard}</p>
            <p><strong className="text-jarvis-text/80">Raccomandazione:</strong> {finding.recommendation}</p>
            <p><strong className="text-jarvis-text/80">Normativa:</strong> {finding.regulation}</p>
            {finding.photo?.analysis && <p><strong className="text-jarvis-text/80">Analisi Foto:</strong> {finding.photo.analysis}</p>}
        </div>
    </div>
);


const ReportView: React.FC<{ report: Report; onSave: () => void; isLoggedIn: boolean }> = ({ report, onSave, isLoggedIn }) => {
    const hasContent = report.length > 0;

    return (
        <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
            <header className="p-4 border-b border-jarvis-text/10 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-jarvis-primary">Documento Valutazione Rischi (DVR)</h2>
                {isLoggedIn && hasContent && (
                     <button 
                        onClick={onSave} 
                        className="flex items-center gap-2 px-4 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary transition-colors text-sm"
                     >
                        <SaveIcon className="w-4 h-4" />
                        Salva su Drive
                    </button>
                )}
            </header>
            
            <div className="flex-1 p-6 overflow-y-auto">
                {!hasContent ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-jarvis-text-secondary">
                        <BrainCircuitIcon className="w-16 h-16 mb-4 text-jarvis-primary/20" />
                        <h3 className="text-lg font-semibold">Il tuo report è vuoto</h3>
                        <p className="max-w-md mt-1">Inizia a descrivere un ambiente di lavoro o un rischio nella chat per popolarlo automaticamente.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {report.map(workplace => (
                            <div key={workplace.id}>
                                <h3 className="text-lg font-bold text-jarvis-text mb-2 border-b border-jarvis-primary/30 pb-1">{workplace.name}</h3>
                                {workplace.tasks.map(task => (
                                    <div key={task.id} className="ml-4 mt-3">
                                        <h4 className="font-semibold text-jarvis-secondary">{task.name}</h4>
                                        {task.requiredDpi.length > 0 && (
                                            <div className="text-xs text-jarvis-text-secondary mt-1">
                                                <strong>DPI:</strong> {task.requiredDpi.map(dpi => dpi.name).join(', ')}
                                            </div>
                                        )}
                                        <div className="mt-3 space-y-3">
                                            {task.findings.length > 0 ? (
                                                task.findings.map(finding => <FindingCard key={finding.id} finding={finding} />)
                                            ) : (
                                                <p className="text-sm text-jarvis-text-secondary italic">Nessun rilievo per questa mansione.</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {/* Add the improvement plan appendix */}
                        <ImprovementPlan report={report} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportView;
