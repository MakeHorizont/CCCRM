
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { BarChart } from '../UI/Charts';

const ProductionAnalyticsTab: React.FC = () => {
    const [trendData, setTrendData] = useState<any[]>([]);
    const [efficiencyData, setEfficiencyData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [trend, efficiency] = await Promise.all([
                    apiService.getProductionVolumeTrend(14), // Last 2 weeks
                    apiService.getProductEfficiencyAnalysis()
                ]);
                setTrendData(trend);
                setEfficiencyData(efficiency);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

    const plannedChartData = trendData.map(d => ({ 
        label: new Date(d.date).toLocaleDateString('ru-RU', {day:'2-digit', month:'short'}), 
        value: d.planned,
        tooltip: `План: ${d.planned}`
    }));
    const producedChartData = trendData.map(d => ({ 
        label: new Date(d.date).toLocaleDateString('ru-RU', {day:'2-digit', month:'short'}), 
        value: d.produced,
        tooltip: `Факт: ${d.produced}`
    }));

    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                     <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Динамика выпуска (Факт)</h3>
                     <BarChart data={producedChartData} color="bg-emerald-500" height={250}/>
                 </Card>
                 <Card>
                     <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Динамика планирования</h3>
                     <BarChart data={plannedChartData} color="bg-zinc-400" height={250}/>
                 </Card>
             </div>

             <Card>
                <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Эффективность по продуктам</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                            <tr>
                                <th className="px-4 py-2">Продукт</th>
                                <th className="px-4 py-2 text-right">Всего произведено</th>
                                <th className="px-4 py-2 text-right">Эффективность (План/Факт)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {efficiencyData.slice(0, 10).map((item) => (
                                <tr key={item.productId} className="hover:bg-brand-secondary">
                                    <td className="px-4 py-2 font-medium text-brand-text-primary">{item.productName}</td>
                                    <td className="px-4 py-2 text-right">{item.totalProduced}</td>
                                    <td className="px-4 py-2 text-right">
                                        <span className={`font-bold ${item.avgBatchEfficiency >= 100 ? 'text-emerald-500' : item.avgBatchEfficiency < 80 ? 'text-red-500' : 'text-amber-500'}`}>
                                            {item.avgBatchEfficiency}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </Card>
        </div>
    );
};

export default ProductionAnalyticsTab;
