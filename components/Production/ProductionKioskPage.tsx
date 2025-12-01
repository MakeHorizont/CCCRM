
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { ProductionOrder, ProductionOrderItem, WarehouseItemIncident, DailyStats, ShiftHandover } from '../../types';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ArrowLeftIcon, PlayCircleIcon, CheckCircleIcon, ClockIcon, UserCircleIcon, ExclamationTriangleIcon, XCircleIcon, BanknotesIcon, FireIcon, ClipboardDocumentListIcon } from '../UI/Icons';
import { ROUTE_PATHS, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import ProductionRunModal from './ProductionRunModal'; 
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import { useAppSettings } from '../../hooks/useAppSettings';

const ProductionKioskPage: React.FC = () => {
    const { user } = useAuth();
    const { systemMode } = useAppSettings();
    const navigate = useNavigate();
    const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);
    const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
    
    const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
    const [selectedItem, setSelectedItem] = useState<ProductionOrderItem | null>(null);
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);

    // Incident Reporting State
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [incidentType, setIncidentType] = useState<WarehouseItemIncident['type']>('damage');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [isReportingIncident, setIsReportingIncident] = useState(false);
    
    // Shift Handover State
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false); // For ending shift
    const [isHandoverBriefingOpen, setIsHandoverBriefingOpen] = useState(false); // For starting shift
    const [lastHandover, setLastHandover] = useState<ShiftHandover | null>(null);
    const [handoverData, setHandoverData] = useState<Partial<ShiftHandover>>({
        notes: '', issuesFlagged: false, cleanlinessChecked: false, equipmentChecked: false
    });
    
    // Shift Timer
    const [elapsedTime, setElapsedTime] = useState<string>('00:00');

    const fetchKioskData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [allOrders, stats] = await Promise.all([
                apiService.getProductionOrders({ viewMode: 'active' }),
                apiService.getDailyStats(user.id)
            ]);
            
            const relevantOrders = allOrders.filter(o => 
                (o.assignedToId === user.id || !o.assignedToId) &&
                ['Готово к запуску', 'В производстве', 'Приостановлено'].includes(o.status)
            );
            setActiveOrders(relevantOrders);
            setDailyStats(stats);

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchKioskData();
        const interval = setInterval(fetchKioskData, 60000); // Refresh every minute to update stats
        return () => clearInterval(interval);
    }, [fetchKioskData]);
    
    // Shift Timer Logic
    useEffect(() => {
        if (dailyStats?.shiftStatus === 'active' && dailyStats.checkInTime) {
            const interval = setInterval(() => {
                const start = new Date(dailyStats.checkInTime!).getTime();
                const now = new Date().getTime();
                const diff = now - start;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setElapsedTime('00:00');
        }
    }, [dailyStats]);

    const handleStartShiftInitiate = async () => {
        setIsClocking(true);
        try {
            // Check for previous handover
            const lastHO = await apiService.getLastShiftHandover();
            if (lastHO && !lastHO.acceptedAt) {
                setLastHandover(lastHO);
                setIsHandoverBriefingOpen(true); // Show briefing first
            } else {
                // No handover to accept, just start
                await handleStartShiftConfirm();
            }
        } catch (err) {
            console.error("Failed to check handover", err);
            // If error, fallback to normal start
            await handleStartShiftConfirm();
        } finally {
            setIsClocking(false);
        }
    };

    const handleStartShiftConfirm = async () => {
        if (!user) return;
        try {
            await apiService.startWorkShift(user.id);
            setIsHandoverBriefingOpen(false);
            await fetchKioskData();
        } catch (err) {
            alert((err as Error).message);
        }
    };

    const handleEndShiftInitiate = () => {
        // Open Handover form
        setHandoverData({ notes: '', issuesFlagged: false, cleanlinessChecked: false, equipmentChecked: false });
        setIsHandoverModalOpen(true);
    };

    const handleEndShiftConfirm = async () => {
        if (!user) return;
        setIsClocking(true);
        try {
            // 1. Create Handover Record
            await apiService.createShiftHandover({
                outgoingUserId: user.id,
                outgoingUserName: user.name || user.email,
                notes: handoverData.notes || 'Смена сдана без примечаний.',
                issuesFlagged: handoverData.issuesFlagged || false,
                cleanlinessChecked: handoverData.cleanlinessChecked || false,
                equipmentChecked: handoverData.equipmentChecked || false,
            });

            // 2. End Shift
            await apiService.endWorkShift(user.id);
            setIsHandoverModalOpen(false);
            await fetchKioskData();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setIsClocking(false);
        }
    };

    const handleOpenTask = (order: ProductionOrder, item: ProductionOrderItem) => {
        setSelectedOrder(order);
        setSelectedItem(item);
        setIsRunModalOpen(true);
    };
    
    const handleCloseTask = () => {
        setIsRunModalOpen(false);
        setSelectedOrder(null);
        setSelectedItem(null);
        fetchKioskData();
    };

    const handleSubmitIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !incidentDescription.trim()) return;
        setIsReportingIncident(true);
        try {
            const itemId = selectedItem?.warehouseItemId || 'GENERAL_ISSUE'; 
            await apiService.addIncident({
                warehouseItemId: itemId,
                userId: user.id,
                type: incidentType,
                description: `[КИОСК] ${incidentDescription}`,
            });
            setIsIncidentModalOpen(false);
            setIncidentDescription('');
            alert("Проблема зарегистрирована. Мастер уведомлен.");
        } catch(err) {
            alert((err as Error).message);
        } finally {
            setIsReportingIncident(false);
        }
    };

    const isShiftActive = dailyStats?.shiftStatus === 'active';

    return (
        <div className={`min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white ${systemMode === 'mobilization' ? 'bg-red-950 text-red-50' : 'bg-zinc-900 text-zinc-100'}`}>
            
            {/* Top Bar */}
            <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-20 shadow-md ${systemMode === 'mobilization' ? 'bg-red-900 border-red-700' : 'bg-zinc-800 border-zinc-700'}`}>
                <div className="flex items-center gap-4">
                     <Button onClick={() => navigate(ROUTE_PATHS.PRODUCTION)} variant="secondary" className="bg-zinc-700 text-zinc-200 border-zinc-600 hover:bg-zinc-600 h-12 w-12 !p-0 rounded-xl">
                        <ArrowLeftIcon className="h-8 w-8"/>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center">
                            {systemMode === 'mobilization' && <FireIcon className="h-8 w-8 mr-2 text-yellow-400 animate-pulse"/>}
                            ТЕРМИНАЛ ЦЕХА
                        </h1>
                        <p className="text-sm opacity-80 font-medium">{user?.name}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                     {isShiftActive && (
                         <div className="hidden md:flex items-center gap-4 bg-black/30 px-4 py-2 rounded-xl border border-white/10">
                             <div className="text-center">
                                 <span className="text-xs uppercase tracking-widest opacity-60 block">Смена</span>
                                 <span className="text-xl font-mono font-bold">{elapsedTime}</span>
                             </div>
                             <div className="h-8 w-px bg-white/20"></div>
                             <div className="text-center">
                                 <span className="text-xs uppercase tracking-widest opacity-60 block">Заработано</span>
                                 <span className="text-xl font-mono font-bold text-emerald-400">{dailyStats?.earnedTotal} ₽</span>
                             </div>
                              <div className="h-8 w-px bg-white/20"></div>
                             <div className="text-center">
                                 <span className="text-xs uppercase tracking-widest opacity-60 block">КТУ</span>
                                 <span className={`text-xl font-mono font-bold ${(dailyStats?.currentKTU || 1) >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{dailyStats?.currentKTU}</span>
                             </div>
                         </div>
                     )}

                    {!isShiftActive ? (
                        <button 
                            onClick={handleStartShiftInitiate} 
                            disabled={isClocking}
                            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl text-xl shadow-lg transform active:scale-95 transition-all flex items-center"
                        >
                            {isClocking ? <LoadingSpinner size="sm" color="text-white"/> : <ClockIcon className="h-8 w-8 mr-2"/>}
                            НАЧАТЬ СМЕНУ
                        </button>
                    ) : (
                         <button 
                            onClick={handleEndShiftInitiate} 
                            disabled={isClocking}
                            className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold py-3 px-8 rounded-xl text-xl shadow-lg transform active:scale-95 transition-all flex items-center"
                        >
                            {isClocking ? <LoadingSpinner size="sm" color="text-white"/> : <XCircleIcon className="h-8 w-8 mr-2"/>}
                            ЗАКОНЧИТЬ
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full"><LoadingSpinner size="lg" color="text-zinc-400"/></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                         {/* Issue Report Button (Always visible in shift) */}
                         {isShiftActive && (
                            <button 
                                onClick={() => setIsIncidentModalOpen(true)}
                                className="col-span-full bg-orange-900/20 border-2 border-orange-700/50 hover:bg-orange-900/40 text-orange-300 rounded-2xl p-6 flex items-center justify-center gap-4 font-bold text-xl transition-all active:scale-[0.99]"
                            >
                                <ExclamationTriangleIcon className="h-10 w-10"/>
                                СООБЩИТЬ О ПРОБЛЕМЕ (БРАК / ПОЛОМКА)
                            </button>
                         )}

                        {activeOrders.map(order => (
                            <div key={order.id} className="bg-zinc-800 rounded-2xl border border-zinc-700 shadow-xl flex flex-col h-full overflow-hidden">
                                <div className={`p-4 border-b border-zinc-700 flex justify-between items-center ${PRODUCTION_ORDER_STATUS_COLOR_MAP[order.status] || 'bg-zinc-700'} `}>
                                    <span className="font-bold text-lg truncate max-w-[70%]">{order.name}</span>
                                    <span className="text-xs font-mono opacity-80 bg-black/20 px-2 py-1 rounded">{order.id}</span>
                                </div>
                                <div className="p-4 flex-grow space-y-4 bg-zinc-800/50">
                                    {order.orderItems.map(item => (
                                        <div key={item.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 flex flex-col gap-3 shadow-inner">
                                            <h3 className="font-medium text-zinc-200 text-xl leading-tight">{item.productName}</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4 p-3 bg-black/30 rounded-lg">
                                                <div>
                                                    <span className="text-xs text-zinc-500 uppercase font-bold">План</span>
                                                    <div className="text-white font-black text-2xl">{item.plannedQuantity} <span className="text-sm font-normal text-zinc-400">{item.unit}</span></div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-zinc-500 uppercase font-bold">Факт</span>
                                                    <div className="text-emerald-400 font-black text-2xl">{item.producedQuantity || 0} <span className="text-sm font-normal text-emerald-400/70">{item.unit}</span></div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleOpenTask(order, item)}
                                                className={`w-full py-4 rounded-xl text-xl font-bold shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isShiftActive ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}
                                                disabled={!isShiftActive}
                                            >
                                                <PlayCircleIcon className="h-8 w-8"/>
                                                В РАБОТУ
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {order.assignedToId && (
                                    <div className="p-3 bg-zinc-800 border-t border-zinc-700 flex items-center justify-center text-zinc-400 text-sm">
                                        <UserCircleIcon className="h-4 w-4 mr-2"/> {order.assignedToId === user?.id ? 'Ваше задание' : 'Чужое задание'}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {activeOrders.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-32 text-zinc-600">
                                <CheckCircleIcon className="h-32 w-32 mb-6 opacity-20"/>
                                <h2 className="text-3xl font-bold mb-2">Заданий нет</h2>
                                <p className="text-xl">Все планы выполнены. Ожидайте указаний мастера.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {isRunModalOpen && selectedOrder && selectedItem && (
                <ProductionRunModal
                    isOpen={isRunModalOpen}
                    onClose={handleCloseTask}
                    order={selectedOrder}
                    itemToProduce={selectedItem}
                />
            )}

            {/* Incident Reporting Modal */}
             {isIncidentModalOpen && (
                <Modal isOpen={isIncidentModalOpen} onClose={() => setIsIncidentModalOpen(false)} title="Сообщить о проблеме" zIndex="z-[100]">
                    <form onSubmit={handleSubmitIncident} className="space-y-6 p-2">
                        <div>
                            <label className="block text-lg font-bold text-brand-text-primary mb-2">Что случилось?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    {id: 'damage', label: 'Поломка оборудования'},
                                    {id: 'shortage', label: 'Нехватка сырья'},
                                    {id: 'defect', label: 'Брак продукции'},
                                    {id: 'other', label: 'Другое'}
                                ] as const).map(type => (
                                    <button 
                                        key={type.id}
                                        type="button"
                                        onClick={() => setIncidentType(type.id)}
                                        className={`p-4 rounded-xl text-lg font-medium border-2 ${incidentType === type.id ? 'border-sky-500 bg-sky-500/20 text-sky-400' : 'border-brand-border bg-brand-card'}`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-lg font-bold text-brand-text-primary mb-2">Детали</label>
                            <textarea 
                                value={incidentDescription} 
                                onChange={e => setIncidentDescription(e.target.value)} 
                                className="w-full p-4 text-lg bg-brand-card border border-brand-border rounded-xl h-32 focus:ring-2 focus:ring-sky-500"
                                placeholder="Опишите проблему..."
                            />
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="secondary" size="lg" onClick={() => setIsIncidentModalOpen(false)} disabled={isReportingIncident}>Отмена</Button>
                            <Button type="submit" variant="danger" size="lg" isLoading={isReportingIncident}>Отправить</Button>
                        </div>
                    </form>
                </Modal>
            )}
            
            {/* Shift Handover Creation Modal */}
            {isHandoverModalOpen && (
                <Modal isOpen={isHandoverModalOpen} onClose={() => setIsHandoverModalOpen(false)} title="Передача Смены" zIndex="z-[100]" size="lg">
                     <div className="space-y-6 p-2">
                        <p className="text-brand-text-secondary">Заполните отчет для следующей смены. Это обязательно для завершения работы.</p>
                        
                        <div className="space-y-3">
                             <div className="flex items-center p-4 bg-brand-card rounded-xl border border-brand-border">
                                <input 
                                    type="checkbox" 
                                    id="ho-cleanliness" 
                                    className="w-6 h-6 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                                    checked={handoverData.cleanlinessChecked}
                                    onChange={e => setHandoverData(prev => ({...prev, cleanlinessChecked: e.target.checked}))}
                                />
                                <label htmlFor="ho-cleanliness" className="ml-4 text-lg font-medium cursor-pointer select-none">Рабочее место убрано (Чистота)</label>
                             </div>
                             <div className="flex items-center p-4 bg-brand-card rounded-xl border border-brand-border">
                                <input 
                                    type="checkbox" 
                                    id="ho-equipment" 
                                    className="w-6 h-6 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                                    checked={handoverData.equipmentChecked}
                                    onChange={e => setHandoverData(prev => ({...prev, equipmentChecked: e.target.checked}))}
                                />
                                <label htmlFor="ho-equipment" className="ml-4 text-lg font-medium cursor-pointer select-none">Оборудование выключено/исправно</label>
                             </div>
                        </div>

                        <div>
                            <label className="block text-lg font-bold text-brand-text-primary mb-2">Заметки для сменщика</label>
                            <textarea 
                                value={handoverData.notes} 
                                onChange={e => setHandoverData(prev => ({...prev, notes: e.target.value}))}
                                className="w-full p-4 text-lg bg-brand-card border border-brand-border rounded-xl h-32 focus:ring-2 focus:ring-sky-500"
                                placeholder="Например: 'Замочил сою в 18:00', 'Барахлит запайщик'..."
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="secondary" size="lg" onClick={() => setIsHandoverModalOpen(false)} disabled={isClocking}>Отмена</Button>
                            <Button 
                                onClick={handleEndShiftConfirm} 
                                size="lg" 
                                isLoading={isClocking} 
                                disabled={!handoverData.cleanlinessChecked || !handoverData.equipmentChecked}
                                className={!handoverData.cleanlinessChecked || !handoverData.equipmentChecked ? 'opacity-50' : 'bg-red-600 hover:bg-red-500 text-white'}
                            >
                                Сдать смену
                            </Button>
                        </div>
                     </div>
                </Modal>
            )}

             {/* Shift Briefing Modal */}
             {isHandoverBriefingOpen && lastHandover && (
                <Modal isOpen={isHandoverBriefingOpen} onClose={() => setIsHandoverBriefingOpen(false)} title="Прием Смены" zIndex="z-[100]" size="lg">
                    <div className="space-y-6 p-2">
                        <div className="bg-brand-secondary p-4 rounded-xl border-l-4 border-sky-500">
                            <h3 className="text-sm text-brand-text-muted mb-1 uppercase tracking-wider">Предыдущая смена</h3>
                            <p className="text-xl font-bold text-brand-text-primary">{lastHandover.outgoingUserName}</p>
                            <p className="text-sm opacity-70">{new Date(lastHandover.timestamp).toLocaleString('ru-RU')}</p>
                        </div>
                        
                        <div className="space-y-2">
                             <h3 className="text-lg font-bold text-brand-text-primary">Отчет:</h3>
                             <div className="p-4 bg-brand-card rounded-xl border border-brand-border text-lg whitespace-pre-wrap">
                                 {lastHandover.notes}
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                             <div className={`p-3 rounded-lg border ${lastHandover.cleanlinessChecked ? 'bg-emerald-900/20 border-emerald-700 text-emerald-400' : 'bg-red-900/20 border-red-700 text-red-400'}`}>
                                 {lastHandover.cleanlinessChecked ? 'Чистота: OK' : 'Чистота: НЕ ПРОВЕРЕНО'}
                             </div>
                             <div className={`p-3 rounded-lg border ${lastHandover.equipmentChecked ? 'bg-emerald-900/20 border-emerald-700 text-emerald-400' : 'bg-red-900/20 border-red-700 text-red-400'}`}>
                                 {lastHandover.equipmentChecked ? 'Оборудование: OK' : 'Оборудование: НЕ ПРОВЕРЕНО'}
                             </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="secondary" size="lg" onClick={() => setIsHandoverBriefingOpen(false)}>Отмена</Button>
                            <Button onClick={handleStartShiftConfirm} size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white" leftIcon={<ClipboardDocumentListIcon className="h-6 w-6"/>}>
                                Принять и Начать
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
};

export default ProductionKioskPage;
