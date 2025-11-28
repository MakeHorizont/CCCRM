
import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { PurchaseRequest, PurchaseRequestStatus, Contact, HouseholdItem, PurchaseRequestItem, ProductionOrder } from '../../types';
import { TrashIcon, PlusCircleIcon, PencilSquareIcon, SaveIcon } from '../UI/Icons';
import { generateId } from '../../utils/idGenerators';
import { useAuth } from '../../hooks/useAuth';

type ModalMode = 'view' | 'edit';

interface PurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (requestData: Partial<PurchaseRequest>) => Promise<void>;
  onReceive: (requestId: string, items: { itemId: string; newReceivedQty: number }[]) => Promise<void>;
  initialRequestData: Partial<PurchaseRequest> | null;
  isSaving: boolean;
  availableHouseholdItems: HouseholdItem[];
  availableContacts: Contact[];
  availableProductionOrders: ProductionOrder[];
  modalMode: ModalMode;
  setModalMode: (mode: ModalMode) => void;
}

const ALL_PURCHASE_STATUSES: PurchaseRequestStatus[] = [
    'Черновик', 'Требует утверждения', 'Утверждено', 'Заказано', 'Частично получено', 'Получено', 'Отклонено'
];

const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onReceive,
  initialRequestData,
  isSaving,
  availableHouseholdItems,
  availableContacts,
  availableProductionOrders,
  modalMode,
  setModalMode,
}) => {
  const { user } = useAuth();
  const [requestData, setRequestData] = useState<Partial<PurchaseRequest>>({});
  const [editedReceivedQuantities, setEditedReceivedQuantities] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState<string | null>(null);

  // For adding new items
  const [selectedHhItemId, setSelectedHhItemId] = useState<string>('');
  const [newItemQtyNeeded, setNewItemQtyNeeded] = useState<number>(1);

  const isViewMode = modalMode === 'view';

  useEffect(() => {
    if (isOpen) {
      const defaultData: Partial<PurchaseRequest> = {
        name: '',
        status: 'Черновик',
        items: [],
        notes: '',
        supplierContactId: null,
        relatedProductionOrderId: null,
      };
      const dataToSet = initialRequestData ? { ...initialRequestData } : defaultData;
      setRequestData(dataToSet);

      const initialQtys: Record<string, string> = {};
      dataToSet.items?.forEach(item => {
        initialQtys[item.id] = String(item.quantityReceived || 0);
      });
      setEditedReceivedQuantities(initialQtys);

      setModalError(null);
      setSelectedHhItemId('');
      setNewItemQtyNeeded(1);
    }
  }, [isOpen, initialRequestData]);
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRequestData(prev => ({...prev, [name]: value === '' ? null : value}));
  };

  const handleAddItem = () => {
    if (!selectedHhItemId || newItemQtyNeeded <= 0) {
      setModalError("Выберите товар и укажите корректное количество.");
      return;
    }
    const itemToAdd = availableHouseholdItems.find(i => i.id === selectedHhItemId);
    if (!itemToAdd) {
        setModalError("Выбранный хоз. товар не найден.");
        return;
    }
    const newRequestItem: PurchaseRequestItem = {
      id: generateId('pri'),
      householdItemId: itemToAdd.id,
      householdItemName: itemToAdd.name,
      quantityNeeded: newItemQtyNeeded,
      unit: itemToAdd.unit,
      quantityReceived: 0,
    };
    setRequestData(prev => ({
      ...prev,
      items: [...(prev.items || []), newRequestItem]
    }));
    setEditedReceivedQuantities(prev => ({ ...prev, [newRequestItem.id]: '0' }));
    setSelectedHhItemId('');
    setNewItemQtyNeeded(1);
    setModalError(null);
  };
  
  const handleRemoveItem = (itemId: string) => {
    setRequestData(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== itemId)
    }));
    setEditedReceivedQuantities(prev => {
        const newQtys = { ...prev };
        delete newQtys[itemId];
        return newQtys;
    });
  };

  const handleItemQtyChange = (itemId: string, field: 'quantityNeeded', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setRequestData(prev => ({
        ...prev,
        items: (prev.items || []).map((item: PurchaseRequestItem) =>
            item.id === itemId ? { ...item, [field]: numValue } : item
        )
    }));
  };

  const handleItemReceivedQtyChange = (itemId: string, value: string) => {
    setEditedReceivedQuantities(prev => ({...prev, [itemId]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestData.name?.trim()) { setModalError("Название заявки обязательно."); return; }
    if (!requestData.items || requestData.items.length === 0) { setModalError("Заявка должна содержать хотя бы одну позицию."); return; }
    
    setModalError(null);
    try {
        await onSave(requestData);
    } catch(err) {
        setModalError((err as Error).message);
    }
  };
  
  const handleReceiveSubmit = async () => {
    if (!requestData.id || !requestData.items) return;
    setModalError(null);
    try {
        const itemsPayload = Object.entries(editedReceivedQuantities).map(([itemId, qtyStr]) => ({
            itemId: itemId,
            newReceivedQty: parseFloat(String(qtyStr)) || 0,
        }));
        await onReceive(requestData.id, itemsPayload);
    } catch(err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setModalError(errorMessage);
    }
  };
  
  const itemsInRequestIds = useMemo(() => new Set((requestData.items || []).map(i => i.householdItemId)), [requestData.items]);
  const filteredHhItems = useMemo(() => availableHouseholdItems.filter(i => !itemsInRequestIds.has(i.id)), [availableHouseholdItems, itemsInRequestIds]);
  
  const canEditMainDetails = !isViewMode && (requestData.status === 'Черновик' || requestData.status === 'Требует утверждения');
  const canEditReceivedQty = !isViewMode && (requestData.status === 'Заказано' || requestData.status === 'Частично получено' || requestData.status === 'Получено');


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={requestData.id ? `Заявка на закупку #${requestData.id}` : 'Новая заявка'} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar-thin">
        {modalError && <p className="text-red-500 text-sm mb-3 p-2 bg-red-500/10 rounded-md">{modalError}</p>}
        
        <Input id="pr-name" name="name" label="Название/Цель закупки *" value={requestData.name || ''} onChange={handleInputChange} required autoFocus disabled={isSaving || requestData.isArchived || isViewMode}/>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                 <label htmlFor="pr-status" className="block text-sm font-medium text-brand-text-primary mb-1">Статус</label>
                 <select id="pr-status" name="status" value={requestData.status || 'Черновик'} onChange={handleInputChange} disabled={isSaving || requestData.isArchived || isViewMode}
                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500">
                    {ALL_PURCHASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
            </div>
             <div>
                <label htmlFor="pr-supplierContactId" className="block text-sm font-medium text-brand-text-primary mb-1">Поставщик</label>
                <select id="pr-supplierContactId" name="supplierContactId" value={requestData.supplierContactId || ''} onChange={handleInputChange} disabled={isSaving || requestData.isArchived || isViewMode}
                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500">
                    <option value="">Не выбран</option>
                    {availableContacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.companyName || 'Физ. лицо'})</option>)}
                </select>
            </div>
        </div>

        <h4 className="text-md font-semibold pt-2 text-brand-text-primary">Позиции заявки:</h4>
        <div className="space-y-2">
            {(requestData.items || []).map(item => (
                <div key={item.id} className="grid grid-cols-12 gap-x-2 items-center p-2 bg-brand-surface rounded-md">
                    <div className="col-span-12 md:col-span-5">
                        <p className="text-sm text-brand-text-primary truncate" title={item.householdItemName}>{item.householdItemName}</p>
                    </div>
                    <div className="col-span-6 md:col-span-3 mt-1 md:mt-0">
                        <Input id={`needed-${item.id}`} type="number" label="Нужно" smallLabel value={String(item.quantityNeeded)} onChange={(e) => handleItemQtyChange(item.id, 'quantityNeeded', e.target.value)} min="0.001" step="0.001" className="!p-1.5 text-xs" disabled={isSaving || requestData.isArchived || !canEditMainDetails}/>
                    </div>
                    <div className="col-span-6 md:col-span-3 mt-1 md:mt-0">
                         <Input id={`received-${item.id}`} type="number" label="Получено" smallLabel value={editedReceivedQuantities[item.id] || '0'} onChange={(e) => handleItemReceivedQtyChange(item.id, e.target.value)} min="0" step="0.001" className="!p-1.5 text-xs" disabled={!canEditReceivedQty || isSaving || requestData.isArchived}/>
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end">
                       {canEditMainDetails && !requestData.isArchived && (
                           <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveItem(item.id)} className="p-1.5" disabled={isSaving}><TrashIcon className="h-4 w-4"/></Button>
                       )}
                    </div>
                </div>
            ))}
        </div>

        {canEditMainDetails && !requestData.isArchived && (
             <div className="pt-3 border-t border-brand-border space-y-1">
                 <h5 className="text-sm font-medium">Добавить позицию</h5>
                 <div className="flex items-end space-x-2">
                     <div className="flex-grow">
                         <label htmlFor="add-hh-item-select" className="sr-only">Хоз. товар</label>
                         <select id="add-hh-item-select" value={selectedHhItemId} onChange={(e) => setSelectedHhItemId(e.target.value)}
                             className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500">
                             <option value="" disabled>Выберите хоз. товар...</option>
                             {filteredHhItems.map(item => <option key={item.id} value={item.id}>{item.name} (в наличии: {item.quantity} {item.unit})</option>)}
                         </select>
                     </div>
                     <div className="w-28">
                         <Input id="new-item-qty" type="number" min="0.001" step="0.001" value={String(newItemQtyNeeded)} onChange={(e) => setNewItemQtyNeeded(parseFloat(e.target.value) || 1)} placeholder="Кол-во" className="!p-2 text-sm"/>
                     </div>
                     <Button type="button" onClick={handleAddItem} disabled={!selectedHhItemId || newItemQtyNeeded <= 0} leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить</Button>
                 </div>
             </div>
        )}
        
        <div className="pt-2">
            <label htmlFor="pr-notes" className="block text-sm font-medium text-brand-text-primary mb-1">Примечания</label>
            <textarea id="pr-notes" name="notes" rows={2} value={requestData.notes || ''} onChange={handleInputChange} disabled={isSaving || requestData.isArchived || isViewMode}
                className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"/>
        </div>

        <div className="pt-5 flex justify-end space-x-3">
            {isViewMode ? (
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
                    {!requestData.isArchived && <Button type="button" onClick={() => setModalMode('edit')} leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>}
                </>
            ) : (
                <>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                    {canEditReceivedQty && !requestData.isArchived && (
                        <Button type="button" onClick={handleReceiveSubmit} isLoading={isSaving} variant="primary" className="!bg-emerald-600 hover:!bg-emerald-500">
                            Принять поставку
                        </Button>
                    )}
                    {!requestData.isArchived && <Button type="submit" isLoading={isSaving} variant="primary">{requestData.id ? 'Сохранить изменения' : 'Создать заявку'}</Button>}
                </>
            )}
        </div>
      </form>
    </Modal>
  );
};

export default PurchaseRequestModal;
