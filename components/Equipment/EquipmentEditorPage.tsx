
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import { EquipmentItem, EquipmentCategory, FileAttachment, MaintenanceRecord } from '../../types';
import { apiService } from '../../services/apiService';
import { EQUIPMENT_CATEGORIES, ROUTE_PATHS, EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLOR_MAP } from '../../constants';
import { ArrowLeftIcon, PencilSquareIcon, SaveIcon, LinkIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, WrenchIcon, PlusIcon, CalendarDaysIcon, CurrencyDollarIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../UI/Icons';
import Modal from '../UI/Modal';

type EditorMode = 'view' | 'edit';
type ActiveTab = 'general' | 'maintenance';

const MaintenanceRecordModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (data: Omit<MaintenanceRecord, 'id'>) => void, isSaving: boolean }> = ({ isOpen, onClose, onSave, isSaving }) => {
    const [record, setRecord] = useState<Partial<MaintenanceRecord>>({
        date: new Date().toISOString().split('T')[0],
        type: 'routine',
        cost: 0,
        description: '',
        technician: ''
    });

    useEffect(() => {
        if (isOpen) {
            setRecord({ date: new Date().toISOString().split('T')[0], type: 'routine', cost: 0, description: '', technician: '' });
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!record.description || !record.technician || !record.date) return;
        onSave(record as Omit<MaintenanceRecord, 'id'>);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Регистрация обслуживания">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                     <Input id="m-date" type="date" label="Дата" value={record.date} onChange={e => setRecord({...record, date: e.target.value})} required />
                     <div>
                        <label className="block text-sm font-medium mb-1">Тип работ</label>
                        <select value={record.type} onChange={e => setRecord({...record, type: e.target.value as any})} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm">
                            <option value="routine">Плановое ТО</option>
                            <option value="repair">Ремонт</option>
                            <option value="inspection">Осмотр</option>
                        </select>
                     </div>
                </div>
                <Input id="m-desc" label="Описание работ" value={record.description} onChange={e => setRecord({...record, description: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                     <Input id="m-tech" label="Исполнитель" value={record.technician} onChange={e => setRecord({...record, technician: e.target.value})} required />
                     <Input id="m-cost" type="number" label="Стоимость (₽)" value={String(record.cost)} onChange={e => setRecord({...record, cost: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="flex justify-end pt-2 gap-2">
                    <Button variant="secondary" onClick={onClose} type="button">Отмена</Button>
                    <Button type="submit" isLoading={isSaving}>Зарегистрировать</Button>
                </div>
            </form>
        </Modal>
    )
}

const EquipmentEditorPage: React.FC = () => {
    const { equipmentId } = useParams<{ equipmentId: string }>();
    const navigate = useNavigate();
    const isNew = !equipmentId;
    
    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [equipment, setEquipment] = useState<Partial<EquipmentItem>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<ActiveTab>('general');
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchEquipment = async () => {
            setIsLoading(true);
            setError(null);
            
            if (isNew) {
                setEquipment({
                    name: '', category: 'Другое',
                    amortization: { method: 'percentage_of_income', cost: 0, purchaseDate: new Date().toISOString().split('T')[0], amortizationPercentage: 1.0 },
                    isStorageLocation: false, status: 'operational', maintenanceHistory: []
                });
                setMode('edit');
            } else {
                try {
                    const allEquipment = await apiService.getEquipmentItems({ viewMode: 'all' });
                    const item = allEquipment.find(eq => eq.id === equipmentId);
                    if (item) {
                        setEquipment(item);
                    } else {
                        setError("Оборудование не найдено.");
                    }
                    setMode('view');
                } catch (err) {
                    setError("Ошибка загрузки данных.");
                }
            }
            setIsLoading(false);
        };
        fetchEquipment();
    }, [equipmentId, isNew]);
    
    const handleConfirmSave = async () => {
        setIsSaveConfirmOpen(false);
        setIsSaving(true);
        try {
            if (equipment.id) {
                await apiService.updateEquipmentItem(equipment as EquipmentItem);
            } else {
                await apiService.addEquipmentItem(equipment as any);
            }
            navigate(ROUTE_PATHS.EQUIPMENT);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleArchiveToggle = async () => {
        if (!equipment.id) return;
        setIsSaving(true);
        await apiService.archiveEquipmentItem(equipment.id, !equipment.isArchived);
        navigate(ROUTE_PATHS.EQUIPMENT);
    };

    const handleDelete = async () => {
        if (!equipment.id) return;
        setIsSaving(true);
        await apiService.deleteEquipmentItem(equipment.id);
        navigate(ROUTE_PATHS.EQUIPMENT);
    };
    
    const handleRegisterMaintenance = async (data: Omit<MaintenanceRecord, 'id'>) => {
        if (!equipment.id) return;
        setIsSaving(true);
        try {
            const updatedItem = await apiService.performMaintenance(equipment.id, data);
            setEquipment(updatedItem);
            setIsMaintenanceModalOpen(false);
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setEquipment(prev => ({ ...prev, [name]: checked }));
        } else {
            setEquipment(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
        }
    };

    const handleAmortizationChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setEquipment(prev => ({
            ...prev,
            amortization: {
                ...(prev.amortization!),
                method: 'percentage_of_income',
                [name]: type === 'number' ? parseFloat(value) || 0 : value
            }
        }));
    };

    if (isLoading) return <LoadingSpinner />;
    if (error && !equipment.id) return <p className="text-red-500">{error}</p>;
    if (!equipment) return null;

    const pageTitle = isNew ? 'Новое оборудование' : (mode === 'edit' ? `Редактирование: ${equipment.name}` : `Оборудование: ${equipment.name}`);
    const isFormDisabled = mode === 'view' || isSaving;

    return (
        <div className="space-y-4">
            <Button onClick={() => navigate(ROUTE_PATHS.EQUIPMENT)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку оборудования
            </Button>
            
            <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <div className="flex space-x-2">
                        {mode === 'view' && !equipment.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !equipment.isArchived && (
                            <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>

                <div className="border-b border-brand-border mb-4">
                    <nav className="-mb-px flex space-x-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'general' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border'}`}
                        >
                            Основное
                        </button>
                         {!isNew && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('maintenance')}
                                className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'maintenance' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border'}`}
                            >
                                Обслуживание
                            </button>
                        )}
                    </nav>
                </div>

                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <Card>
                            <h3 className="text-lg font-semibold mb-2">Основная информация</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input id="name" name="name" label="Название *" value={equipment.name || ''} onChange={handleInputChange} required disabled={isFormDisabled} />
                                <div>
                                    <label htmlFor="category" className="block text-sm font-medium text-brand-text-primary mb-1">Категория</label>
                                    <select id="category" name="category" value={equipment.category || ''} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500" disabled={isFormDisabled}>
                                        {EQUIPMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <Input id="powerKw" name="powerKw" type="number" label="Мощность, кВт" value={String(equipment.powerKw || '')} onChange={handleInputChange} disabled={isFormDisabled} />
                                 <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-brand-text-primary mb-1">Статус</label>
                                    <select id="status" name="status" value={equipment.status || 'operational'} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5" disabled={isFormDisabled}>
                                        {Object.entries(EQUIPMENT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                    </select>
                                 </div>
                             </div>
                             <div className="mt-4">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" name="isStorageLocation" checked={equipment.isStorageLocation || false} onChange={handleInputChange} disabled={isFormDisabled} className="h-4 w-4 text-sky-600 border-brand-border rounded focus:ring-sky-500" />
                                    <span className="text-sm">Это также место хранения</span>
                                </label>
                             </div>
                        </Card>
                        <Card>
                             <h3 className="text-lg font-semibold mb-2">Стоимость и Амортизация</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <Input id="cost" name="cost" type="number" label="Полная стоимость (₽) *" value={String(equipment.amortization?.cost || '')} onChange={handleAmortizationChange} required disabled={isFormDisabled}/>
                                 <Input id="purchaseDate" name="purchaseDate" type="date" label="Дата покупки *" value={equipment.amortization?.purchaseDate || ''} onChange={handleAmortizationChange} required disabled={isFormDisabled}/>
                                 <Input id="amortizationPercentage" name="amortizationPercentage" type="number" label="Амортизация (% от дохода) *" step="0.1" value={String(equipment.amortization?.amortizationPercentage || '')} onChange={handleAmortizationChange} required disabled={isFormDisabled}/>
                             </div>
                        </Card>
                        <div className="flex space-x-2">
                            {equipment.id && !equipment.isArchived && (
                                <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                            )}
                            {equipment.id && equipment.isArchived && (
                                 <>
                                    <Button type="button" variant="secondary" onClick={handleArchiveToggle} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                                    <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                                 </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'maintenance' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <Card>
                                <h3 className="text-lg font-semibold mb-3 flex items-center"><WrenchIcon className="h-5 w-5 mr-2"/>Планирование ТО</h3>
                                <div className="space-y-4">
                                    <Input 
                                        id="m-interval" 
                                        name="maintenanceIntervalDays" 
                                        type="number" 
                                        label="Интервал обслуживания (дней)" 
                                        value={String(equipment.maintenanceIntervalDays || '')} 
                                        onChange={handleInputChange} 
                                        disabled={isFormDisabled}
                                        placeholder="Например: 30"
                                    />
                                    <div className="flex justify-between items-center p-3 bg-brand-surface rounded-md border border-brand-border">
                                        <div>
                                            <p className="text-sm font-medium">Следующее ТО:</p>
                                            <p className={`text-lg font-bold ${equipment.nextMaintenanceDate && new Date(equipment.nextMaintenanceDate) < new Date() ? 'text-red-500' : 'text-brand-text-primary'}`}>
                                                {equipment.nextMaintenanceDate ? new Date(equipment.nextMaintenanceDate).toLocaleDateString() : 'Не запланировано'}
                                            </p>
                                        </div>
                                        {!isSaving && !equipment.isArchived && (
                                            <Button type="button" onClick={() => setIsMaintenanceModalOpen(true)} size="sm" leftIcon={<CheckCircleIcon className="h-4 w-4"/>}>Провести ТО</Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                            <Card>
                                <h3 className="text-lg font-semibold mb-3 flex items-center"><ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-500"/>Текущее состояние</h3>
                                <div className={`p-4 rounded-lg text-center border-2 ${EQUIPMENT_STATUS_COLOR_MAP[equipment.status || 'operational']?.replace('text-', 'border-').split(' ')[0]}`}>
                                     <span className="text-2xl font-bold block mb-1">{EQUIPMENT_STATUS_LABELS[equipment.status || 'operational']}</span>
                                     {equipment.status === 'broken' && <p className="text-sm">Требуется ремонт!</p>}
                                     {equipment.status === 'maintenance' && <p className="text-sm">На обслуживании</p>}
                                </div>
                            </Card>
                        </div>

                        <Card>
                            <h3 className="text-lg font-semibold mb-3">История Обслуживания</h3>
                            {(equipment.maintenanceHistory && equipment.maintenanceHistory.length > 0) ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-brand-surface text-brand-text-muted font-medium border-b border-brand-border">
                                            <tr>
                                                <th className="p-2">Дата</th>
                                                <th className="p-2">Тип</th>
                                                <th className="p-2">Описание</th>
                                                <th className="p-2">Исполнитель</th>
                                                <th className="p-2 text-right">Стоимость</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-border">
                                            {equipment.maintenanceHistory.map(rec => (
                                                <tr key={rec.id}>
                                                    <td className="p-2">{new Date(rec.date).toLocaleDateString()}</td>
                                                    <td className="p-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${rec.type === 'repair' ? 'bg-red-100 text-red-800' : 'bg-sky-100 text-sky-800'}`}>
                                                            {rec.type === 'routine' ? 'ТО' : rec.type === 'repair' ? 'Ремонт' : 'Осмотр'}
                                                        </span>
                                                    </td>
                                                    <td className="p-2">{rec.description}</td>
                                                    <td className="p-2 text-brand-text-secondary">{rec.technician}</td>
                                                    <td className="p-2 text-right">{rec.cost > 0 ? `${rec.cost} ₽` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-brand-text-muted text-center py-4">История пуста.</p>}
                        </Card>
                    </div>
                )}
            </form>
            
            <MaintenanceRecordModal 
                isOpen={isMaintenanceModalOpen} 
                onClose={() => setIsMaintenanceModalOpen(false)} 
                onSave={handleRegisterMaintenance} 
                isSaving={isSaving} 
            />
            
            {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения?" confirmText="Сохранить" isLoading={isSaving} />}
            {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать?" message="Вы уверены?" confirmText="Да, архивировать" isLoading={isSaving} />}
            {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить?" message="Это действие необратимо." confirmText="Удалить" isLoading={isSaving} />}
        </div>
    );
};

export default EquipmentEditorPage;
