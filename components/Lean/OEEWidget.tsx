
import React from 'react';
import Card from '../UI/Card';
import { OEEMetric } from '../../types';
import { CogIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

interface OEEWidgetProps {
    metrics: OEEMetric[];
}

const Gauge: React.FC<{ value: number, label: string }> = ({ value, label }) => {
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (value / 100) * circumference;
    
    let color = 'text-emerald-500';
    if (value < 60) color = 'text-red-500';
    else if (value < 85) color = 'text-amber-500';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-12 h-12">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-brand-border" />
                    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" 
                        className={`transition-all duration-1000 ${color}`}
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                    {value}%
                </div>
            </div>
            <span className="text-[10px] text-brand-text-muted mt-1 uppercase">{label}</span>
        </div>
    );
};

const OEEWidget: React.FC<OEEWidgetProps> = ({ metrics }) => {
    return (
        <Card className="h-full flex flex-col">
            <h3 className="text-lg font-bold text-brand-text-primary mb-4 flex items-center">
                <CogIcon className="h-6 w-6 mr-2 text-indigo-500"/>
                Эффективность Оборудования (OEE)
            </h3>
            
            <div className="space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar-thin pr-2">
                {metrics.map(m => (
                    <div key={m.equipmentId} className="p-3 bg-brand-surface rounded-lg border border-brand-border">
                         <div className="flex justify-between items-center mb-2 border-b border-brand-border pb-1">
                            <h4 className="font-bold text-sm text-brand-text-primary truncate" title={m.equipmentName}>{m.equipmentName}</h4>
                            <span className={`text-xs font-black px-2 py-0.5 rounded ${m.overall >= 85 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                OEE: {m.overall}%
                            </span>
                        </div>
                        <div className="flex justify-between px-2">
                            <Tooltip text="Доступность (Время работы / Плановое время)">
                                <Gauge value={m.availability} label="Avail" />
                            </Tooltip>
                            <Tooltip text="Производительность (Факт / Идеал)">
                                <Gauge value={m.performance} label="Perf" />
                            </Tooltip>
                            <Tooltip text="Качество (Годная продукция / Всего)">
                                <Gauge value={m.quality} label="Qual" />
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default OEEWidget;
