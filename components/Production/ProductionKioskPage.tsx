
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { ProductionOrder, ProductionOrderItem, WarehouseItemIncident, DailyStats, ShiftHandover, User, WarehouseItem } from '../../types';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ArrowLeftIcon, PlayCircleIcon, CheckCircleIcon, ClockIcon, UserCircleIcon, ExclamationTriangleIcon, XCircleIcon, BanknotesIcon, FireIcon, ClipboardDocumentListIcon, QrCodeIcon, UserGroupIcon, StarIcon, HeartIcon } from '../UI/Icons';
import { ROUTE_PATHS, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import ProductionRunModal from './ProductionRunModal'; 
import Modal from '../UI/Modal';
import { useAppSettings } from '../../hooks/useAppSettings';
import Tooltip from '../UI/Tooltip';
import ScannerModal from '../UI/ScannerModal';

const ProductionKioskPage: React.FC = () => {
    const { user } = useAuth();
    const { systemMode } = useAppSettings();
    const navigate = useNavigate();
    const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClocking, setIsClocking] = useState(false);
    const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    
    const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
    const [selectedItem, setSelectedItem] = useState<ProductionOrderItem | null>(null);
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);

    // Global Scanner state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannedItem, setScannedItem] = useState<WarehouseItem | null>(null);

    // Incident Reporting State
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [incidentType, setIncidentType] = useState<WarehouseItemIncident['type']>('damage');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [isReportingIncident, setIsReportingIncident] = useState(false);
    
    // Shift Handover & Peer Review State
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false); 
    const [isPeerReviewStep, setIsPeerReviewStep] = useState(false);
    const [peerScores, setPeerScores] = useState<Record<string, number>>({}); // userId -> score (0 or 1)
    const [handoverData, setHandoverData] = useState<Partial<ShiftHandover>>({
        notes: '', issuesFlagged: false, cleanlinessChecked: false, equipmentChecked: false
    });
    
    const [elapsedTime, setElapsedTime] = useState<string>('00:00');

    const fetchKioskData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [allOrders, stats, users] = await Promise.all([
                apiService.getProductionOrders({ viewMode: 'active' }),
                apiService.getDailyStats(user.id),
                apiService.getUsersForAssignee(user.id)
            ]);
            
            const relevantOrders = allOrders.filter(o => 
                (o.assignedToId === user.id || !o.assignedToId) &&
                ['Готово к запуску', 'В производстве', 'Приостановлено'].includes(o.status)
            );
            setActiveOrders(relevantOrders);
            setDailyStats(stats);
            setTeamMembers(users.filter(u => u.id !== user.id && u.role === 'employee'));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchKioskData();
        const interval = setInterval(fetchKioskData, 60000);
        return () => clearInterval(interval);
    }, [fetchKioskData]);
    
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
        }
    }, [dailyStats]);

    const handleEndShiftInitiate = () => {
        setHandoverData({ notes: '', issuesFlagged: false, cleanlinessChecked: false, equipmentChecked: false });
        setIsPeerReviewStep(false);
        setPeerScores({});
        setIsHandoverModalOpen(true);
    };

    const handleGoToPeerReview = () => {
        setIsPeerReviewStep(true);
    };

    const togglePeerScore = (targetUserId: string) => {
        setPeerScores(prev => ({
            ...prev,
            [targetUserId]: prev[targetUserId] === 1 ? 0 : 1
        }));
    };

    const handleEndShiftConfirm = async () => {
        if (!user) return;
        setIsClocking(true);
        try {
            // 1. Submit Handover
            await apiService.createShiftHandover({
                outgoingUserId: user.id,
                outgoingUserName: user.name || user.email,
                notes: handoverData.notes || 'Смена сдана.',
                issuesFlagged: handoverData.issuesFlagged || false,
                cleanlinessChecked: handoverData.cleanlinessChecked || false,
                equipmentChecked: handoverData.equipmentChecked || false,
            });

            // 2. Submit Peer Reviews
            const reviews = Object.entries(peerScores).map(([id, score]) => ({
                fromUserId: user.id,
                toUserId: id,
                score
            }));
            if (reviews.length > 0) {
                await (apiService as any).submitPeerReviews(reviews);
            }

            // 3. Clock out
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

    const handleGlobalScan = async (code: string) => {
        setIsScannerOpen(false);
        try {
            const items = await apiService.getWarehouseItems({ searchTerm: code });
            const found = items.find(i => i.sku === code || i.id === code);
            if (found) {
                setScannedItem(found);
            } else {
                alert("Товар не найден в базе.");
            }
        } catch (e) {
            alert("Ошибка при поиске товара.");
        }
    };

    const isShiftActive = dailyStats?.shiftStatus === 'active';

    return (
        <div className={`min-h-screen flex flex-col ${systemMode === 'mobilization' ? 'bg-red-950 text-red-50' : 'bg-zinc-900 text-zinc-100'}`}>
            
            {/* Top Bar */}
            <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-20 shadow-lg ${systemMode === 'mobilization' ? 'bg-red-900 border-red-700' : 'bg-zinc-800 border-zinc-700'}`}>
                <div className="flex items-center gap-4">
                     <Button onClick={() => navigate(ROUTE_PATHS.PRODUCTION)} variant="secondary" className="bg-zinc-700 h-14 w-14 !p-0 rounded-2xl">
                        <ArrowLeftIcon className="h-8 w-8 text-white"/>
                    </Button>
                    <h1 className="text-3xl font-black tracking-tighter">ЦЕХ.ТЕРМИНАЛ</h1>
                </div>
                
                <div className="flex items-center gap-6">
                     {isShiftActive && (
                         <div className="flex items-center gap-6 bg-black/40 px-6 py-2 rounded-2xl border border-white/10">
                             <div className="text-center">
                                 <span className="text-[10px] uppercase font-black opacity-50 block">СМЕНА</span>
                                 <span className="text-2xl font-mono font-black">{elapsedTime}</span>
                             </div>
                             <div className="text-center">
                                 <span className="text-[10px] uppercase font-black opacity-50 block">КТУ</span>
                                 <span className={`text-2xl font-mono font-black ${(dailyStats?.currentKTU || 1) >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>{dailyStats?.currentKTU}</span>
                             </div>
                         </div>
                     )}

                    {!isShiftActive ? (
                        <button 
                            onClick={async () => {
                                setIsClocking(true);
                                await apiService.startWorkShift(user!.id);
                                await fetchKioskData();
                                setIsClocking(false);
                            }} 
                            disabled={isClocking}
                            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-900 font-black py-4 px-10 rounded-2xl text-2xl shadow-xl transform active:scale-95 transition-all flex items-center"
                        >
                            {isClocking ? <LoadingSpinner size="sm"/> : <ClockIcon className="h-10 w-10 mr-3"/>}
                            СТАРТ СМЕНЫ
                        </button>
                    ) : (
                         <button 
                            onClick={handleEndShiftInitiate} 
                            disabled={isClocking}
                            className="bg-red-600 hover:bg-red-500 text-white font-black py-4 px-10 rounded-2xl text-2xl shadow-xl transform active:scale-95 transition-all flex items-center"
                        >
                            {isClocking ? <LoadingSpinner size="sm"/> : <XCircleIcon className="h-10 w-10 mr-3"/>}
                            ЗАКОНЧИТЬ
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-grow p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full"><LoadingSpinner size="lg"/></div>
                ) : (
                    <div className="max-w-6xl mx-auto space-y-6">
                         {isShiftActive && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button 
                                    onClick={() => setIsIncidentModalOpen(true)}
                                    className="bg-orange-600 hover:bg-orange-500 text-white rounded-3xl p-8 flex items-center justify-center gap-4 font-black text-2xl transition-all shadow-xl active:translate-y-1"
                                >
                                    <ExclamationTriangleIcon className="h-12 w-12"/>
                                    ПРОБЛЕМА!
                                </button>
                                <button 
                                    onClick={() => setIsScannerOpen(true)}
                                    className="bg-zinc-800 border-4 border-zinc-700 hover:border-sky-500 text-zinc-400 hover:text-sky-400 rounded-3xl p-8 flex items-center justify-center gap-4 font-black text-2xl transition-all shadow-xl active:translate-y-1"
                                >
                                    <QrCodeIcon className="h-12 w-12"/>
                                    СКАНЕР
                                </button>
                            </div>
                         )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeOrders.map(order => (
                                <div key={order.id} className="bg-zinc-800 rounded-3xl border-2 border-zinc-700 overflow-hidden shadow-2xl flex flex-col">
                                    <div className="p-5 bg-zinc-700/50 flex justify-between items-center">
                                        <h3 className="font-black text-xl truncate pr-4">{order.name}</h3>
                                        <span className="text-xs font-mono bg-black/30 px-3 py-1 rounded-full">{order.id}</span>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {order.orderItems.map(item => (
                                            <div key={item.id} className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-700/50">
                                                <h4 className="text-2xl font-bold mb-4">{item.productName}</h4>
                                                
                                                <div className="flex justify-between items-end mb-6">
                                                    <div className="text-center bg-black/40 p-4 rounded-2xl w-[45%]">
                                                        <span className="text-xs font-black opacity-40 block mb-1">НУЖНО</span>
                                                        <span className="text-3xl font-black">{item.plannedQuantity}</span>
                                                        <span className="text-sm ml-1 opacity-50">{item.unit}</span>
                                                    </div>
                                                    <div className="text-center bg-emerald-950/40 p-4 rounded-2xl w-[45%] border border-emerald-500/20">
                                                        <span className="text-xs font-black text-emerald-500/60 block mb-1">ГОТОВО</span>
                                                        <span className="text-3xl font-black text-emerald-400">{item.producedQuantity || 0}</span>
                                                        <span className="text-sm ml-1 text-emerald-400/50">{item.unit}</span>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => handleOpenTask(order, item)}
                                                    className={`w-full py-6 rounded-2xl text-2xl font-black shadow-2xl transform transition-all flex items-center justify-center gap-3 ${isShiftActive ? 'bg-sky-500 hover:bg-sky-400 text-zinc-900 active:scale-95' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'}`}
                                                    disabled={!isShiftActive}
                                                >
                                                    <PlayCircleIcon className="h-10 w-10"/>
                                                    РАБОТАТЬ
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
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

            <ScannerModal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                onScan={handleGlobalScan} 
                title="Идентификация по QR"
            />

            {scannedItem && (
                <Modal isOpen={!!scannedItem} onClose={() => setScannedItem(null)} title="Информация о товаре">
                    <div className="space-y-4">
                        <div className="p-4 bg-brand-secondary rounded-xl border border-brand-border">
                            <p className="text-xs font-black text-brand-text-muted uppercase mb-1">Название / SKU</p>
                            <p className="text-xl font-bold">{scannedItem.name}</p>
                            <p className="text-sm font-mono text-sky-400">{scannedItem.sku}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border text-center">
                                <p className="text-xs font-black text-brand-text-muted uppercase mb-1">На складе</p>
                                <p className="text-3xl font-black">{scannedItem.quantity}</p>
                            </div>
                            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border text-center">
                                <p className="text-xs font-black text-brand-text-muted uppercase mb-1">Цена</p>
                                <p className="text-3xl font-black text-emerald-500">{scannedItem.price} ₽</p>
                            </div>
                        </div>
                        <Button fullWidth onClick={() => setScannedItem(null)}>Закрыть</Button>
                    </div>
                </Modal>
            )}

            {isHandoverModalOpen && (
                <Modal isOpen={isHandoverModalOpen} onClose={() => setIsHandoverModalOpen(false)} title={isPeerReviewStep ? "Товарищеская Оценка" : "Сдача смены"} zIndex="z-[100]" size="lg">
                     {!isPeerReviewStep ? (
                         <div className="space-y-6">
                            <div className="space-y-4">
                                <button onClick={() => setHandoverData(p=>({...p, cleanlinessChecked: !p.cleanlinessChecked}))} className={`w-full p-6 rounded-2xl flex items-center border-4 transition-all ${handoverData.cleanlinessChecked ? 'border-emerald-500 bg-emerald-500/20' : 'border-zinc-700 bg-zinc-800'}`}>
                                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center mr-4 ${handoverData.cleanlinessChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>{handoverData.cleanlinessChecked && <CheckCircleIcon className="text-white"/>}</div>
                                    <span className="text-2xl font-bold">Рабочее место убрано</span>
                                </button>
                                <button onClick={() => setHandoverData(p=>({...p, equipmentChecked: !p.equipmentChecked}))} className={`w-full p-6 rounded-2xl flex items-center border-4 transition-all ${handoverData.equipmentChecked ? 'border-emerald-500 bg-emerald-500/20' : 'border-zinc-700 bg-zinc-800'}`}>
                                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center mr-4 ${handoverData.equipmentChecked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>{handoverData.equipmentChecked && <CheckCircleIcon className="text-white"/>}</div>
                                    <span className="text-2xl font-bold">Оборудование проверено</span>
                                </button>
                            </div>
                            <textarea 
                                value={handoverData.notes} 
                                onChange={e => setHandoverData(prev => ({...prev, notes: e.target.value}))}
                                className="w-full p-6 text-xl bg-zinc-900 border-2 border-zinc-700 rounded-2xl h-32"
                                placeholder="Важные заметки для следующей смены..."
                            />
                            <Button 
                                onClick={handleGoToPeerReview} 
                                fullWidth size="lg"
                                disabled={!handoverData.cleanlinessChecked || !handoverData.equipmentChecked}
                                className="py-6 text-2xl font-black bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-30"
                            >
                                К ОЦЕНКЕ ТОВАРИЩЕЙ
                            </Button>
                         </div>
                     ) : (
                         <div className="space-y-6">
                            <p className="text-lg text-brand-text-secondary text-center">
                                Отметьте товарищей, чей вклад в эту смену был особенно полезен (взаимовыручка, дисциплина).
                            </p>
                            <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar-thin">
                                {teamMembers.map(tm => (
                                    <button 
                                        key={tm.id}
                                        onClick={() => togglePeerScore(tm.id)}
                                        className={`p-4 rounded-2xl flex justify-between items-center border-4 transition-all ${peerScores[tm.id] ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-800'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center font-bold">{tm.name?.charAt(0)}</div>
                                            <span className="text-xl font-bold">{tm.name}</span>
                                        </div>
                                        {peerScores[tm.id] ? <HeartIcon className="h-8 w-8 text-amber-500 fill-current"/> : <HeartIcon className="h-8 w-8 text-zinc-600"/>}
                                    </button>
                                ))}
                                {teamMembers.length === 0 && <p className="text-center italic text-brand-text-muted">Вы работали один в эту смену.</p>}
                            </div>
                            <div className="flex gap-4">
                                <Button variant="secondary" fullWidth size="lg" onClick={() => setIsPeerReviewStep(false)}>НАЗАД</Button>
                                <Button 
                                    onClick={handleEndShiftConfirm} 
                                    fullWidth size="lg"
                                    isLoading={isClocking} 
                                    className="bg-red-600 hover:bg-red-500 text-white py-6 text-2xl font-black"
                                >
                                    ЗАВЕРШИТЬ СМЕНУ
                                </Button>
                            </div>
                         </div>
                     )}
                </Modal>
            )}
        </div>
    );
};

export default ProductionKioskPage;
