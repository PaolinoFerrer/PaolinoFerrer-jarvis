import React from 'react';
import { Report, Finding } from '../types';
import { SaveIcon, DownloadIcon } from './icons';
import ImprovementPlan from './ImprovementPlan';

interface ReportViewProps {
  report: Report;
  onSave: () => void;
  isLoggedIn: boolean;
}

const getRiskColor = (level: number): string => {
  if (level >= 8) return 'text-red-400 border-red-400';
  if (level >= 5) return 'text-yellow-400 border-yellow-400';
  return 'text-green-400 border-green-400';
};

const FindingDetail: React.FC<{ finding: Finding }> = ({ finding }) => (
    <div className="bg-jarvis-bg/50 p-4 rounded-lg border-l-4 border-jarvis-primary/30">
        <div className="flex justify-between items-start">
            <h5 className="font-semibold text-jarvis-text">{finding.hazard}</h5>
            <div className={`text-sm font-bold px-2 py-1 border rounded-full ${getRiskColor(finding.riskLevel)}`}>
                Rischio: {finding.riskLevel}/10
            </div>
        </div>
        <p className="text-sm text-jarvis-text-secondary mt-1">{finding.description}</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="bg-jarvis-surface/50 p-2 rounded"><strong>Danno:</strong> {finding.damage}/4</div>
            <div className="bg-jarvis-surface/50 p-2 rounded"><strong>Probabilità:</strong> {finding.probability}/4</div>
            <div className="bg-jarvis-surface/50 p-2 rounded"><strong>Esposizione:</strong> {finding.exposure}/4</div>
        </div>
        <div className="mt-3 text-sm space-y-1">
            <p><strong className="text-jarvis-text-secondary">Normativa:</strong> {finding.regulation}</p>
            <p><strong className="text-jarvis-text-secondary">Raccomandazione:</strong> {finding.recommendation}</p>
        </div>
    </div>
);


const ReportView: React.FC<ReportViewProps> = ({ report, onSave, isLoggedIn }) => {
    
    // A simplified function to generate a text-based report for download
    const generateTextReport = (): string => {
        let content = "Documento di Valutazione dei Rischi (DVR)\n\n";
        report.forEach(workplace => {
            content += `========================================\n`;
            content += `LUOGO DI LAVORO: ${workplace.name}\n`;
            content += `========================================\n\n`;
            workplace.tasks.forEach(task => {
                content += `----------------------------------------\n`;
                content += `MANSIONE: ${task.name}\n`;
                content += `----------------------------------------\n\n`;
                
                content += `DPI RICHIESTI:\n`;
                if (task.requiredDpi.length > 0) {
                    task.requiredDpi.forEach(dpi => {
                        content += `- ${dpi.name}${dpi.notes ? ` (${dpi.notes})` : ''}\n`;
                    });
                } else {
                    content += `- Nessuno specificato\n`;
                }
                content += `\n`;

                content += `RILIEVI DI SICUREZZA:\n`;
                if (task.findings.length > 0) {
                    task.findings.forEach((finding, index) => {
                        content += `Rilievo #${index + 1}\n`;
                        content += `  Pericolo: ${finding.hazard}\n`;
                        content += `  Descrizione: ${finding.description}\n`;
                        content += `  Livello Rischio: ${finding.riskLevel}/10 (D:${finding.damage}, P:${finding.probability}, E:${finding.exposure})\n`;
                        content += `  Normativa: ${finding.regulation}\n`;
                        content += `  Raccomandazione: ${finding.recommendation}\n\n`;
                    });
                } else {
                     content += `Nessun rilievo per questa mansione.\n\n`;
                }
            });
        });

        // Add Improvement Plan
        const allFindings = report.flatMap(w => w.tasks.flatMap(t => t.findings.map(f => ({...f, workplaceName: w.name, taskName: t.name}))));
        if (allFindings.length > 0) {
            content += `\n\n========================================\n`;
            content += `PIANO DI MIGLIORAMENTO\n`;
            content += `========================================\n\n`;

            const red = allFindings.filter(f => f.riskLevel >= 8).sort((a,b) => b.riskLevel - a.riskLevel);
            const yellow = allFindings.filter(f => f.riskLevel >= 5 && f.riskLevel < 8).sort((a,b) => b.riskLevel - a.riskLevel);
            const green = allFindings.filter(f => f.riskLevel < 5).sort((a,b) => b.riskLevel - a.riskLevel);

            if (red.length > 0) {
                content += `** RISANAMENTO IMMEDIATO (Rischio >= 8) **\n`;
                red.forEach(f => {
                    content += `- ${f.hazard} (${f.workplaceName}/${f.taskName}) - Raccomandazione: ${f.recommendation}\n`
                });
                content += `\n`;
            }
             if (yellow.length > 0) {
                content += `** RISANAMENTO RAPIDO (Rischio 5-7) **\n`;
                yellow.forEach(f => {
                    content += `- ${f.hazard} (${f.workplaceName}/${f.taskName}) - Raccomandazione: ${f.recommendation}\n`
                });
                content += `\n`;
            }
            if (green.length > 0) {
                content += `** OBIETTIVO DI MIGLIORAMENTO (Rischio < 5) **\n`;
                green.forEach(f => {
                    content += `- ${f.hazard} (${f.workplaceName}/${f.taskName}) - Raccomandazione: ${f.recommendation}\n`
                });
                content += `\n`;
            }
        }

        return content;
    };

    const handleDownload = () => {
        const textContent = generateTextReport();
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-dvr-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-jarvis-text/10 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-jarvis-primary">Documento di Valutazione dei Rischi (DVR)</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={report.length === 0}
                        className="p-2 rounded-full hover:bg-jarvis-bg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Scarica report testuale"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onSave}
                        disabled={!isLoggedIn || report.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-jarvis-primary text-white rounded-lg hover:bg-jarvis-secondary disabled:bg-jarvis-text-secondary disabled:cursor-not-allowed"
                        title={!isLoggedIn ? "Accedi a Google Drive per salvare" : "Salva report su Google Drive"}
                    >
                        <SaveIcon className="w-5 h-5" />
                        <span>Salva</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {report.length === 0 ? (
                    <div className="text-center text-jarvis-text-secondary h-full flex flex-col justify-center items-center">
                        <p className="text-lg">Il report è vuoto.</p>
                        <p>Inizia descrivendo un'area o un rischio nella chat.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {report.map(workplace => (
                            <div key={workplace.id}>
                                <h3 className="text-lg font-bold text-jarvis-text pb-2 mb-4 border-b-2 border-jarvis-primary/50">
                                    Luogo di Lavoro: {workplace.name}
                                </h3>
                                <div className="space-y-6 pl-4">
                                    {workplace.tasks.map(task => (
                                        <div key={task.id}>
                                            <h4 className="text-md font-semibold text-jarvis-text-secondary mb-3">
                                                Mansione: {task.name}
                                            </h4>
                                            
                                            {task.requiredDpi.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-sm font-semibold mb-1">DPI Richiesti:</p>
                                                    <ul className="list-disc list-inside text-sm text-jarvis-text-secondary">
                                                        {task.requiredDpi.map((dpi, index) => <li key={index}>{dpi.name}{dpi.notes ? ` (${dpi.notes})`: ''}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {task.findings.length > 0 ? (
                                                    task.findings.map(finding => <FindingDetail key={finding.id} finding={finding} />)
                                                ) : (
                                                    <p className="text-sm text-jarvis-text-secondary italic">Nessun rilievo specifico per questa mansione.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                         <ImprovementPlan report={report} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportView;
