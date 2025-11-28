
import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import { ClockIcon } from '../UI/Icons';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';

interface ForecastItem {
    name: string;
    daysLeft: number;
    dailyUsage: number;
    currentStock: number;
}

const ResourceForecastWidget: React.FC = () => {
    const [forecast, setForecast] = useState<ForecastItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Assuming dashboardService is extended in apiService (typings might need update in real app, but logic handles it)
                // For this specific XML response, we assume apiService.dashboardService... or direct export if apiService structure allows.
                // Given existing structure, apiService aggregates dashboardService.
                const data = await (apiService as any).getResourceForecast();
                setForecast(data);
            } catch (e) {
                console.error("Failed to load forecast", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <Card className="h-full flex items-center justify-center"><LoadingSpinner/></Card>;

    return (
        <Card className="h-full flex flex-col">
            <h2 className="text-xl font-semibold text-brand-text-primary mb-4 flex items-center">
                <ClockIcon className="h-6 w-6 mr-2 text-brand-primary"/>
                Прогноз Ресурсов (Топ рисков)
            </h2>
            
            <div className="flex-grow space-y-4 overflow-y-auto custom-scrollbar-thin pr-1">
                {forecast.length === 0 ? (
                    <p className="text-center text-brand-text-muted my-auto">Дефицита в ближайшую неделю не ожидается.</p>
                ) : (
                    forecast.map((item, idx) => {
                        const isCritical = item.daysLeft < 3;
                        const barColor = isCritical ? 'bg-red-500' : item.daysLeft < 7 ? 'bg-orange-500' : 'bg-emerald-500';
                        const width = Math.min(100, (item.daysLeft / 14) * 100); // Scale to 2 weeks max for visual

                        return (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-brand-text-primary truncate pr-2" title={item.name}>{item.name}</span>
                                    <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-brand-text-secondary'}`}>
                                        {item.daysLeft < 1 ? '< 1 дн.' : `~${Math.floor(item.daysLeft)} дн.`}
                                    </span>
                                </div>
                                <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-2 relative overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${width}%` }}></div>
                                </div>
                                <p className="text-[10px] text-brand-text-muted text-right">
                                    Запас: {item.currentStock} | Расход: {item.dailyUsage}/день
                                </p>
                            </div>
                        )
                    })
                )}
            </div>
        </Card>
    );
};

export default ResourceForecastWidget;
