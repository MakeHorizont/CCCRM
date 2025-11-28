
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { LineChart } from '../UI/Charts';
import { WarehouseItem } from '../../types';

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
                // Filter only produced items (those with BOM)
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
                <div className="mb-6">
                     <label className="block text-sm font-medium text-brand-text-primary mb-2">Выберите продукт для анализа себестоимости:</label>
                     <select 
                        value={selectedItemId} 
                        onChange={e => setSelectedItemId(e.target.value)}
                        className="w-full md:w-1/2 bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500"
                        disabled={isLoadingList}
                     >
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                     </select>
                </div>

                {isLoadingChart ? <div className="h-64 flex items-center justify-center"><LoadingSpinner/></div> : (
                    costTrend.length > 0 ? (
                        <div>
                            <h3 className="text-lg font-semibold text-brand-text-primary mb-2">Динамика себестоимости единицы (₽)</h3>
                            <LineChart data={chartData} height={300} color="text-purple-500" />
                            <p className="text-xs text-brand-text-muted mt-4 text-center">
                                Данные строятся на основе закрытых производственных заданий.
                            </p>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-brand-text-muted">
                            Нет данных о завершенных партиях для этого продукта.
                        </div>
                    )
                )}
            </Card>
        </div>
    );
};

export default CostAnalyticsTab;
