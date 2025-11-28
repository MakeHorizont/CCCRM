import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';
import ConfirmationModal from '../UI/ConfirmationModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductionOrder, User, WarehouseItem, Order as SalesOrder, ProductionOrderStatus, ProductionOrderItem } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeftIcon, PencilSquareIcon, SaveIcon, PlusCircleIcon, TrashIcon } from '../UI/Icons';
import { ROUTE_PATHS, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import { generateProductionOrderItemId } from '../../utils/idGenerators';

type EditorMode = 'view' | 'edit';

const ALL_PRODUCTION_STATUSES: ProductionOrderStatus[] = [
  'Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве', 
  'Контроль качества', 'Приостановлено', 'Завершено', 'Отменено'
];

const ProductionOrderEditorPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !orderId;

    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [orderData, setOrderData] = useState<Partial<ProductionOrder>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [availableWarehouseItems, setAvailableWarehouseItems] = useState<WarehouseItem[]>([]);
    const [activeSalesOrders, setActiveSalesOrders] = useState<SalesOrder[]>([]);
    const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);
    
    const [selectedWarehouseItemId, setSelectedWarehouseItemId] = useState<string>('');
    const [newItemPlannedQuantity, setNewItemPlannedQuantity] = useState<number>(1);
    
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchPageData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const [whItems, salesOrders, users] = await Promise.all([
                    apiService.getWarehouseItems({ viewMode: 'active' }),
                    apiService.getOrders({ viewMode: 'active' }),
                    apiService.getUsersForAssignee(user.id)
                ]);
                setAvailableWarehouseItems(whItems.filter(item => item.billOfMaterials && item.billOfMaterials.length > 0));
                setActiveSalesOrders(salesOrders);
                setUsersForAssigning(users);

                if (isNew) {
                    setOrderData({ name: '', orderItems: [], status: 'Планируется', assignedToId: null, isPlannedOrder: false });
                    setMode('edit');
                } else {
                    const poData = (await apiService.getProductionOrders({ viewMode: 'all' })).find(p => p.id === orderId);
                    if (poData) {
                        setOrderData(poData);
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
    
    const handleConfirmSave = async () => {
        if (!orderData.name?.trim()) { setError("Название обязательно"); setIsSaveConfirmOpen(false); return; }
        setIsSaving(true);
        try {
            if (orderData.id) {
                await apiService.updateProductionOrder(orderData as ProductionOrder);
            } else {
                await apiService.addProductionOrder(orderData as any);
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
            unit: 'шт',
            billOfMaterialsSnapshot: product.billOfMaterials || [],
        };
        setOrderData(prev => ({ ...prev, orderItems: [...(prev.orderItems || []), newOrderItem] }));
        setSelectedWarehouseItemId('');
    };
    
    const handleRemoveOrderItem = (itemId: string) => {
        setOrderData(prev => ({ ...prev, orderItems: (prev.orderItems || []).filter(item => item.id !== itemId) }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (error && !orderData.id) return <p className="text-red-500">{error}</p>;
    if (!orderData) return null;
    
    const pageTitle = isNew ? 'Новое производственное задание' : (mode === 'edit' ? `Редактирование: ${orderData.name}` : `Задание: ${orderData.name}`);
    const isFormDisabled = mode === 'view' || isSaving;

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
                <Card>
                    <div className="space-y-4">
                        <Input id="po-name" name="name" label="Название/Цель задания *" value={orderData.name || ''} onChange={handleInputChange} required disabled={isFormDisabled}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="po-assignedToId" className="block text-sm font-medium mb-1">Ответственный</label>
                                <select id="po-assignedToId" name="assignedToId" value={orderData.assignedToId || ''} onChange={handleInputChange} disabled={isFormDisabled}
                                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                                    <option value="">Не назначен</option>
                                    {usersForAssigning.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="po-status" className="block text-sm font-medium mb-1">Статус</label>
                                <select id="po-status" name="status" value={orderData.status || 'Планируется'} onChange={handleInputChange} disabled={isFormDisabled}
                                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                                    {ALL_PRODUCTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        {/* More fields here */}
                    </div>
                </Card>
            </form>
             {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения?" confirmText="Сохранить" isLoading={isSaving} />}
        </div>
    );
};

export default ProductionOrderEditorPage;