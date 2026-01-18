
import React from 'react';
import Card from '../UI/Card';
import { LossCategory } from '../../types';
import { ExclamationTriangleIcon, TrashIcon } from '../UI/Icons';
import { BarChart } from '../UI/Charts';

interface LossAnalysisWidgetProps {
    losses: LossCategory[];
}

const LossAnalysisWidget: React.FC<LossAnalysisWidgetProps> = ({ losses }) => {
    const totalLoss = losses.reduce((sum, l) => sum + l.amount, 0);
    const chartData = losses.map(l => ({
        label: l.category,
        value: l.amount,
        tooltip: `${l.amount.toLocaleString()} ₽ (${l.occurrences} сл.)`
    }));

    return (
        <Card className="h-full flex flex-col">
            <h3 className="text-lg font-bold text-brand-text-primary mb-4 flex items-center">
                <TrashIcon className="h-6 w-6 mr-2 text-red-500"/>
                Анализ Потерь (Muda)
            </h3>
            
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium text-red-800 dark:text-red-200">Всего выявлено потерь:</span>
                <span className="text-xl font-black text-red-600">{totalLoss.toLocaleString()} ₽</span>
            </div>

            <div className="flex-grow">
                <BarChart data={chartData} color="bg-red-400" height={180} />
            </div>

            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar-thin">
                {losses.map((loss, idx) => (
                    <div key={idx} className="text-xs p-2 border-b border-brand-border last:border-0">
                        <div className="flex justify-between font-bold text-brand-text-primary">
                            <span>{loss.category}</span>
                            <span>{loss.amount.toLocaleString()} ₽</span>
                        </div>
                        <p className="text-brand-text-muted mt-0.5">{loss.description}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default LossAnalysisWidget;
