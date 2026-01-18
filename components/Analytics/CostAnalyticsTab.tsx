
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { LineChart } from '../UI/Charts';
import { WarehouseItem } from '../../types';
// FIX: Added missing DocumentTextIcon import
import { DocumentTextIcon } from '../UI/Icons';

const CostAnalyticsTab: React.FC = () => {
    const [items, setItems] = useState<WarehouseItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [costTrend, setCostTrend] = useState<any[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingChart, setIsLoadingChart] = useState(false);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const data = await apiService.getWarehouseItems({ viewMode: 'active' });
                const producedItems = data.filter(i => i.billOfMaterials && i.billOfMaterials.length > 0);
                setItems(producedItems);
                if (producedItems.length > 0) {
                    setSelectedItemId(producedItems[0].id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingList(false);
            }
        };
        fetchItems();
    }, []);

    useEffect(() => {
        if (!selectedItemId) return;
        const fetchTrend = async () => {
            setIsLoadingChart(true);
            try {
                const data = await apiService.getUnitCostTrend(selectedItemId);
                setCostTrend(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingChart(false);
            }
        };
        fetchTrend();
    }, [selectedItemId]);

    const chartData = costTrend.map(d => ({
        label: new Date(d.date).toLocaleDateString('ru-RU', {day:'2-digit', month:'short'}),
        value: d.unitCost,
        tooltip: `${d.unitCost} ₽ (${d.batchName})`
    }));

    return (
        <div className="space-y-6">
            <Card>
                <div className="mb-8 p-4 bg-brand-surface border border-brand-border rounded-lg shadow-inner">
                     <label className="block text-sm font-bold text-brand-text-primary mb-3 uppercase tracking-tight">Анализ себестоимости продукта:</label>
                     <select 
                        value={selectedItemId} 
                        onChange={e => setSelectedItemId(e.target.value)}
                        className="w-full md:w-1/2 bg-brand-card border border-brand-border rounded-lg p-3 text-brand-text-primary focus:ring-2 focus:ring-sky-500 shadow-sm"
                        disabled={isLoadingList}
                     >
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                     </select>
                </div>

                {isLoadingChart ? (
                    <div className="h-64 flex items-center justify-center"><LoadingSpinner/></div>
                ) : (
                    costTrend.length > 0 ? (
                        <div className="px-2">
                            <h3 className="text-lg font-bold text-brand-text-primary mb-6 flex items-center">
                                <div className="h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse"></div>
                                Динамика себестоимости единицы (₽)
                            </h3>
                            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border/50">
                                <LineChart data={chartData} height={320} color="text-purple-500" />
                            </div>
                            <p className="text-xs text-brand-text-muted mt-8 text-center italic">
                                * Данные рассчитываются автоматически на основе затраченного сырья и трудозатрат в закрытых ПЗ.
                            </p>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-brand-text-muted space-y-2">
                            <DocumentTextIcon className="h-12 w-12 opacity-10"/>
                            <p>Нет завершенных партий для расчета себестоимости этого продукта.</p>
                        </div>
                    )
                )}
            </Card>
        </div>
    );
};

export default CostAnalyticsTab;
