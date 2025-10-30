import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react'; 
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { ProductionOrder, ProductionOrderItem, ProductionOrderStatus, User, WarehouseItem, Order as SalesOrder, HouseholdItem, HouseholdItemUsage } from '../../types';
import { TrashIcon, PlusCircleIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, CalculatorIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, PencilSquareIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import { generateProductionOrderItemId } from '../../utils/idGenerators';
import { apiService } from '../../services/apiService'; 
import { useAuth } from '../../hooks/useAuth';
import ConfirmationModal from '../UI/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';

type ModalMode = 'view' | 'edit';

interface ProductionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInitiate: (orderData: Partial<ProductionOrder>) => void;
  editingOrder: Partial<ProductionOrder> | null;
  usersForAssigning: User[];
  availableWarehouseItems: WarehouseItem[];
  activeSalesOrders: SalesOrder[];
  isSaving: boolean;
  onArchiveToggle: (order: ProductionOrder) => void;
  onDeleteInitiate: (order: ProductionOrder) => void;
  modalMode: ModalMode;
  setModalMode: (mode: ModalMode) => void;
}

const ALL_PRODUCTION_STATUSES: ProductionOrderStatus[] = [
  'Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве', 
  'Контроль качества', 'Приостановлено', 'Завершено', 'Отменено'
];


