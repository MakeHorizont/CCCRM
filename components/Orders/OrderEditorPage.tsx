import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Order, OrderStatus, OrderItem, Contact, WarehouseItem, DeliveryType } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import {
    ArrowLeftIcon, PencilSquareIcon, CheckCircleIcon, XCircleIcon, DocumentChartBarIcon, FireIcon,
    CogIcon, ReceiptPercentIcon, DocumentTextIcon, CalendarDaysIcon, UserCircleIcon as ContactIcon,
    TruckIcon, TrashIcon, PlusCircleIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, SaveIcon
} from '../UI/Icons';
import { ROUTE_PATHS, ORDER_STATUS_COLOR_MAP, PRIORITY_ICON_MAP, ALL_ORDER_STATUSES } from '../../constants';
import { generateOrderItemId } from '../../utils/idGenerators';

type EditorMode = 'view' | 'edit';

const OrderEditorPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isNew = !orderId;
    
    const [order, setOrder] = useState<Partial<Order> | null>(null);
    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [allWarehouseItems, setAllWarehouseItems] = useState<WarehouseItem[]>([]);
    
    const [selectedNewProductId, setSelectedNewProductId] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);

    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [contactsData, whItems] = await Promise.all([
                    apiService.getContacts({ viewMode: 'active' }),
                    apiService.getWarehouseItems({ viewMode: 'active' })
                ]);
                setAllContacts(contactsData);
                setAllWarehouseItems(whItems);

                if (isNew) {
                    setOrder({ items: [], status: 'Новый', isPaid: false, isInvoiceSent: false, date: new Date().toISOString().split('T')[0], deliveryType: 'delivery', thermalInsulation: false, deliveryCost: 0, history: [] });
                    setMode('edit');
                } else {
                    const allOrders = await apiService.getOrders({viewMode: 'all'});
                    const orderData = allOrders.find(o => o.id === orderId);
                    if (orderData) {
                        setOrder(orderData);
                    } else {
                        setError("Заказ не найден.");
                    }
                    setMode('view');
                }
            } catch (err) {
                setError("Ошибка загрузки данных.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [orderId, isNew]);

    const handleConfirmSave = async () => {
        setIsSaveConfirmOpen(false);
        if (!order) return;
        if (!order.contactId) { setError("Клиент должен быть выбран."); return; }
        if (!order.items || order.items.length === 0) { setError("Добавьте хотя бы один товар."); return; }

        setIsSaving(true);
        setError(null);
        try {
            if (isNew) {
                await apiService.addOrder(order as any);
            } else {
                await apiService.updateOrder(order as Order);
            }
            navigate(ROUTE_PATHS.ORDERS);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!order) return;
        const { name, value, type } = e.target;
        
        let val: any = value;
        if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
        if (type === 'number') val = parseFloat(value) || null;

        let newOrderData = { ...order, [name]: val };

        if (name === 'contactId') {
            const contact = allContacts.find(c => c.id === value);
            if(contact) newOrderData.shippingAddress = contact.address || '';
        }

        setOrder(newOrderData);
    };

    const handleItemChange = (itemId: string, field: 'quantity' | 'pricePerUnit', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return;
        
        const newItems = order?.items?.map(item => 
            item.id === itemId ? { ...item, [field]: numValue } : item
        );
        setOrder(prev => prev ? { ...prev, items: newItems } : null);
    };

    const handleAddItem = () => {
        if (!selectedNewProductId || newItemQuantity <= 0) return;
        const product = allWarehouseItems.find(p => p.id === selectedNewProductId);
        if (!product) return;

        const newItem: OrderItem = {
            id: generateOrderItemId(),
            productId: product.id,
            productName: product.name,
            quantity: newItemQuantity,
            pricePerUnit: product.price,
            isAssembled: false,
        };

        setOrder(prev => prev ? { ...prev, items: [...(prev.items || []), newItem] } : null);
        setSelectedNewProductId('');
        setNewItemQuantity(1);
    };
    
    const handleRemoveItem = (itemId: string) => {
        setOrder(prev => prev ? { ...prev, items: prev.items?.filter(item => item.id !== itemId) } : null);
    };

    const handleArchiveToggle = async () => {
        if (!order?.id) return;
        setIsSaving(true);
        await apiService.archiveOrder(order.id, !order.isArchived);
        navigate(ROUTE_PATHS.ORDERS);
    };

    const handleDelete = async () => {
        if (!order?.id) return;
        setIsSaving(true);
        await apiService.deleteOrder(order.id);
        navigate(ROUTE_PATHS.ORDERS);
    };

    if (isLoading) return <LoadingSpinner />;
    if (error && !order) return <p className="text-red-500">{error}</p>;
    if (!order) return null;

    const pageTitle = isNew ? 'Новый заказ' : (mode === 'edit' ? `Редактирование заказа #${order.id}` : `Заказ #${order.id}`);
    
    return (
        <div className="space-y-4">
            <Button onClick={() => navigate(ROUTE_PATHS.ORDERS)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку заказов
            </Button>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <div className="flex space-x-2">
                         {mode === 'view' && !order.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !order.isArchived && (
                             <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>
                
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         <div>
                            <label className="text-sm font-medium">Клиент *</label>
                            <select name="contactId" value={order.contactId || ''} onChange={handleInputChange} disabled={mode === 'view'} required className="w-full mt-1 bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                                <option value="" disabled>Выберите клиента</option>
                                {allContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                         <Input id="date" name="date" label="Дата заказа" type="date" value={order.date?.split('T')[0] || ''} onChange={handleInputChange} disabled={mode === 'view'} />
                         <div>
                            <label className="text-sm font-medium">Статус</label>
                            <select name="status" value={order.status || ''} onChange={handleInputChange} disabled={mode === 'view'} className="w-full mt-1 bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                                {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center space-x-4 pt-6">
                             <label className="flex items-center"><input type="checkbox" name="isPaid" checked={order.isPaid || false} onChange={handleInputChange} disabled={mode === 'view'} className="h-4 w-4"/> <span className="ml-2">Оплачен</span></label>
                             <label className="flex items-center"><input type="checkbox" name="isInvoiceSent" checked={order.isInvoiceSent || false} onChange={handleInputChange} disabled={mode === 'view'} className="h-4 w-4"/> <span className="ml-2">Счет отправлен</span></label>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold mb-2">Состав заказа</h3>
                    <div className="space-y-2">
                        {order.items?.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                <p className="col-span-5 text-sm">{item.productName}</p>
                                <Input id={`qty-${item.id}`} type="number" value={String(item.quantity)} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} disabled={mode==='view'} className="col-span-2 !py-1 text-sm" />
                                <Input id={`price-${item.id}`} type="number" value={String(item.pricePerUnit)} onChange={e => handleItemChange(item.id, 'pricePerUnit', e.target.value)} disabled={mode==='view'} className="col-span-2 !py-1 text-sm" />
                                <p className="col-span-2 text-right text-sm">{(item.quantity * item.pricePerUnit).toLocaleString()} ₽</p>
                                {mode==='edit' && <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveItem(item.id)} className="col-span-1 p-1"><TrashIcon className="h-4 w-4"/></Button>}
                            </div>
                        ))}
                    </div>
                    {mode === 'edit' && (
                         <div className="flex items-end space-x-2 pt-3 mt-3 border-t border-brand-border">
                             <div className="flex-grow">
                                <select value={selectedNewProductId} onChange={e => setSelectedNewProductId(e.target.value)} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm">
                                    <option value="">Выберите товар...</option>
                                    {allWarehouseItems.filter(wh => !order.items?.some(i => i.productId === wh.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                             <Input id="new-item-qty" type="number" value={String(newItemQuantity)} onChange={e => setNewItemQuantity(parseInt(e.target.value) || 1)} className="w-24 !py-2" />
                             <Button type="button" onClick={handleAddItem} disabled={!selectedNewProductId} leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить</Button>
                        </div>
                    )}
                </Card>
                
                 <div className="flex space-x-2">
                    {order.id && mode === 'view' && (
                        order.isArchived ? (
                            <>
                                <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                                <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                            </>
                        ) : (
                             <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} isLoading={isSaving} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                        )
                    )}
                 </div>
            </form>
            
            {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения в заказе?" confirmText="Сохранить" isLoading={isSaving} />}
            {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title={order.isArchived ? "Восстановить?" : "Архивировать?"} message={`Вы уверены?`} confirmText={order.isArchived ? "Восстановить" : "Архивировать"} isLoading={isSaving} />}
            {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить навсегда?" message="Это действие необратимо." confirmText="Удалить" isLoading={isSaving} />}
        </div>
    );
};

export default OrderEditorPage;