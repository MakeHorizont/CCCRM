
import React, { useState, useEffect, ChangeEvent, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';
import ConfirmationModal from '../UI/ConfirmationModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductionOrder, User, WarehouseItem, Order as SalesOrder, ProductionOrderStatus, ProductionOrderItem, HouseholdItem, QualityCheck } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeftIcon, PencilSquareIcon, SaveIcon, PlusCircleIcon, TrashIcon, ExclamationTriangleIcon, ShoppingCartIcon, LockClosedIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../UI/Icons';
import { ROUTE_PATHS, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import { generateProductionOrderItemId } from '../../utils/idGenerators';
import { useAppSettings } from '../../hooks/useAppSettings';
import { qualityService } from '../../services/api/qualityService';

type EditorMode = 'view' | 'edit';

const ALL_PRODUCTION_STATUSES: ProductionOrderStatus[] = [
  'Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве', 
  'Контроль качества', 'Приостановлено', 'Завершено', 'Отменено'
];

// Statuses that require materials to be physically present (Active Production)
const MATERIAL_DEPENDENT_STATUSES: ProductionOrderStatus[] = [
    'Готово к запуску', 'В производстве', 'Контроль качества', 'Завершено'
];

const ProductionOrderEditorPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { systemMode } = useAppSettings();
    const isNew = !orderId;

    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [orderData, setOrderData] = useState<Partial<ProductionOrder>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [availableWarehouseItems, setAvailableWarehouseItems] = useState<WarehouseItem[]>([]);
    const [availableHouseholdItems, setAvailableHouseholdItems] = useState<HouseholdItem[]>([]);
    const [activeSalesOrders, setActiveSalesOrders] = useState<SalesOrder[]>([]);
    const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);
    const [relatedQualityChecks, setRelatedQualityChecks] = useState<QualityCheck[]>([]);
    
    const [selectedWarehouseItemId, setSelectedWarehouseItemId] = useState<string>('');
    const [newItemPlannedQuantity, setNewItemPlannedQuantity] = useState<number>(1);
    
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchPageData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const [whItems, hhItems, salesOrders, users] = await Promise.all([
                    apiService.getWarehouseItems({ viewMode: 'active' }),
                    apiService.getHouseholdItems({ viewMode: 'active' }),
                    apiService.getOrders({ viewMode: 'active' }),
                    apiService.getUsersForAssignee(user.id)
                ]);
                setAvailableWarehouseItems(whItems.filter(item => item.billOfMaterials && item.billOfMaterials.length > 0));
                setAvailableHouseholdItems(hhItems);
                setActiveSalesOrders(salesOrders);
                setUsersForAssigning(users);

                if (isNew) {
                    setOrderData({ name: '', orderItems: [], status: 'Планируется', assignedToId: null, isPlannedOrder: false });
                    setMode('edit');
                } else {
                    const poData = (await apiService.getProductionOrders({ viewMode: 'all' })).find(p => p.id === orderId);
                    if (poData) {
                        setOrderData(poData);
                        const checks = await qualityService.getQualityChecks({ relatedEntityId: poData.id });
                        setRelatedQualityChecks(checks);
                    } else {
                        setError("Производственное задание не найдено.");
                    }
                    setMode('view');
                }
            } catch (e) {
                setError("Ошибка загрузки данных.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPageData();
    }, [orderId, isNew, user]);
    
    // --- PHYSICS ENGINE: CALCULATE SHORTAGE ---
    // Automatically calculates if we have enough raw materials in HouseholdItems
    const shortageAnalysis = useMemo(() => {
        if (!orderData.orderItems || orderData.orderItems.length === 0) return { hasShortage: false, deficits: [] };

        const requiredMaterials = new Map<string, { needed: number, name: string, unit: string }>();

        // 1. Aggregate requirements from all items in the order
        orderData.orderItems.forEach(item => {
             // Prefer snapshot if exists (frozen history), else try to find current item (for new orders)
             const product = availableWarehouseItems.find(w => w.id === item.warehouseItemId);
             const bom = item.billOfMaterialsSnapshot && item.billOfMaterialsSnapshot.length > 0 
                ? item.billOfMaterialsSnapshot 
                : (product?.billOfMaterials || []);

             bom.forEach(bomItem => {
                 const totalNeeded = bomItem.quantityPerUnit * item.plannedQuantity;
                 const current = requiredMaterials.get(bomItem.householdItemId) || { needed: 0, name: bomItem.householdItemName, unit: bomItem.unit };
                 requiredMaterials.set(bomItem.householdItemId, { ...current, needed: current.needed + totalNeeded });
             });
        });

        const deficits: { name: string, needed: number, inStock: number, deficit: number, unit: string }[] = [];
        let hasShortage = false;

        // 2. Compare with Stock (HouseholdItems)
        requiredMaterials.forEach((req, hhItemId) => {
            const stockItem = availableHouseholdItems.find(h => h.id === hhItemId);
            const inStock = stockItem ? stockItem.quantity : 0;
            
            // Allow small floating point error tolerance (e.g. 0.0001)
            if (inStock < req.needed - 0.0001) {
                hasShortage = true;
                deficits.push({
                    name: req.name,
                    needed: req.needed,
                    inStock: inStock,
                    deficit: req.needed - inStock,
                    unit: req.unit
                });
            }
        });

        return { hasShortage, deficits };
    }, [orderData.orderItems, availableHouseholdItems, availableWarehouseItems]);


    const handleConfirmSave = async () => {
        if (!orderData.name?.trim()) { setError("Название обязательно"); setIsSaveConfirmOpen(false); return; }
        
        // Mobilization Mode Enforcement: Block saving active status if shortage exists
        if (systemMode === 'mobilization' && shortageAnalysis.hasShortage) {
             if (MATERIAL_DEPENDENT_STATUSES.includes(orderData.status || 'Планируется')) {
                 setError("РЕЖИМ МОБИЛИЗАЦИИ: Нельзя перевести задание в активный статус при дефиците сырья. Измените статус на 'Ожидает сырья' или пополните склад.");
                 setIsSaveConfirmOpen(false);
                 return;
             }
        }
        
        // Quality Control Enforcement for Completion
        if (orderData.status === 'Завершено' && systemMode === 'mobilization') {
            const hasPassedCheck = relatedQualityChecks.some(qc => qc.status === 'passed');
            if (!hasPassedCheck) {
                setError("РЕЖИМ МОБИЛИЗАЦИИ: Нельзя завершить задание без пройденной проверки ОТК. Вызовите инспектора.");
                setIsSaveConfirmOpen(false);
                return;
            }
        } else if (orderData.status === 'Завершено' && systemMode === 'development') {
            const hasPassedCheck = relatedQualityChecks.some(qc => qc.status === 'passed');
            if (!hasPassedCheck) {
                 if(!confirm("ПРЕДУПРЕЖДЕНИЕ: Вы завершаете задание без подтверждения ОТК. В режиме 'Развитие' это допустимо, но не рекомендуется. Продолжить?")) {
                     setIsSaveConfirmOpen(false);
                     return;
                 }
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                ...orderData,
                hasMaterialShortage: shortageAnalysis.hasShortage
            };

            if (orderData.id) {
                await apiService.updateProductionOrder(payload as ProductionOrder);
            } else {
                await apiService.addProductionOrder(payload as any);
            }
            navigate(ROUTE_PATHS.PRODUCTION);
        } catch(e) {
            setError((e as Error).message);
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setOrderData(prev => ({...prev, [name]: (type === 'checkbox' ? (e.target as HTMLInputElement).checked : value)}));
    };

    const handleAddOrderItem = () => {
        const product = availableWarehouseItems.find(p => p.id === selectedWarehouseItemId);
        if (!product) return;
        const newOrderItem: ProductionOrderItem = {
            id: generateProductionOrderItemId(),
            warehouseItemId: product.id,
            productName: product.name,
            plannedQuantity: newItemPlannedQuantity,
            producedQuantity: 0,
            unit: product.sku.toLowerCase().includes('chip') ? 'уп.' : (product.sku ? 'шт.' : 'ед.'),
            billOfMaterialsSnapshot: product.billOfMaterials || [],
        };
        setOrderData(prev => ({ ...prev, orderItems: [...(prev.orderItems || []), newOrderItem] }));
        setSelectedWarehouseItemId('');
    };
    
    const handleRemoveOrderItem = (itemId: string) => {
        setOrderData(prev => ({ ...prev, orderItems: (prev.orderItems || []).filter(item => item.id !== itemId) }));
    };
    
    const handleCreatePurchaseRequest = async () => {
        if (!orderData.id || !user) {
            setError("Сначала сохраните задание как 'Ожидает сырья'.");
            return;
        }
        setIsSaving(true);
        try {
            const newPR = await apiService.createPurchaseRequestFromShortage(orderData.id, user.id);
            navigate(`${ROUTE_PATHS.PURCHASING}/${newPR.id}`);
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCallOTK = async () => {
        if (!orderData.id || !user) return;
        setIsSaving(true);
        try {
            const newCheck = await qualityService.createQualityCheck({
                type: 'final', // Assuming final check for PO completion
                relatedEntityId: orderData.id,
                relatedEntityType: 'ProductionOrder',
                relatedEntityName: orderData.name,
                date: new Date().toISOString(),
                parameters: [], // In a real app, we'd fetch template parameters
            });
            setRelatedQualityChecks(prev => [newCheck, ...prev]);
            // Optionally open modal here, but creating pending check is enough for now
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error && !orderData.id && !isNew) return <p className="text-red-500">{error}</p>;
    if (!orderData) return null;
    
    const pageTitle = isNew ? 'Новое производственное задание' : (mode === 'edit' ? `Редактирование: ${orderData.name}` : `Задание: ${orderData.name}`);
    const isFormDisabled = mode === 'view' || isSaving;
    
    // Logic for locking status dropdown
    const isStatusBlockedByMobilization = systemMode === 'mobilization' && shortageAnalysis.hasShortage;

    return (
        <div className="space-y-4">
            <Button onClick={() => navigate(ROUTE_PATHS.PRODUCTION)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку заданий
            </Button>

            <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <div className="flex space-x-2">
                         {mode === 'view' && !orderData.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !orderData.isArchived && (
                             <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>

                {/* SHORTAGE BANNER (PHYSICS ENGINE FEEDBACK) */}
                {shortageAnalysis.hasShortage && (
                    <div className={`p-4 rounded-lg border-l-4 shadow-sm mb-4 transition-all animate-fade-in ${systemMode === 'mobilization' ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-600' : 'bg-amber-50 border-amber-500 dark:bg-amber-900/20 dark:border-amber-600'}`}>
                        <div className="flex items-start">
                            <ExclamationTriangleIcon className={`h-6 w-6 mr-3 flex-shrink-0 ${systemMode === 'mobilization' ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}/>
                            <div className="flex-grow">
                                <h3 className={`text-lg font-bold ${systemMode === 'mobilization' ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                    {systemMode === 'mobilization' ? 'БЛОКИРОВКА ЗАПУСКА: ДЕФИЦИТ СЫРЬЯ' : 'ПРЕДУПРЕЖДЕНИЕ: ДЕФИЦИТ СЫРЬЯ'}
                                </h3>
                                <p className={`text-sm mb-2 ${systemMode === 'mobilization' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                    {systemMode === 'mobilization' 
                                        ? 'В режиме "Мобилизация" запуск производства невозможен без полного обеспечения ресурсами. Пополните склад перед сменой статуса.' 
                                        : 'Недостаточно материалов. Вы можете запустить задание под свою ответственность (уйдем в минус), но это не рекомендуется.'}
                                </p>
                                <div className={`bg-white/70 dark:bg-black/30 rounded p-2 text-sm max-h-32 overflow-y-auto custom-scrollbar-thin ${systemMode === 'mobilization' ? 'border border-red-200' : ''}`}>
                                    <ul className="list-disc list-inside space-y-1">
                                        {shortageAnalysis.deficits.map((def, idx) => (
                                            <li key={idx} className="text-brand-text-primary">
                                                <strong>{def.name}:</strong> Нужно <span className="text-red-600 font-semibold">{def.needed.toFixed(2)}</span>, на складе {def.inStock.toFixed(2)}. 
                                                Дефицит: <span className="font-bold text-red-600">-{def.deficit.toFixed(2)} {def.unit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {orderData.id && (
                                    <div className="mt-3">
                                        <Button 
                                            type="button"
                                            size="sm" 
                                            onClick={handleCreatePurchaseRequest} 
                                            isLoading={isSaving} 
                                            leftIcon={<ShoppingCartIcon className="h-4 w-4"/>} 
                                            className="bg-white dark:bg-zinc-800 border border-brand-border hover:bg-gray-100 dark:hover:bg-zinc-700 text-brand-text-primary shadow-sm"
                                        >
                                            Создать заявку на закупку (из дефицита)
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Card>
                            <div className="space-y-4">
                                {error && <p className="text-red-500 p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</p>}
                                
                                <Input id="po-name" name="name" label="Название/Цель задания *" value={orderData.name || ''} onChange={handleInputChange} required disabled={isFormDisabled}/>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <label htmlFor="po-assignedToId" className="block text-sm font-medium mb-1 text-brand-text-primary">Ответственный</label>
                                        <select id="po-assignedToId" name="assignedToId" value={orderData.assignedToId || ''} onChange={handleInputChange} disabled={isFormDisabled}
                                            className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500">
                                            <option value="">Не назначен</option>
                                            {usersForAssigning.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="po-status" className="block text-sm font-medium mb-1 text-brand-text-primary">Статус</label>
                                        <div className="relative">
                                            <select 
                                                id="po-status" 
                                                name="status" 
                                                value={orderData.status || 'Планируется'} 
                                                onChange={handleInputChange} 
                                                disabled={isFormDisabled}
                                                className={`w-full bg-brand-card border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500 ${isStatusBlockedByMobilization ? 'border-red-300 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-brand-border'}`}
                                            >
                                                {ALL_PRODUCTION_STATUSES.map(s => (
                                                    <option 
                                                        key={s} 
                                                        value={s} 
                                                        disabled={isStatusBlockedByMobilization && MATERIAL_DEPENDENT_STATUSES.includes(s)}
                                                        className={isStatusBlockedByMobilization && MATERIAL_DEPENDENT_STATUSES.includes(s) ? 'text-gray-400 bg-gray-100' : ''}
                                                    >
                                                        {s} {isStatusBlockedByMobilization && MATERIAL_DEPENDENT_STATUSES.includes(s) ? '(Блок: нет сырья)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {isStatusBlockedByMobilization && !isFormDisabled && (
                                                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <LockClosedIcon className="h-5 w-5 text-red-500"/>
                                                </div>
                                            )}
                                        </div>
                                        {isStatusBlockedByMobilization && !isFormDisabled && (
                                            <p className="text-xs text-red-500 mt-1 flex items-center">
                                                <LockClosedIcon className="h-3 w-3 mr-1"/>
                                                Активные статусы заблокированы режимом Мобилизации.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Input id="po-plannedStartDate" name="plannedStartDate" type="date" label="План. дата начала" value={orderData.plannedStartDate?.split('T')[0] || ''} onChange={handleInputChange} disabled={isFormDisabled}/>
                                    <Input id="po-plannedEndDate" name="plannedEndDate" type="date" label="План. дата завершения" value={orderData.plannedEndDate?.split('T')[0] || ''} onChange={handleInputChange} disabled={isFormDisabled}/>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" name="isPlannedOrder" checked={orderData.isPlannedOrder || false} onChange={handleInputChange} className="h-4 w-4 text-sky-500 border-brand-border rounded focus:ring-sky-500" disabled={isFormDisabled}/>
                                        <span className="ml-2 text-sm text-brand-text-primary">Плановое задание (на склад)</span>
                                    </label>
                                    {!orderData.isPlannedOrder && (
                                        <div className="flex-grow">
                                            <label htmlFor="po-relatedSalesOrderId" className="sr-only">Связанный заказ</label>
                                            <select id="po-relatedSalesOrderId" name="relatedSalesOrderId" value={orderData.relatedSalesOrderId || ''} onChange={handleInputChange} disabled={isFormDisabled}
                                                className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500 text-sm">
                                                <option value="">Связать с заказом клиента...</option>
                                                {activeSalesOrders.map(so => <option key={so.id} value={so.id}>#{so.id} - {so.customerName}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                
                                <h4 className="text-md font-semibold pt-2 text-brand-text-primary">Продукция к производству:</h4>
                                <div className="space-y-2">
                                    {(orderData.orderItems || []).map(item => (
                                        <div key={item.id} className="p-2 bg-brand-surface rounded-md border border-brand-border/50">
                                            <div className="grid grid-cols-12 gap-x-2 items-center">
                                                <div className="col-span-12 md:col-span-6">
                                                    <p className="text-sm text-brand-text-primary truncate font-medium" title={item.productName}>{item.productName}</p>
                                                </div>
                                                <div className="col-span-6 md:col-span-2 mt-1 md:mt-0">
                                                     <span className="text-xs text-brand-text-muted block">План:</span>
                                                     <span className="text-sm font-semibold">{item.plannedQuantity} {item.unit}</span>
                                                </div>
                                                <div className="col-span-6 md:col-span-2 mt-1 md:mt-0">
                                                     <span className="text-xs text-brand-text-muted block">Факт:</span>
                                                     <span className="text-sm">{item.producedQuantity || 0} {item.unit}</span>
                                                </div>
                                                <div className="col-span-12 md:col-span-2 flex justify-end items-center mt-1 md:mt-0">
                                                    {!isFormDisabled && <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveOrderItem(item.id)} className="p-1.5"><TrashIcon className="h-4 w-4"/></Button>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(orderData.orderItems || []).length === 0 && (
                                        <p className="text-sm text-brand-text-muted text-center italic py-2">Список продукции пуст. Добавьте товары.</p>
                                    )}
                                </div>

                                {!isFormDisabled && (
                                    <div className="pt-3 border-t border-brand-border space-y-1">
                                        <h5 className="text-sm font-medium text-brand-text-primary">Добавить продукт</h5>
                                        <div className="flex items-end space-x-2">
                                            <div className="flex-grow">
                                                <label htmlFor="add-wh-item-select" className="sr-only">Продукт</label>
                                                <select id="add-wh-item-select" value={selectedWarehouseItemId} onChange={(e) => setSelectedWarehouseItemId(e.target.value)}
                                                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500">
                                                    <option value="" disabled>Выберите продукт со склада...</option>
                                                    {availableWarehouseItems.filter(wh => !(orderData.orderItems || []).some(i => i.warehouseItemId === wh.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-28">
                                                <Input id="new-item-qty" type="number" min="1" value={String(newItemPlannedQuantity)} onChange={(e) => setNewItemPlannedQuantity(parseInt(e.target.value) || 1)} placeholder="Кол-во" className="!p-2 text-sm"/>
                                            </div>
                                            <Button type="button" onClick={handleAddOrderItem} disabled={!selectedWarehouseItemId || newItemPlannedQuantity <= 0} leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* QUALITY CONTROL SIDEBAR */}
                    <div className="lg:col-span-1">
                        <Card className="h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-brand-text-primary flex items-center">
                                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-indigo-500"/>
                                    Контроль Качества
                                </h3>
                                {orderData.id && !isFormDisabled && (
                                     <Button size="sm" variant="secondary" onClick={handleCallOTK} className="text-xs">Вызвать ОТК</Button>
                                )}
                            </div>
                            
                            {!orderData.id ? (
                                <p className="text-sm text-brand-text-muted">Сохраните задание, чтобы назначить проверки качества.</p>
                            ) : relatedQualityChecks.length === 0 ? (
                                <div className="text-center py-4 bg-brand-surface rounded-lg border border-dashed border-brand-border">
                                    <p className="text-sm text-brand-text-muted">Проверок нет.</p>
                                    {!isFormDisabled && <p className="text-xs text-brand-text-secondary mt-1">Нажмите "Вызвать ОТК" для создания заявки.</p>}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {relatedQualityChecks.map(qc => (
                                        <div key={qc.id} className="p-3 bg-brand-surface rounded-lg border border-brand-border hover:border-brand-primary/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <span className="text-xs font-mono text-brand-text-muted">{qc.checkNumber}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    qc.status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                                                    qc.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-sky-100 text-sky-700'
                                                }`}>
                                                    {qc.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium mt-1">{qc.type === 'final' ? 'Финальная проверка' : 'Промежуточный контроль'}</p>
                                            {qc.inspectorName && <p className="text-xs text-brand-text-secondary mt-1">Инспектор: {qc.inspectorName}</p>}
                                            {qc.completedAt && <p className="text-[10px] text-brand-text-muted">{new Date(qc.completedAt).toLocaleString()}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded text-xs text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800">
                                <p className="font-semibold mb-1">Правило системы:</p>
                                <p>Для перевода в статус "Завершено" требуется минимум одна успешно пройденная проверка (Passed).</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </form>
             {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения?" confirmText="Сохранить" isLoading={isSaving} />}
        </div>
    );
};

export default ProductionOrderEditorPage;