const ProductionOrderModal: React.FC<ProductionOrderModalProps> = ({
  isOpen,
  onClose,
  onSaveInitiate,
  editingOrder: initialEditingOrder,
  usersForAssigning,
  availableWarehouseItems: allWarehouseItems,
  activeSalesOrders,
  isSaving,
  onArchiveToggle,
  onDeleteInitiate,
  modalMode,
  setModalMode,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<Partial<ProductionOrder>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedWarehouseItemId, setSelectedWarehouseItemId] = useState<string>('');
  const [newItemPlannedQuantity, setNewItemPlannedQuantity] = useState<number>(1);
  const [householdItemsCache, setHouseholdItemsCache] = useState<Record<string, HouseholdItem>>({});
  const [expandedBomItem, setExpandedBomItem] = useState<string | null>(null);
  const [isCreatingPurchaseRequest, setIsCreatingPurchaseRequest] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  
  const isViewMode = modalMode === 'view';

  useEffect(() => {
    if (isOpen) {
      const defaultOrderData: Partial<ProductionOrder> = {
        name: '',
        orderItems: [],
        status: 'Планируется',
        assignedToId: null,
        relatedSalesOrderId: null,
        isPlannedOrder: false, 
        notes: '',
      };
      const initialData = initialEditingOrder 
        ? { ...defaultOrderData, ...initialEditingOrder, orderItems: initialEditingOrder.orderItems ? JSON.parse(JSON.stringify(initialEditingOrder.orderItems)) : [] }
        : defaultOrderData;
      
      setOrderData(initialData);
      setSelectedWarehouseItemId('');
      setNewItemPlannedQuantity(1);
      setModalError(null);
      setExpandedBomItem(null);

      const fetchHHItemsIfNeeded = async () => {
        if (initialData.orderItems && initialData.orderItems.some(item => item.billOfMaterialsSnapshot && item.billOfMaterialsSnapshot.length > 0)) {
          const neededHHItemIds = new Set<string>();
          initialData.orderItems.forEach(item => {
            item.billOfMaterialsSnapshot?.forEach(bom => {
              if (!householdItemsCache[bom.householdItemId]) {
                neededHHItemIds.add(bom.householdItemId);
              }
            });
          });

          if (neededHHItemIds.size > 0) { // Fetch only if cache is missing items and there are BOMs
            try {
              const allHHItems = await apiService.getHouseholdItems({viewMode: 'active'});
              const cacheUpdate: Record<string, HouseholdItem> = {};
              allHHItems.forEach(item => {
                if (neededHHItemIds.has(item.id)) { // Only cache relevant items
                  cacheUpdate[item.id] = item;
                }
              });
              setHouseholdItemsCache(prevCache => ({...prevCache, ...cacheUpdate}));
            } catch (err) {
              console.warn("Could not pre-fetch household items for BOM display, will rely on snapshot data only.", err);
            }
          }
        }
      };
      fetchHHItemsIfNeeded();
    }
  }, [isOpen, initialEditingOrder, householdItemsCache]);
  
  // Auto-generate name based on linked sales order and date
  useEffect(() => {
    if (orderData.isPlannedOrder === false && orderData.relatedSalesOrderId) {
      const salesOrder = activeSalesOrders.find(so => so.id === orderData.relatedSalesOrderId);
      if (salesOrder) {
        const datePart = orderData.plannedEndDate ? ` до ${new Date(orderData.plannedEndDate).toLocaleDateString('ru-RU')}` : '';
        const newName = `Заказ клиента: ${salesOrder.customerName}${datePart}`;
        if (orderData.name !== newName && (orderData.name === '' || orderData.name?.startsWith('Заказ клиента:'))) {
            setOrderData(prev => ({...prev, name: newName}));
        }
      }
    }
  }, [orderData.relatedSalesOrderId, orderData.isPlannedOrder, orderData.plannedEndDate, activeSalesOrders, orderData.name]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';

    setOrderData(prev => {
        const currentOrderData = { ...prev };
        if (isCheckbox) {
            const checked = (e.target as HTMLInputElement).checked;
            if (name === 'isPlannedOrder') {
                currentOrderData.isPlannedOrder = checked;
                if (checked) {
                    currentOrderData.relatedSalesOrderId = null;
                    currentOrderData.name = 'Плановое задание на склад'; // Default name for planned orders
                }
            }
        } else {
            const key = name as keyof ProductionOrder;
             if (type === 'number') {
                (currentOrderData as any)[key] = value === '' ? undefined : parseFloat(value);
            }
            else if (key === 'name' || key === 'notes' || key === 'plannedStartDate' || key === 'plannedEndDate' || key === 'assignedToId' || key === 'relatedSalesOrderId' || key === 'status') {
                 (currentOrderData as any)[key] = value === '' && (key === 'assignedToId' || key === 'relatedSalesOrderId') ? null : (value || undefined);
            }
        }
        return currentOrderData;
    });
  };
  
  const handleItemPlannedQuantityChange = (itemId: string, newQuantityStr: string) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    setOrderData(prev => ({
        ...prev,
        orderItems: (prev.orderItems || []).map(item =>
            item.id === itemId ? { ...item, plannedQuantity: isNaN(newQuantity) ? 0 : Math.max(0, newQuantity) } : item
        )
    }));
  };

  const handleItemProducedQuantityChange = (itemId: string, newQuantityStr: string) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    setOrderData(prev => ({
        ...prev,
        orderItems: (prev.orderItems || []).map(item => {
            if (item.id === itemId) {
                const produced = isNaN(newQuantity) ? (item.producedQuantity || 0) : Math.max(0, Math.min(newQuantity, item.plannedQuantity));
                return { ...item, producedQuantity: produced };
            }
            return item;
        })
    }));
  };

  const handleAddOrderItem = () => {
    if (!selectedWarehouseItemId || newItemPlannedQuantity <= 0) {
      setModalError('Выберите товар и укажите корректное количество.');
      return;
    }
    const product = allWarehouseItems.find(p => p.id === selectedWarehouseItemId);
    if (!product) {
      setModalError('Выбранный товар не найден на складе.');
      return;
    }
    if (orderData.orderItems?.some(item => item.warehouseItemId === product.id)) {
        setModalError('Этот товар уже добавлен в задание. Измените его количество.');
        return;
    }
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
    setSelectedWarehouseItemId(''); setNewItemPlannedQuantity(1); setModalError(null);
  };

  const handleRemoveOrderItem = (itemId: string) => {
    setOrderData(prev => ({ ...prev, orderItems: (prev.orderItems || []).filter(item => item.id !== itemId) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData.name?.trim()) { setModalError('Название производственного задания обязательно.'); return; }
    if (!orderData.orderItems || orderData.orderItems.length === 0) { setModalError('Добавьте хотя бы один продукт в задание.'); return; }
    if (orderData.orderItems.some(item => item.plannedQuantity <= 0)) { setModalError('Количество для каждого продукта должно быть больше нуля.'); return; }
    setModalError(null);
    onSaveInitiate(orderData);
  };
  
  const handleCreatePurchaseRequest = async () => {
    if (!orderData.id || !user) return;
    setIsCreatingPurchaseRequest(true);
    try {
        const newPR = await apiService.createPurchaseRequestFromShortage(orderData.id, user.id);
        onClose(); // Close the current modal
        navigate(`${ROUTE_PATHS.PURCHASING}?requestId=${newPR.id}`);
    } catch(err) {
        setModalError((err as Error).message);
    } finally {
        setIsCreatingPurchaseRequest(false);
    }
  };

  const availableWarehouseItemsForDropdown = useMemo(() => {
    const currentItemIds = new Set((orderData.orderItems || []).map(i => i.warehouseItemId));
    return allWarehouseItems.filter(wh => !currentItemIds.has(wh.id));
  }, [orderData.orderItems, allWarehouseItems]);
  
  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={orderData.id ? (isViewMode ? `Задание: ${orderData.name}` : `Редактировать: ${orderData.name}`) : 'Новое производственное задание'} size="2xl">
      <form id="production-order-form" onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar-thin space-y-4">
          {modalError && <p className="text-red-500 text-sm p-2 bg-red-500/10 rounded-md">{modalError}</p>}
          {orderData.hasMaterialShortage && isViewMode && (
            <div className="p-3 bg-amber-800/20 border border-amber-600/30 rounded-lg text-sm text-amber-300 flex items-center justify-between">
                <p>Обнаружен дефицит сырья. Задание не может быть запущено.</p>
                <Button onClick={handleCreatePurchaseRequest} isLoading={isCreatingPurchaseRequest} size="sm">Создать заявку на закупку</Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="po-name" name="name" label="Название/Цель задания *" value={orderData.name || ''} onChange={handleInputChange} required autoFocus disabled={isSaving || orderData.isArchived || isViewMode}/>
               <div>
                  <label htmlFor="po-status" className="block text-sm font-medium text-brand-text-primary mb-1">Статус</label>
                  <select id="po-status" name="status" value={orderData.status || 'Планируется'} onChange={handleInputChange} disabled={isSaving || orderData.isArchived || isViewMode}
                      className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                      {ALL_PRODUCTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                  <label htmlFor="po-assignedToId" className="block text-sm font-medium text-brand-text-primary mb-1">Ответственный</label>
                  <select id="po-assignedToId" name="assignedToId" value={orderData.assignedToId || ''} onChange={handleInputChange} disabled={isSaving || orderData.isArchived || isViewMode}
                      className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                      <option value="">Не назначен</option>
                      {usersForAssigning.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
              </div>
              <Input id="po-plannedStartDate" name="plannedStartDate" type="date" label="План. дата начала" value={orderData.plannedStartDate?.split('T')[0] || ''} onChange={handleInputChange} disabled={isSaving || orderData.isArchived || isViewMode}/>
              <Input id="po-plannedEndDate" name="plannedEndDate" type="date" label="План. дата завершения" value={orderData.plannedEndDate?.split('T')[0] || ''} onChange={handleInputChange} disabled={isSaving || orderData.isArchived || isViewMode}/>
          </div>
          <div className="flex items-center space-x-4">
              <label className="flex items-center">
                  <input type="checkbox" name="isPlannedOrder" checked={orderData.isPlannedOrder || false} onChange={handleInputChange} className="h-4 w-4 text-sky-500" disabled={isSaving || orderData.isArchived || isViewMode}/>
                  <span className="ml-2 text-sm">Плановое задание (на склад)</span>
              </label>
              {!orderData.isPlannedOrder && (
                   <div className="flex-grow">
                      <label htmlFor="po-relatedSalesOrderId" className="sr-only">Связанный заказ</label>
                      <select id="po-relatedSalesOrderId" name="relatedSalesOrderId" value={orderData.relatedSalesOrderId || ''} onChange={handleInputChange} disabled={isSaving || orderData.isArchived || orderData.isPlannedOrder || isViewMode}
                          className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 text-sm">
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
                      <div className="grid grid-cols-12 gap-x-2 items-start">
                          <div className="col-span-12 md:col-span-6">
                              <p className="text-sm text-brand-text-primary truncate font-medium" title={item.productName}>{item.productName}</p>
                          </div>
                          <div className="col-span-6 md:col-span-2 mt-1 md:mt-0">
                              <Input id={`planned-${item.id}`} type="number" label="План" smallLabel value={String(item.plannedQuantity)} onChange={(e) => handleItemPlannedQuantityChange(item.id, e.target.value)} min="1" className="!p-1.5 text-xs" disabled={isSaving || orderData.isArchived || isViewMode}/>
                          </div>
                          <div className="col-span-6 md:col-span-2 mt-1 md:mt-0">
                              <Input id={`produced-${item.id}`} type="number" label="Факт" smallLabel value={String(item.producedQuantity || '0')} onChange={(e) => handleItemProducedQuantityChange(item.id, e.target.value)} min="0" className="!p-1.5 text-xs" disabled={isSaving || orderData.isArchived || orderData.status === 'Планируется' || isViewMode}/>
                          </div>
                          <div className="col-span-12 md:col-span-2 flex justify-end items-center space-x-1 mt-1 md:mt-0">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setExpandedBomItem(p => p === item.id ? null : item.id)} className="p-1.5"><InformationCircleIcon className="h-4 w-4"/></Button>
                              {!orderData.isArchived && !isViewMode && <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveOrderItem(item.id)} className="p-1.5" disabled={isSaving}><TrashIcon className="h-4 w-4"/></Button>}
                          </div>
                      </div>
                      {expandedBomItem === item.id && (
                           <div className="mt-2 pt-2 border-t border-brand-border/50 text-xs pl-2">
                              <h5 className="font-semibold text-brand-text-secondary mb-1">Состав на 1 {item.unit}:</h5>
                              <ul className="list-disc list-inside space-y-0.5">
                              {(item.billOfMaterialsSnapshot || []).map(bom => (
                                  <li key={bom.householdItemId} className="text-brand-text-muted">
                                      {bom.householdItemName}: {bom.quantityPerUnit} {bom.unit}
                                      <span className="text-emerald-400/80 ml-2">(На складе: {householdItemsCache[bom.householdItemId]?.quantity || '?'})</span>
                                  </li>
                              ))}
                              </ul>
                          </div>
                      )}
                  </div>
              ))}
          </div>
          
          {!orderData.isArchived && !isViewMode && (
              <div className="pt-3 border-t border-brand-border space-y-1">
                  <h5 className="text-sm font-medium">Добавить продукт</h5>
                  <div className="flex items-end space-x-2">
                      <div className="flex-grow">
                          <label htmlFor="add-wh-item-select" className="sr-only">Продукт</label>
                          <select id="add-wh-item-select" value={selectedWarehouseItemId} onChange={(e) => setSelectedWarehouseItemId(e.target.value)}
                              className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500">
                              <option value="" disabled>Выберите продукт со склада...</option>
                              {availableWarehouseItemsForDropdown.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                      </div>
                      <div className="w-28">
                          <Input id="new-item-qty" type="number" min="1" value={String(newItemPlannedQuantity)} onChange={(e) => setNewItemPlannedQuantity(parseInt(e.target.value) || 1)} placeholder="Кол-во" className="!p-2 text-sm"/>
                      </div>
                      <Button type="button" onClick={handleAddOrderItem} disabled={!selectedWarehouseItemId || newItemPlannedQuantity <= 0} leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить</Button>
                  </div>
              </div>
          )}
           <div>
              <label htmlFor="po-notes" className="block text-sm font-medium text-brand-text-primary mb-1">Примечания</label>
              <textarea id="po-notes" name="notes" rows={2} value={orderData.notes || ''} onChange={handleInputChange} disabled={isSaving || orderData.isArchived || isViewMode}
                  className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500"/>
          </div>
        </div>
        <div className="flex-shrink-0 pt-4 border-t border-brand-border flex justify-between items-center">
          <div>
               {orderData.id && isViewMode && (
                   orderData.isArchived ? (
                       <div className="flex space-x-2">
                          <Button type="button" variant="secondary" onClick={() => onArchiveToggle(orderData as ProductionOrder)} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                          <Button type="button" variant="danger" onClick={() => onDeleteInitiate(orderData as ProductionOrder)} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                       </div>
                   ) : (
                       <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                   )
               )}
          </div>
          <div className="flex space-x-3">
            {isViewMode ? (
                <>
                  <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
                  {!orderData.isArchived && <Button type="button" onClick={(e) => { e.preventDefault(); setModalMode('edit'); }}>Редактировать</Button>}
                </>
            ) : (
                <>
                  <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                  {!orderData.isArchived && <Button type="submit" isLoading={isSaving} variant="primary">{orderData.id ? 'Сохранить изменения' : 'Создать задание'}</Button>}
                </>
            )}
          </div>
        </div>
      </form>
    </Modal>
    {isArchiveConfirmOpen && (
        <ConfirmationModal
            isOpen={isArchiveConfirmOpen}
            onClose={() => setIsArchiveConfirmOpen(false)}
            onConfirm={() => { onArchiveToggle(orderData as ProductionOrder); setIsArchiveConfirmOpen(false); }}
            title="Архивировать задание?"
            message={<p>Вы уверены, что хотите архивировать производственное задание <strong className="text-brand-text-primary">{orderData.name}</strong>?</p>}
            confirmText="Да, архивировать"
            confirmButtonVariant="danger"
        />
    )}
    </>
  );
};

export default ProductionOrderModal;