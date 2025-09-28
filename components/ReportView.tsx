// Fix: This file was empty. Implementing the ReportView component to display report data.
import React from 'react';
import { Report, Finding } from '../types';
import { SaveIcon, BrainCircuitIcon, DownloadIcon } from './icons';
import ImprovementPlan from './ImprovementPlan';

const getRiskColorClasses = (level: number): { text: string; bg: string; border: string } => {
    if (level >= 8) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/50' };
    if (level >= 5) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' };
    return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/50' };
};

const FindingCard: React.FC<{ finding: Finding }> = ({ finding }) => {
    const riskColor = getRiskColorClasses(finding.riskLevel);
    // This calculation logic is duplicated from geminiService for display consistency.
    // In a real app, this might be a shared utility function.
    const rawRiskValue = Math.pow(finding.damage, 2) * finding.probability * finding.exposure;

    return (
        <div className="bg-jarvis-bg p-4 rounded-lg border border-jarvis-text/10 space-y-3">
            <div className="flex justify-between items-start gap-4">
                <h5 className="font-semibold text-jarvis-text">{finding.hazard}</h5>
                <div className={`${riskColor.bg} ${riskColor.border} ${riskColor.text} rounded-md px-3 py-1 text-sm font-bold text-center flex-shrink-0`}>
                    Rischio: {finding.riskLevel}/10
                </div>
            </div>
            
            {/* --- CALCULATION ROW --- */}
            <div className="bg-jarvis-bg/50 border border-jarvis-text/10 rounded-md px-3 py-2 text-center text-sm">
                <span className="font-mono text-jarvis-text-secondary">
                    D{finding.damage}² &times; P{finding.probability} &times; F{finding.exposure} = <span className="font-bold text-jarvis-text">{rawRiskValue}</span>
                </span>
            </div>

            <div className="text-sm text-jarvis-text-secondary space-y-1">
                <p><strong className="text-jarvis-text/80">Descrizione:</strong> {finding.description}</p>
                <p><strong className="text-jarvis-text/80">Raccomandazione:</strong> {finding.recommendation}</p>
                <p><strong className="text-jarvis-text/80">Normativa:</strong> {finding.regulation}</p>
                {finding.photo?.analysis && <p><strong className="text-jarvis-text/80">Analisi Foto:</strong> {finding.photo.analysis}</p>}
            </div>
        </div>
    );
};

