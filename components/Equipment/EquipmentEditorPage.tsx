import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import { EquipmentItem, EquipmentCategory, FileAttachment } from '../../types';
import { apiService } from '../../services/apiService';
import { EQUIPMENT_CATEGORIES, ROUTE_PATHS, EQUIPMENT_STATUS_LABELS } from '../../constants';
import { ArrowLeftIcon, PencilSquareIcon, SaveIcon, LinkIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon } from '../UI/Icons';

type EditorMode = 'view' | 'edit';

const EquipmentEditorPage: React.FC = () => {
    const { equipmentId } = useParams<{ equipmentId: string }>();
    const navigate = useNavigate();
    const isNew = !equipmentId;
    
    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [equipment, setEquipment] = useState<Partial<EquipmentItem>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
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
                    isStorageLocation: false, status: 'operational'
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
            </form>
            
            {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения?" confirmText="Сохранить" isLoading={isSaving} />}
            {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать?" message="Вы уверены?" confirmText="Да, архивировать" isLoading={isSaving} />}
            {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить?" message="Это действие необратимо." confirmText="Удалить" isLoading={isSaving} />}
        </div>
    );
};

export default EquipmentEditorPage;