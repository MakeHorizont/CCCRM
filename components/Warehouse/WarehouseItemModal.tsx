import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import ConfirmationModal from '../UI/ConfirmationModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { WarehouseItem, WarehouseItemHistoryEntry, HouseholdItem, HouseholdItemUsage, StorageLocation, WarehouseItemIncident } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import {
    PencilSquareIcon, TrashIcon, ClipboardDocumentListIcon, Cog6ToothIcon as CogIcon, ArrowsUpDownIcon,
    ExclamationTriangleIcon, CheckCircleIcon, ChatBubbleOvalLeftEllipsisIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, PlusCircleIcon
} from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import { ROUTE_PATHS } from '../../constants';

type ModalMode = 'view' | 'edit';
type ModalTab = 'main' | 'bom' | 'movement' | 'incidents';

interface WarehouseItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    itemId: string | 'new' | null;
    initialMode: ModalMode;
}

const WarehouseItemModal: React.FC<WarehouseItemModalProps> = ({ isOpen, onClose, onSaveSuccess, itemId, initialMode }) => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [modalMode, setModalMode] = useState<ModalMode>(initialMode);
    const [editingItem, setEditingItem] = useState<Partial<WarehouseItem>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeModalTab, setActiveModalTab] = useState<ModalTab>('main');
    
    const [availableHouseholdItems, setAvailableHouseholdItems] = useState<HouseholdItem[]>([]);
    const [selectedBomHouseholdItemId, setSelectedBomHouseholdItemId] = useState<string>('');
    const [bomNewItemQuantity, setBomNewItemQuantity] = useState<number>(0.1);
    
    const [availableStorageLocations, setAvailableStorageLocations] = useState<StorageLocation[]>([]);

    const [itemIncidents, setItemIncidents] = useState<WarehouseItemIncident[]>([]);
    const [newIncidentType, setNewIncidentType] = useState<WarehouseItemIncident['type']>('damage');
    const [newIncidentDescription, setNewIncidentDescription] = useState('');

    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isIncidentResolveConfirmOpen, setIsIncidentResolveConfirmOpen] = useState(false);
    const [incidentToResolve, setIncidentToResolve] = useState<WarehouseItemIncident | null>(null);
    const [resolverNotes, setResolverNotes] = useState('');


    const tabButtonStyle = (tabName: ModalTab) =>
    `px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 transition-colors whitespace-nowrap ` +
    (activeModalTab === tabName
      ? 'border-sky-500 text-sky-400 bg-brand-surface'
      : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border');

    useEffect(() => {
        if (!isOpen) return;

        const fetchModalData = async () => {
            setIsLoading(true);
            setError(null);
            setModalMode(initialMode);
            setActiveModalTab('main');
            
            try {
                const [householdData, storageData] = await Promise.all([
                    apiService.getHouseholdItems({ viewMode: 'active' }),
                    apiService.getStorageLocations({ viewMode: 'active' }),
                ]);
                setAvailableHouseholdItems(householdData);
                setAvailableStorageLocations(storageData.sort((a, b) => a.name.localeCompare(b.name)));

                if (itemId && itemId !== 'new') {
                    const [fullItem, incidentsData] = await Promise.all([
                        apiService.getWarehouseItemById(itemId),
                        apiService.getIncidentsForItem(itemId)
                    ]);
                    setEditingItem(fullItem || {});
                    setItemIncidents(incidentsData);
                } else {
                    setEditingItem({ name: '', sku: '', quantity: 0, price: 0, location: '', description: '', isArchived: false, history: [], billOfMaterials: [], lowStockThreshold: 0 });
                    setItemIncidents([]);
                    setModalMode('edit');
                }
            } catch (err) {
                console.error("Failed to load modal data:", err);
                setError("Не удалось загрузить данные для модального окна.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchModalData();
    }, [isOpen, itemId, initialMode]);
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editingItem) return;
        const { name, value, type } = e.target;
        let val: string | number | undefined = value;
        if (type === 'number') val = value === '' ? undefined : parseFloat(value);
        setEditingItem(prev => ({ ...prev, [name]: val }));
    };

    const handleConfirmSave = async () => {
        if (!editingItem || !editingItem.name || !editingItem.sku) {
            setError("Название и SKU обязательны.");
            setIsSaveConfirmOpen(false);
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            if (editingItem.id) {
                await apiService.updateWarehouseItem(editingItem as WarehouseItem);
            } else {
                await apiService.addWarehouseItem(editingItem as any);
            }
            onSaveSuccess();
        } catch (err) {
            setError((err as Error).message || "Не удалось сохранить товар.");
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };
    
    const handleAddBomItem = () => {
        if (!selectedBomHouseholdItemId || bomNewItemQuantity <= 0) {
            setError("Выберите компонент и укажите положительное количество.");
            return;
        }
        const component = availableHouseholdItems.find(i => i.id === selectedBomHouseholdItemId);
        if (!component) return;

        const newBomItem: HouseholdItemUsage = {
            householdItemId: component.id,
            householdItemName: component.name,
            quantityPerUnit: bomNewItemQuantity,
            unit: component.unit,
        };
        setEditingItem(prev => ({...prev, billOfMaterials: [...(prev?.billOfMaterials || []), newBomItem]}));
        setSelectedBomHouseholdItemId('');
        setBomNewItemQuantity(0.1);
        setError(null);
    };

    const handleRemoveBomItem = (householdItemId: string) => {
        setEditingItem(prev => ({
            ...prev,
            billOfMaterials: (prev?.billOfMaterials || []).filter(item => item.householdItemId !== householdItemId)
        }));
    };

    const handleAddIncident = async () => {
        if (!editingItem?.id || !newIncidentDescription.trim() || !currentUser) return;
        setIsSaving(true);
        try {
            const newIncident = await apiService.addIncident({
                warehouseItemId: editingItem.id,
                userId: currentUser.id,
                type: newIncidentType,
                description: newIncidentDescription.trim(),
            });
            setItemIncidents(prev => [newIncident, ...prev]);
            setEditingItem(prev => ({...prev, openIncidentsCount: (prev.openIncidentsCount || 0) + 1 }));
            setNewIncidentDescription('');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmResolveIncident = async () => {
        if (!incidentToResolve || !currentUser) return;
        setIsSaving(true);
        try {
            const updatedIncident = await apiService.resolveIncident(incidentToResolve.id, currentUser.id, resolverNotes);
            setItemIncidents(prev => prev.map(i => i.id === updatedIncident.id ? updatedIncident : i));
            setEditingItem(prev => ({...prev, openIncidentsCount: Math.max(0, (prev.openIncidentsCount || 1) - 1) }));

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsIncidentResolveConfirmOpen(false);
            setIncidentToResolve(null);
            setResolverNotes('');
        }
    };
    
    const handleCreateDiscussion = async (incident: WarehouseItemIncident) => {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            const topic = await apiService.createDiscussionFromWarehouseIncident(incident, editingItem as WarehouseItem);
            onClose(); // Close warehouse modal
            navigate(`${ROUTE_PATHS.DISCUSSIONS}?topicId=${topic.id}`);
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const availableBomItems = useMemo(() => {
        const currentBomIds = new Set((editingItem.billOfMaterials || []).map(i => i.householdItemId));
        return availableHouseholdItems.filter(i => (i.category === 'Сырьё' || i.category === 'Специи' || i.category === 'Упаковка') && !currentBomIds.has(i.id));
    }, [editingItem.billOfMaterials, availableHouseholdItems]);
    
    if (!isOpen || !editingItem) return null;

    const isViewMode = modalMode === 'view';

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={editingItem.id ? (isViewMode ? `Просмотр: ${editingItem.name}` : `Редактировать: ${editingItem.name}`) : 'Новый товар'} size="2xl" zIndex="z-[60]">
             {isLoading ? <div className="min-h-[50vh] flex justify-center items-center"><LoadingSpinner /></div> : (
                <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }} className="flex flex-col max-h-[80vh]">
                     <div className="border-b border-brand-border flex-shrink-0">
                        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                            <button type="button" onClick={() => setActiveModalTab('main')} className={tabButtonStyle('main')}>Основное</button>
                            <button type="button" onClick={() => setActiveModalTab('bom')} className={tabButtonStyle('bom')}>Состав (BOM)</button>
                            <button type="button" onClick={() => setActiveModalTab('movement')} className={tabButtonStyle('movement')}>Движение</button>
                            <button type="button" onClick={() => setActiveModalTab('incidents')} className={tabButtonStyle('incidents')}>
                                Инциденты 
                                {editingItem.openIncidentsCount && editingItem.openIncidentsCount > 0 && <span className="ml-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{editingItem.openIncidentsCount}</span>}
                            </button>
                        </nav>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto py-4 pr-2 custom-scrollbar-thin">
                        {error && <p className="text-red-500 text-sm mb-2 p-2 bg-red-500/10 rounded-md">{error}</p>}
                        {activeModalTab === 'main' && (
                             <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input id="name" name="name" label="Название *" value={editingItem.name || ''} onChange={handleInputChange} required disabled={isViewMode} />
                                    <Input id="sku" name="sku" label="SKU *" value={editingItem.sku || ''} onChange={handleInputChange} required disabled={isViewMode}/>
                                </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Input id="quantity" name="quantity" label="Количество *" type="number" step="0.001" value={String(editingItem.quantity ?? '')} onChange={handleInputChange} required disabled={isViewMode}/>
                                    <Input id="price" name="price" label="Цена (₽) *" type="number" step="0.01" value={String(editingItem.price ?? '')} onChange={handleInputChange} required disabled={isViewMode}/>
                                     <Input id="shippingWeightGrams" name="shippingWeightGrams" label="Вес отгрузки (гр)" type="number" value={String(editingItem.shippingWeightGrams ?? '')} onChange={handleInputChange} disabled={isViewMode}/>
                                     <Input id="lowStockThreshold" name="lowStockThreshold" label="Порог низкого остатка" type="number" value={String(editingItem.lowStockThreshold ?? '')} onChange={handleInputChange} disabled={isViewMode}/>
                                </div>
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-brand-text-primary mb-1">Расположение</label>
                                    <select id="location" name="location" value={editingItem.location || ''} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500" disabled={isViewMode}>
                                        <option value="">Не указано</option>
                                        {availableStorageLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                    </select>
                                </div>
                                <textarea id="description" name="description" value={editingItem.description || ''} onChange={handleInputChange} placeholder="Описание..." rows={3} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm" disabled={isViewMode}/>
                             </div>
                        )}
                        {activeModalTab === 'bom' && (
                            <div className="space-y-3">
                                {(editingItem.billOfMaterials || []).map(item => (
                                    <div key={item.householdItemId} className="flex justify-between items-center p-2 bg-brand-surface rounded-md">
                                        <span className="text-sm">{item.householdItemName}</span>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-mono">{item.quantityPerUnit} {item.unit}</span>
                                            {!isViewMode && <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveBomItem(item.householdItemId)} className="p-1 leading-none"><TrashIcon className="h-4 w-4"/></Button>}
                                        </div>
                                    </div>
                                ))}
                                {!isViewMode && (
                                    <div className="pt-3 border-t border-brand-border flex items-end space-x-2">
                                        <div className="flex-grow">
                                            <label htmlFor="bom-item-select" className="block text-xs text-brand-text-muted mb-1">Компонент</label>
                                            <select id="bom-item-select" value={selectedBomHouseholdItemId} onChange={e => setSelectedBomHouseholdItemId(e.target.value)} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm">
                                                <option value="" disabled>Выберите компонент...</option>
                                                {availableBomItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                             <Input id="bom-item-qty" type="number" label="Кол-во на ед." smallLabel value={String(bomNewItemQuantity)} onChange={e => setBomNewItemQuantity(parseFloat(e.target.value) || 0)} className="!p-2 text-sm"/>
                                        </div>
                                        <Button type="button" onClick={handleAddBomItem} leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить</Button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeModalTab === 'movement' && (
                             <div className="space-y-2">
                                {(editingItem.history || []).map(entry => (
                                    <div key={entry.id} className="grid grid-cols-5 gap-2 text-xs p-1.5 bg-brand-surface rounded">
                                        <span className="col-span-1">{new Date(entry.timestamp).toLocaleString('ru-RU')}</span>
                                        <span className="col-span-1">{entry.userName || entry.userId}</span>
                                        <span className="col-span-1">{entry.changeType}</span>
                                        <span className={`col-span-1 font-semibold ${entry.quantityChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange} (Итог: {entry.newQuantity})</span>
                                        <span className="col-span-1 truncate" title={entry.reason}>{entry.reason}</span>
                                    </div>
                                ))}
                             </div>
                        )}
                         {activeModalTab === 'incidents' && (
                            <div className="space-y-3">
                                {itemIncidents.map(incident => (
                                    <div key={incident.id} className={`p-2 rounded-md border-l-4 ${incident.isResolved ? 'border-emerald-500 bg-brand-surface' : 'border-orange-500 bg-orange-900/20'}`}>
                                        <div className="flex justify-between items-start text-xs">
                                            <div>
                                                <span className="font-semibold text-brand-text-primary">{incident.type}</span> by <span className="text-brand-text-secondary">{incident.userName}</span>
                                            </div>
                                            <span>{new Date(incident.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm mt-1">{incident.description}</p>
                                        {incident.isResolved ? (
                                            <div className="text-xs mt-2 pt-2 border-t border-brand-border/50 text-emerald-400">
                                                <p><CheckCircleIcon className="h-4 w-4 inline mr-1"/> Решено {new Date(incident.resolvedAt!).toLocaleString()} ({incident.resolvedBy?.userName})</p>
                                                {incident.resolverNotes && <p className="italic pl-4">"{incident.resolverNotes}"</p>}
                                            </div>
                                        ) : (
                                            !isViewMode && (
                                                <div className="mt-2 text-right">
                                                    <Button size="sm" variant="secondary" onClick={() => { setIncidentToResolve(incident); setIsIncidentResolveConfirmOpen(true);}}>Решить</Button>
                                                     <Button size="sm" variant="ghost" className="ml-2 text-sky-400" onClick={() => handleCreateDiscussion(incident)}>Обсудить</Button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ))}
                                {!isViewMode && (
                                    <div className="pt-3 border-t border-brand-border">
                                         <h4 className="text-sm font-medium mb-1">Новый инцидент</h4>
                                        <select value={newIncidentType} onChange={e => setNewIncidentType(e.target.value as any)} className="w-full mb-2 bg-brand-card border border-brand-border rounded-lg p-2 text-sm">
                                            <option value="damage">Повреждение</option><option value="shortage">Недостача</option>
                                            <option value="defect">Брак</option><option value="other">Другое</option>
                                        </select>
                                        <textarea value={newIncidentDescription} onChange={e => setNewIncidentDescription(e.target.value)} placeholder="Описание инцидента..." rows={2} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm"/>
                                        <Button onClick={handleAddIncident} disabled={isSaving || !newIncidentDescription.trim()} className="mt-2">Добавить инцидент</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-shrink-0 pt-5 flex justify-between items-center border-t border-brand-border">
                         <div>
                            {editingItem.id && !isViewMode && (
                                editingItem.isArchived ? (
                                    <div className="flex space-x-2">
                                        <Button type="button" variant="secondary" onClick={() => {}} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                                        <Button type="button" variant="danger" onClick={() => {}} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="secondary" onClick={() => {}} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                                )
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Закрыть</Button>
                            {isViewMode && !editingItem.isArchived ? <Button type="button" onClick={() => setModalMode('edit')}>Редактировать</Button> : null}
                            {!isViewMode && !editingItem.isArchived ? <Button type="submit" isLoading={isSaving} variant="primary">{editingItem.id ? 'Сохранить изменения' : 'Создать товар'}</Button> : null}
                        </div>
                    </div>
                </form>
             )}
        </Modal>
        
        <ConfirmationModal 
            isOpen={isIncidentResolveConfirmOpen}
            onClose={() => setIsIncidentResolveConfirmOpen(false)}
            onConfirm={handleConfirmResolveIncident}
            title="Решить инцидент?"
            message={
                <div className="space-y-2">
                    <p>Вы уверены, что хотите отметить инцидент как решенный?</p>
                    <textarea value={resolverNotes} onChange={e => setResolverNotes(e.target.value)} placeholder="Заметки (опционально)..." className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm"/>
                </div>
            }
            confirmText="Да, решить"
        />
        </>
    );
};

export default WarehouseItemModal;