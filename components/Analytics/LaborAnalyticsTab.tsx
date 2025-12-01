
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { LineChart, BarChart } from '../UI/Charts';
import { UserGroupIcon, LightBulbIcon, ShieldCheckIcon } from '../UI/Icons';

const LaborAnalyticsTab: React.FC = () => {
    const [trends, setTrends] = useState<any[]>([]);
    const [topRationalizers, setTopRationalizers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await apiService.getLaborStats();
                setTrends(data.trends);
                setTopRationalizers(data.topRationalizers);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

    const ktuData = trends.map(t => ({ label: t.month, value: t.avgKtu, tooltip: `Средний КТУ: ${t.avgKtu}` }));
    const incidentsData = trends.map(t => ({ label: t.month, value: t.safetyIncidents, tooltip: `Инцидентов: ${t.safetyIncidents}` }));
    const innovationData = trends.map(t => ({ label: t.month, value: t.rationalizationCount, tooltip: `Предложений: ${t.rationalizationCount}` }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-brand-text-primary flex items-center">
                            <UserGroupIcon className="h-5 w-5 mr-2 text-blue-500"/>
                            Динамика Трудовой Дисциплины (Средний КТУ)
                        </h3>
                    </div>
                    <LineChart data={ktuData} height={250} color="text-blue-500" />
                    <p className="text-xs text-brand-text-muted mt-2 text-center">
                        Отражает средний коэффициент трудового участия по всему коллективу.
                    </p>
                </Card>
                
                <div className="space-y-6">
                    <Card>
                         <h3 className="text-sm font-semibold text-brand-text-primary mb-3 flex items-center">
                            <ShieldCheckIcon className="h-5 w-5 mr-2 text-red-500"/>
                            Безопасность и Инциденты
                        </h3>
                        <BarChart data={incidentsData} height={150} color="bg-red-400" />
                    </Card>
                     <Card>
                         <h3 className="text-sm font-semibold text-brand-text-primary mb-3 flex items-center">
                            <LightBulbIcon className="h-5 w-5 mr-2 text-amber-500"/>
                            Активность Рационализаторов
                        </h3>
                        <BarChart data={innovationData} height={150} color="bg-amber-400" />
                    </Card>
                </div>
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-brand-text-primary mb-4">Лидеры Рационализации (Топ Вклада)</h3>
                {topRationalizers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                                <tr>
                                    <th className="px-4 py-2">Сотрудник</th>
                                    <th className="px-4 py-2 text-center">Внедрено предложений</th>
                                    <th className="px-4 py-2 text-right">Экономический эффект</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {topRationalizers.map((user) => (
                                    <tr key={user.id} className="hover:bg-brand-secondary">
                                        <td className="px-4 py-2 font-medium text-brand-text-primary">{user.name}</td>
                                        <td className="px-4 py-2 text-center">{user.acceptedProposals}</td>
                                        <td className="px-4 py-2 text-right text-emerald-600 font-bold">
                                            {user.totalEconomy.toLocaleString('ru-RU')} ₽
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-brand-text-muted py-4">Пока нет внедренных рацпредложений.</p>
                )}
            </Card>
        </div>
    );
};

export default LaborAnalyticsTab;
