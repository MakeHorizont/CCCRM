
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { EquipmentItem, MaintenanceRecord } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { WrenchIcon, ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, CalendarDaysIcon, CubeIcon, ChevronRightIcon } from '../UI/Icons';
import { ROUTE_PATHS, EQUIPMENT_STATUS_COLOR_MAP, EQUIPMENT_STATUS_LABELS } from '../../constants';
import Tooltip from '../UI/Tooltip';

type ActiveTab = 'schedule' | 'history' | 'breakdowns';

const MaintenancePage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');
    const [upcoming, setUpcoming] = useState<{ equipment: EquipmentItem, daysUntilDue: number }[]>([]);
    const [history, setHistory] = useState<{ record: MaintenanceRecord, equipmentName: string, equipmentId: string }[]>([]);
    const [breakdowns, setBreakdowns] = useState<EquipmentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using aggregated endpoints (or client-side aggregation via service)
            const [upcomingData, historyData, allEquipment] = await Promise.all([
                apiService.getUpcomingMaintenance(),
                apiService.getAllMaintenanceHistory(),
                apiService.getEquipmentItems({ viewMode: 'active' })
            ]);
            
            setUpcoming(upcomingData);
            setHistory(historyData);
            setBreakdowns(allEquipment.filter(e => e.status === 'broken'));
        } catch (err) {
            console.error("Failed to load maintenance data", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getDaysLabel = (days: number) => {
        if (days < 0) return <span className="text-red-500 font-bold">Просрочено на {Math.abs(days)} дн.</span>;
        if (days === 0) return <span className="text-orange-500 font-bold">Сегодня</span>;
        return <span className={days <= 3 ? 'text-amber-500' : 'text-brand-text-secondary'}>Через {days} дн.</span>;
    };

    const tabButtonStyle = (tabName: ActiveTab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center ` +
    (activeTab === tabName
      ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-brand-surface'
      : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <WrenchIcon className="h-8 w-8 mr-3 text-brand-primary"/>
                    Обслуживание (ППР)
                </h1>
            </div>

            {/* Status Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`border-l-4 ${breakdowns.length > 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-emerald-500'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Аварии / Поломки</p>
                            <p className="text-2xl font-bold text-brand-text-primary mt-1">{breakdowns.length}</p>
                        </div>
                        <ExclamationTriangleIcon className={`h-8 w-8 ${breakdowns.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}/>
                    </div>
                </Card>
                <Card className="border-l-4 border-amber-500">
                     <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">План на неделю</p>
                            <p className="text-2xl font-bold text-brand-text-primary mt-1">{upcoming.filter(i => i.daysUntilDue <= 7).length}</p>
                        </div>
                        <ClockIcon className="h-8 w-8 text-amber-500"/>
                    </div>
                </Card>
                <Card className="border-l-4 border-sky-500">
                     <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Выполнено за месяц</p>
                            <p className="text-2xl font-bold text-brand-text-primary mt-1">
                                {history.filter(h => new Date(h.record.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                            </p>
                        </div>
                        <CheckCircleIcon className="h-8 w-8 text-sky-500"/>
                    </div>
                </Card>
            </div>

            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                    <button onClick={() => setActiveTab('schedule')} className={tabButtonStyle('schedule')}>
                        <CalendarDaysIcon className="h-4 w-4 mr-2"/> График ППР
                    </button>
                     <button onClick={() => setActiveTab('breakdowns')} className={tabButtonStyle('breakdowns')}>
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2"/> Поломки ({breakdowns.length})
                    </button>
                    <button onClick={() => setActiveTab('history')} className={tabButtonStyle('history')}>
                        <ClockIcon className="h-4 w-4 mr-2"/> Журнал работ
                    </button>
                </nav>
            </div>

            <div className="py-2">
                {isLoading ? (
                    <div className="flex justify-center p-12"><LoadingSpinner /></div>
                ) : (
                    <>
                    {activeTab === 'schedule' && (
                        <Card>
                            {upcoming.length === 0 ? (
                                <p className="text-brand-text-muted text-center py-8">Нет запланированных работ на ближайшие 30 дней.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-brand-surface text-brand-text-muted font-medium border-b border-brand-border">
                                            <tr>
                                                <th className="p-3">Статус</th>
                                                <th className="p-3">Оборудование</th>
                                                <th className="p-3">Дата Плановая</th>
                                                <th className="p-3 text-right">Срок</th>
                                                <th className="p-3 text-center">Действие</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-border">
                                            {upcoming.map((item, idx) => (
                                                <tr key={item.equipment.id + idx} className="hover:bg-brand-secondary">
                                                    <td className="p-3">
                                                        {item.daysUntilDue < 0 ? (
                                                            <Tooltip text="Просрочено!"><span className="inline-block w-3 h-3 rounded-full bg-red-500"></span></Tooltip>
                                                        ) : item.daysUntilDue <= 3 ? (
                                                             <Tooltip text="Срочно"><span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span></Tooltip>
                                                        ) : (
                                                             <Tooltip text="Планово"><span className="inline-block w-3 h-3 rounded-full bg-sky-500"></span></Tooltip>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-medium text-brand-text-primary">{item.equipment.name}</td>
                                                    <td className="p-3">{new Date(item.equipment.nextMaintenanceDate!).toLocaleDateString()}</td>
                                                    <td className="p-3 text-right">{getDaysLabel(item.daysUntilDue)}</td>
                                                    <td className="p-3 text-center">
                                                        <Button size="sm" variant="secondary" onClick={() => navigate(`${ROUTE_PATHS.EQUIPMENT}/${item.equipment.id}`)}>
                                                            Открыть
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}

                    {activeTab === 'breakdowns' && (
                         <div className="grid grid-cols-1 gap-4">
                             {breakdowns.length === 0 ? (
                                 <Card><p className="text-center text-emerald-500 py-8 flex items-center justify-center"><CheckCircleIcon className="h-6 w-6 mr-2"/>Все оборудование исправно.</p></Card>
                             ) : (
                                 breakdowns.map(eq => (
                                     <Card key={eq.id} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
                                         <div className="flex justify-between items-center">
                                             <div>
                                                 <h3 className="font-bold text-lg text-red-800 dark:text-red-200">{eq.name}</h3>
                                                 <p className="text-sm text-red-700 dark:text-red-300 mt-1">Статус: Неисправно</p>
                                             </div>
                                             <Button variant="danger" onClick={() => navigate(`${ROUTE_PATHS.EQUIPMENT}/${eq.id}`)}>
                                                 Перейти к ремонту
                                             </Button>
                                         </div>
                                     </Card>
                                 ))
                             )}
                         </div>
                    )}

                    {activeTab === 'history' && (
                        <Card>
                            <div className="overflow-x-auto max-h-[600px] custom-scrollbar-thin">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-brand-surface text-brand-text-muted font-medium border-b border-brand-border sticky top-0">
                                        <tr>
                                            <th className="p-3">Дата</th>
                                            <th className="p-3">Оборудование</th>
                                            <th className="p-3">Тип работ</th>
                                            <th className="p-3">Описание</th>
                                            <th className="p-3">Исполнитель</th>
                                            <th className="p-3 text-right">Стоимость</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border">
                                        {history.map((h, idx) => (
                                            <tr key={h.record.id + idx} className="hover:bg-brand-secondary">
                                                <td className="p-3 whitespace-nowrap">{new Date(h.record.date).toLocaleDateString()}</td>
                                                <td className="p-3 font-medium text-brand-text-primary">
                                                    <Link to={`${ROUTE_PATHS.EQUIPMENT}/${h.equipmentId}`} className="hover:text-sky-500 flex items-center">
                                                        {h.equipmentName}
                                                        <ChevronRightIcon className="h-3 w-3 ml-1 opacity-50"/>
                                                    </Link>
                                                </td>
                                                <td className="p-3">
                                                     <span className={`px-2 py-1 rounded text-xs ${h.record.type === 'repair' ? 'bg-red-100 text-red-800' : h.record.type === 'routine' ? 'bg-sky-100 text-sky-800' : 'bg-zinc-100 text-zinc-800'}`}>
                                                        {h.record.type === 'routine' ? 'ТО' : h.record.type === 'repair' ? 'Ремонт' : 'Осмотр'}
                                                    </span>
                                                </td>
                                                <td className="p-3 truncate max-w-xs" title={h.record.description}>{h.record.description}</td>
                                                <td className="p-3 text-brand-text-secondary">{h.record.technician}</td>
                                                <td className="p-3 text-right font-mono">{h.record.cost > 0 ? `${h.record.cost} ₽` : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MaintenancePage;
