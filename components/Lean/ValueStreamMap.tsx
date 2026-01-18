
import React from 'react';
import { ValueStreamStage } from '../../types';
import Card from '../UI/Card';
import { ArrowTrendingUpIcon, ClockIcon, ExclamationTriangleIcon, TruckIcon, ArchiveBoxIcon, FireIcon, ShieldCheckIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

interface ValueStreamMapProps {
    stages: ValueStreamStage[];
    efficiency: number;
}

const getIconForType = (type: string) => {
    switch (type) {
        case 'process': return FireIcon;
        case 'inventory': return ArchiveBoxIcon;
        case 'transport': return TruckIcon;
        default: return ArrowTrendingUpIcon;
    }
};

const ValueStreamMap: React.FC<ValueStreamMapProps> = ({ stages, efficiency }) => {
    return (
        <Card className="overflow-x-auto">
            <h3 className="text-lg font-bold text-brand-text-primary mb-6 flex items-center">
                <ArrowTrendingUpIcon className="h-6 w-6 mr-2 text-sky-500"/>
                Карта Потока Создания Ценности
                <span className={`ml-4 text-xs font-normal px-2 py-1 rounded-full ${efficiency > 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    Эффективность потока: {efficiency}%
                </span>
            </h3>
            
            <div className="flex items-start min-w-[800px] py-4 relative">
                {/* Timeline Axis Line (Background) */}
                <div className="absolute top-20 left-0 right-0 h-1 bg-brand-border z-0"></div>

                {stages.map((stage, idx) => {
                    // FIX: Renamed from getIcon to getIconForType to match definition
                    const Icon = getIconForType(stage.type);
                    const isLast = idx === stages.length - 1;
                    
                    return (
                        <React.Fragment key={stage.id}>
                            {/* Stage Node */}
                            <div className="relative z-10 flex flex-col items-center w-48 flex-shrink-0 group">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform hover:scale-110 ${stage.type === 'process' ? 'bg-sky-50 border-sky-500 text-sky-600' : stage.type === 'inventory' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-zinc-50 border-zinc-400 text-zinc-500'}`}>
                                    <Icon className="h-8 w-8"/>
                                </div>
                                <div className="mt-2 text-center">
                                    <p className="font-bold text-sm text-brand-text-primary">{stage.name}</p>
                                    <div className="text-xs text-brand-text-muted mt-1 space-y-1">
                                        {stage.inventoryCount !== undefined && <p>Запас: {stage.inventoryCount} ед.</p>}
                                        <p className="text-emerald-600 font-medium">Ценность: {stage.valueAddedTime} мин</p>
                                        <p className="text-red-500 font-medium">Потери: {stage.nonValueAddedTime} мин</p>
                                    </div>
                                </div>
                            </div>

                            {/* Connector Arrow */}
                            {!isLast && (
                                <div className="flex-grow h-24 flex flex-col items-center justify-center relative -mx-4 z-0">
                                    <div className="text-[10px] bg-brand-surface border border-brand-border px-2 py-1 rounded shadow-sm text-brand-text-secondary whitespace-nowrap mb-1">
                                        Время такта: ~{(stage.valueAddedTime + stage.nonValueAddedTime) / 60} ч
                                    </div>
                                    <div className="w-full h-0.5 bg-zinc-300"></div>
                                    <div className="absolute right-0 top-1/2 -mt-1 w-2 h-2 border-t-2 border-r-2 border-zinc-300 transform rotate-45"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            
            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-xs text-brand-text-secondary border border-brand-border flex gap-4">
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-sky-500 mr-2"></span>Ценность (Value Added) — время реальной обработки</div>
                <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>Потери (Muda) — ожидание, хранение, транспорт</div>
            </div>
        </Card>
    );
};

export default ValueStreamMap;