// New Component for Methodology
const MethodologySection: React.FC = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    const factors = [
        { title: "Danno Potenziale (D)", values: ["1: Lieve", "2: Medio", "3: Grave", "4: Gravissimo"] },
        { title: "Probabilità di Accadimento (P)", values: ["1: Improbabile", "2: Poco Probabile", "3: Probabile", "4: Molto Probabile"] },
        { title: "Frequenza di Esposizione (F)", values: ["1: Rara", "2: Occasionale", "3: Frequente", "4: Continua"] }
    ];

    const riskBands = [
        { range: "R > 64 (ALTO)", level: "8-10", color: "bg-red-500/20 text-red-400" },
        { range: "16 < R <= 64 (MEDIO)", level: "5-7", color: "bg-yellow-500/20 text-yellow-400" },
        { range: "R <= 16 (BASSO)", level: "1-4", color: "bg-green-500/20 text-green-400" }
    ];

    return (
        <div className="bg-jarvis-bg/50 border border-jarvis-text/10 rounded-lg p-3 text-sm">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left font-semibold text-jarvis-text-secondary hover:text-jarvis-primary">
                {isOpen ? '▼' : '►'} Metodologia di Valutazione del Rischio
            </button>
            {isOpen && (
                <div className="mt-4 space-y-4">
                    <p className="text-center font-semibold bg-jarvis-bg p-2 rounded-md">
                        Formula: Rischio = Danno Potenziale² &times; Probabilità di Accadimento &times; Frequenza di Esposizione
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {factors.map(factor => (
                            <div key={factor.title}>
                                <h6 className="font-bold text-jarvis-text mb-1">{factor.title}</h6>
                                <ul className="list-disc list-inside text-xs space-y-1">
                                    {factor.values.map(v => <li key={v}>{v}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h6 className="font-bold text-jarvis-text mb-1">Fasce di Rischio</h6>
                        <div className="flex flex-col md:flex-row gap-2 text-xs">
                             {riskBands.map(band => (
                                <div key={band.range} className={`flex-1 p-2 rounded-md ${band.color}`}>
                                    <strong className="block">{band.range}</strong>
                                    <span>Livello: {band.level}/10</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReportView: React.FC<{ report: Report; onSave: () => void; isLoggedIn: boolean }> = ({ report, onSave, isLoggedIn }) => {
    const hasContent = report.length > 0;

    const exportReportAsText = () => {
        if (!hasContent) return;
        
        let textContent = `DOCUMENTO DI VALUTAZIONE DEI RISCHI (DVR)\n`;
        textContent += `Data: ${new Date().toLocaleDateString('it-IT')}\n`;
        textContent += "========================================\n\n";

        // Add Methodology to export
        textContent += "METODOLOGIA DI VALUTAZIONE DEL RISCHIO\n";
        textContent += "Formula: Rischio = (Danno Potenziale^2) * Probabilità di Accadimento * Frequenza di Esposizione al Pericolo\n\n";

        report.forEach(workplace => {
            textContent += `LUOGO: ${workplace.name}\n`;
            textContent += "----------------------------------------\n";
            workplace.tasks.forEach(task => {
                textContent += `\nMANSIONE: ${task.name}\n\n`;
                if (task.findings.length > 0) {
                     task.findings.forEach(finding => {
                        const rawRisk = Math.pow(finding.damage, 2) * finding.probability * finding.exposure;
                        textContent += `  PERICOLO: ${finding.hazard}\n`;
                        textContent += `    - Rischio Valutato: ${finding.riskLevel}/10\n`;
                        textContent += `    - Calcolo: Danno ${finding.damage}² × Probabilità ${finding.probability} × Frequenza ${finding.exposure} = ${rawRisk}\n`;
                        textContent += `    - Descrizione: ${finding.description}\n`;
                        textContent += `    - Normativa: ${finding.regulation}\n`;
                        textContent += `    - Raccomandazione: ${finding.recommendation}\n\n`;
                    });
                } else {
                    textContent += "  Nessun rilievo specifico per questa mansione.\n\n";
                }
               
                if (task.requiredDpi.length > 0) {
                    textContent += `  DPI OBBLIGATORI:\n`;
                    task.requiredDpi.forEach(dpi => {
                        textContent += `    - ${dpi.name}${dpi.notes ? ` (${dpi.notes})` : ''}\n`;
                    });
                    textContent += "\n";
                }
            });
        });
        
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const reportName = report[0]?.name.replace(/\s+/g, '_') || 'report';
        link.download = `DVR_${reportName}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
            <header className="p-4 border-b border-jarvis-text/10 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-jarvis-primary">Report in Tempo Reale</h2>
                {hasContent && (
                    <div className="flex items-center gap-2">
                         {isLoggedIn && (
                            <button 
                                onClick={onSave} 
                                className="flex items-center gap-2 px-3 py-1.5 bg-jarvis-primary/20 text-jarvis-primary rounded-lg hover:bg-jarvis-primary/30 transition-colors text-sm"
                            >
                                <SaveIcon className="w-4 h-4" />
                                Salva
                            </button>
                        )}
                        <button 
                            onClick={exportReportAsText} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-jarvis-secondary/20 text-jarvis-secondary rounded-lg hover:bg-jarvis-secondary/30 transition-colors text-sm"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Esporta
                        </button>
                    </div>
                )}
            </header>
            
            <div className="flex-1 p-6 overflow-y-auto">
                {!hasContent ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-jarvis-text-secondary">
                        <BrainCircuitIcon className="w-16 h-16 mb-4 text-jarvis-primary/20" />
                        <h3 className="text-lg font-semibold">Il report è vuoto</h3>
                        <p className="max-w-md mt-1">Inizia la conversazione per aggiungere rilievi.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <MethodologySection />
                        {report.map(workplace => (
                            <div key={workplace.id}>
                                <h3 className="text-lg font-bold text-jarvis-text mb-2 border-b border-jarvis-primary/30 pb-1">Luogo: {workplace.name}</h3>
                                {workplace.tasks.map(task => (
                                    <div key={task.id} className="mt-3">
                                        <h4 className="font-semibold text-jarvis-secondary">{task.name}</h4>
                                        
                                        <div className="mt-3 space-y-4">
                                            {task.findings.length > 0 ? (
                                                task.findings.map(finding => <FindingCard key={finding.id} finding={finding} />)
                                            ) : (
                                                <p className="text-sm text-jarvis-text-secondary italic">Nessun rilievo per questa mansione.</p>
                                            )}
                                        </div>
                                         {task.requiredDpi.length > 0 && (
                                            <div className="mt-4">
                                                <h5 className="font-semibold text-jarvis-text text-sm">DPI Obbligatori:</h5>
                                                <ul className="list-disc list-inside text-sm text-jarvis-text-secondary mt-1">
                                                    {task.requiredDpi.map((dpi, i) => <li key={i}>{dpi.name} {dpi.notes && `(${dpi.notes})`}</li>)}
                                                </ul>
                                            </div>
                                        )}
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