
import React from 'react';
import Card from '../UI/Card';
import { ScaleIcon, HeartIcon, BoltIcon, BanknotesIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

const JusticeAnalyticsTab: React.FC = () => {
    // Mock Data for Distribution
    const distribution = [
        { label: 'ФОТ (Зарплаты)', value: 65, color: 'bg-emerald-500', icon: BanknotesIcon },
        { label: 'Коллективный Фонд', value: 20, color: 'bg-sky-500', icon: HeartIcon },
        { label: 'Фонд Развития', value: 15, color: 'bg-purple-500', icon: BoltIcon }
    ];

    return (
        <div className="space-y-6">
            <Card className="bg-brand-surface border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-4 mb-6">
                    <ScaleIcon className="h-10 w-10 text-emerald-500"/>
                    <div>
                        <h2 className="text-xl font-bold text-brand-text-primary">Индекс Распределения Стоимости</h2>
                        <p className="text-sm text-brand-text-muted">Наглядное подтверждение отсутствия эксплуатации: 100% прибавочного продукта служит интересам коллектива.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Visual Bar */}
                    <div>
                        <div className="w-full h-12 flex rounded-xl overflow-hidden shadow-inner border border-brand-border">
                            {distribution.map(item => (
                                <Tooltip key={item.label} text={`${item.label}: ${item.value}%`}>
                                    <div 
                                        className={`${item.color} h-full transition-all hover:brightness-110 flex items-center justify-center text-white font-bold text-xs`}
                                        style={{ width: `${item.value}%` }}
                                    >
                                        {item.value}%
                                    </div>
                                </Tooltip>
                            ))}
                        </div>
                    </div>

                    {/* Legend Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {distribution.map(item => (
                            <div key={item.label} className="p-4 bg-brand-card rounded-xl border border-brand-border flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${item.color.replace('bg-', 'bg-opacity-10 text-').split(' ')[0]} bg-opacity-10`}>
                                    <item.icon className="h-6 w-6"/>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">{item.label}</p>
                                    <p className="text-2xl font-black text-brand-text-primary">{item.value}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            <Card className="border-dashed">
                <h3 className="font-bold text-brand-text-primary mb-2 flex items-center">
                    <HeartIcon className="h-5 w-5 mr-2 text-red-400"/>
                    Социальный Эффект
                </h3>
                <p className="text-sm text-brand-text-secondary leading-relaxed">
                    Коллективный фонд в текущем периоде обеспечил финансирование 3-х инициатив, включая закупку оборудования для зоны отдыха и поддержку товарища в трудной жизненной ситуации. Это повышает устойчивость системы сильнее, чем любая материальная премия.
                </p>
            </Card>
        </div>
    );
};

export default JusticeAnalyticsTab;
