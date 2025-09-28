import React from 'react';
// Fix: Removed file extension from import for consistency.
import { Report } from '../types';

interface ImprovementPlanProps {
  report: Report;
}

const getRiskCategory = (level: number): 'red' | 'yellow' | 'green' => {
  if (level >= 8) return 'red';
  if (level >= 5) return 'yellow';
  return 'green';
};

const categoryConfig = {
    red: {
        title: 'Risanamento Immediato',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
    },
    yellow: {
        title: 'Risanamento Rapido',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/50',
        textColor: 'text-yellow-400',
    },
    green: {
        title: 'Obiettivo di Miglioramento',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-400',
    },
};

const ImprovementPlan: React.FC<ImprovementPlanProps> = ({ report }) => {
    const allFindings = report.flatMap(workplace => 
        workplace.tasks.flatMap(task => 
            task.findings.map(finding => ({ ...finding, workplaceName: workplace.name, taskName: task.name }))
        )
    );

    if (allFindings.length === 0) {
        return null;
    }

    const categorizedFindings = {
        red: allFindings.filter(f => getRiskCategory(f.riskLevel) === 'red').sort((a, b) => b.riskLevel - a.riskLevel),
        yellow: allFindings.filter(f => getRiskCategory(f.riskLevel) === 'yellow').sort((a, b) => b.riskLevel - a.riskLevel),
        green: allFindings.filter(f => getRiskCategory(f.riskLevel) === 'green').sort((a, b) => b.riskLevel - a.riskLevel),
    };

    return (
        <div className="mt-8 pt-6 border-t-2 border-jarvis-primary/30">
            <h3 className="text-xl font-semibold mb-4 text-jarvis-secondary">
                Appendice: Piano di Miglioramento
            </h3>
            <div className="space-y-6">
                {(['red', 'yellow', 'green'] as const).map(category => {
                    if (categorizedFindings[category].length === 0) return null;
                    const config = categoryConfig[category];
                    return (
                        <div key={category} className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4`}>
                            <h4 className={`text-lg font-bold ${config.textColor} mb-3`}>{config.title}</h4>
                            <ul className="space-y-3">
                                {categorizedFindings[category].map(finding => (
                                    <li key={finding.id} className="text-sm text-jarvis-text-secondary border-b border-jarvis-text/10 pb-2 last:border-b-0 last:pb-0">
                                        <p><strong className="text-jarvis-text">Luogo/Mansione:</strong> {finding.workplaceName} / {finding.taskName}</p>
                                        <p><strong className="text-jarvis-text">Pericolo ({finding.riskLevel}/10):</strong> {finding.hazard}</p>
                                        <p><strong className="text-jarvis-text">Raccomandazione:</strong> {finding.recommendation}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ImprovementPlan;