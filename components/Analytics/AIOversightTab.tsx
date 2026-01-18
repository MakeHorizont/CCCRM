
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { aiAssistantService } from '../../services/api/aiAssistantService';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { SparklesIcon, ExclamationTriangleIcon, BoltIcon, CheckCircleIcon } from '../UI/Icons';
import MarkdownDisplay from '../UI/MarkdownDisplay';

const AIOversightTab: React.FC = () => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastScanDate, setLastScanDate] = useState<string | null>(null);

    const runAIScan = async () => {
        setIsLoading(true);
        try {
            // Aggregating data for context
            const [pos, incidents, items] = await Promise.all([
                apiService.getProductionOrders({ viewMode: 'active' }),
                apiService.getSystemEvents({ type: 'production' }), // Simplified for mock
                apiService.getWarehouseItems({ viewMode: 'active' })
            ]);

            const context = {
                activeOrders: pos.map(o => ({ id: o.id, name: o.name, status: o.status, items: o.orderItems })),
                recentIncidents: incidents.slice(0, 10),
                stockAlerts: items.filter(i => i.openIncidentsCount && i.openIncidentsCount > 0)
            };

            const result = await aiAssistantService.analyzeAnomalies(context);
            setAnalysis(result);
            setLastScanDate(new Date().toLocaleString());
        } catch (e) {
            console.error(e);
            setAnalysis("Ошибка при проведении ИИ-сканирования.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-brand-text-primary flex items-center">
                        <SparklesIcon className="h-6 w-6 mr-2 text-purple-400"/>
                        ИИ-Оверсайт: Детектор Аномалий
                    </h2>
                    <p className="text-sm text-brand-text-muted mt-1">ИИ анализирует массивы данных и находит скрытые неэффективности в реальном времени.</p>
                </div>
                <Button onClick={runAIScan} isLoading={isLoading} leftIcon={<BoltIcon className="h-5 w-5"/>}>Запустить сканирование</Button>
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <LoadingSpinner size="lg" className="mb-4 text-purple-500"/>
                    <p className="text-brand-text-muted animate-pulse font-mono">Проверка материальных балансов и логов ПЗ...</p>
                </div>
            ) : analysis ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    <Card className="lg:col-span-2 border-purple-500/30 bg-purple-500/5">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-brand-text-primary">Вердикт ИИ</h3>
                            <span className="text-[10px] text-brand-text-muted uppercase">Скан от {lastScanDate}</span>
                        </div>
                        <MarkdownDisplay markdown={analysis} className="text-sm prose-p:my-2" />
                    </Card>
                    
                    <div className="space-y-4">
                        <Card className="border-l-4 border-l-purple-500">
                             <h4 className="font-bold text-xs text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">Статус сенсора</h4>
                             <div className="flex items-center text-emerald-500">
                                 <CheckCircleIcon className="h-5 w-5 mr-2"/>
                                 <span className="text-sm font-bold">Связь с ПЗ установлена</span>
                             </div>
                        </Card>
                        <Card className="bg-brand-surface border-dashed">
                             <p className="text-xs text-brand-text-secondary leading-relaxed">
                                 <ExclamationTriangleIcon className="h-4 w-4 inline mr-1 text-amber-500"/>
                                 <strong>Внимание:</strong> ИИ не принимает решений. Все подсвеченные аномалии должны быть проверены мастером или начальником цеха вручную.
                             </p>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                    <SparklesIcon className="h-20 w-20 mb-4"/>
                    <p className="text-xl font-bold">Система ожидает запуска анализа</p>
                </div>
            )}
        </div>
    );
};

export default AIOversightTab;
