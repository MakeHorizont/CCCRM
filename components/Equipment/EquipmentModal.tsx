import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { EquipmentItem, EquipmentCategory, FileAttachment } from '../../types';
import { EQUIPMENT_CATEGORIES } from '../../constants';
import { TrashIcon, PlusCircleIcon, LinkIcon, DocumentDuplicateIcon, PaperClipIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import { generateId } from '../../utils/idGenerators';

type ModalMode = 'view' | 'edit';

interface EquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveInitiate: (data: Partial<EquipmentItem>) => void;
    initialEquipment: Partial<EquipmentItem> | null;
    isSaving: boolean;
    modalMode: ModalMode;
    setModalMode: (mode: ModalMode) => void;
    onArchiveInitiate: (item: EquipmentItem) => void;
    onDeleteInitiate: (item: EquipmentItem) => void;
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({ 
    isOpen, onClose, onSaveInitiate, initialEquipment, isSaving, 
    modalMode, setModalMode, onArchiveInitiate, onDeleteInitiate 
}) => {
    const [equipment, setEquipment] = useState<Partial<EquipmentItem>>({});
    const [error, setError] = useState<string | null>(null);

    const isViewMode = modalMode === 'view';

    useEffect(() => {
        if (isOpen) {
            const defaultData: Partial<EquipmentItem> = {
                name: '',
                category: 'Другое',
                description: '',
                powerKw: 0,
                amortization: {
                    method: 'percentage_of_income',
                    cost: 0,
                    purchaseDate: new Date().toISOString().split('T')[0],
                    amortizationPercentage: 1.0,
                },
                attachments: [],
                isStorageLocation: false,
            };
            setEquipment(initialEquipment ? JSON.parse(JSON.stringify(initialEquipment)) : defaultData);
            setError(null);
        }
    }, [isOpen, initialEquipment]);

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
                method: 'percentage_of_income', // Ensure method is set
                [name]: type === 'number' ? parseFloat(value) || 0 : value
            }
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!equipment.name?.trim()) { setError("Название обязательно"); return; }
        if (!equipment.amortization?.cost || equipment.amortization.cost <= 0) { setError("Стоимость должна быть больше нуля"); return; }
        if (equipment.amortization?.amortizationPercentage === undefined || equipment.amortization.amortizationPercentage < 0) { setError("Процент амортизации не может быть отрицательным"); return; }
        onSaveInitiate(equipment);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={equipment.id ? (isViewMode ? `Оборудование: ${equipment.name}` : `Редактировать: ${equipment.name}`) : "Новое оборудование"} size="2xl">
            <form id="equipment-form" onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar-thin space-y-4">
                    {error && <p className="text-red-500 text-sm mb-2 p-2 bg-red-500/10 rounded-md">{error}</p>}
                    
                    <Input id="name" name="name" label="Название *" value={equipment.name || ''} onChange={handleInputChange} required disabled={isViewMode} />
                    
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-brand-text-primary mb-1">Категория</label>
                        <select id="category" name="category" value={equipment.category || ''} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500" disabled={isViewMode}>
                            {EQUIPMENT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    
                    <Input id="description" name="description" label="Описание" value={equipment.description || ''} onChange={handleInputChange} disabled={isViewMode} />
                    <Input id="photoUrl" name="photoUrl" label="URL фотографии" value={equipment.photoUrl || ''} onChange={handleInputChange} disabled={isViewMode} />
                    <Input id="powerKw" name="powerKw" type="number" label="Мощность, кВт" value={String(equipment.powerKw || '')} onChange={handleInputChange} disabled={isViewMode} />
                    
                    <div className="pt-4 mt-4 border-t border-brand-border">
                        <h4 className="text-md font-semibold text-brand-text-primary mb-2">Стоимость и Амортизация</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <Input id="cost" name="cost" type="number" label="Полная стоимость (₽) *" value={String(equipment.amortization?.cost || '')} onChange={handleAmortizationChange} required disabled={isViewMode}/>
                             <Input id="purchaseDate" name="purchaseDate" type="date" label="Дата покупки *" value={equipment.amortization?.purchaseDate || ''} onChange={handleAmortizationChange} required disabled={isViewMode}/>
                             <Input id="amortizationPercentage" name="amortizationPercentage" type="number" label="Амортизация (% от дохода) *" step="0.1" value={String(equipment.amortization?.amortizationPercentage || '')} onChange={handleAmortizationChange} required disabled={isViewMode}/>
                         </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-brand-border">
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" name="isStorageLocation" checked={equipment.isStorageLocation || false} onChange={handleInputChange} disabled={isViewMode} className="h-4 w-4 text-sky-600 border-brand-border rounded focus:ring-sky-500" />
                            <span className="text-sm">Это также место хранения (появится в модуле "Хранилища")</span>
                        </label>
                    </div>

                    <div className="pt-4 mt-4 border-t border-brand-border">
                         <h4 className="text-md font-semibold text-brand-text-primary mb-2">Ссылки и Документы</h4>
                         <div className="space-y-3">
                             <Input id="vendorLink" name="vendorLink" label="Ссылка на продавца" value={equipment.vendorLink || ''} onChange={handleInputChange} icon={<LinkIcon className="h-4 w-4 text-brand-text-muted"/>} disabled={isViewMode}/>
                             <Input id="vendorContact" name="vendorContact" label="Контакты продавца" value={equipment.vendorContact || ''} onChange={handleInputChange} disabled={isViewMode}/>
                             <Input id="sparePartsLink" name="sparePartsLink" label="Ссылка на запчасти" value={equipment.sparePartsLink || ''} onChange={handleInputChange} icon={<LinkIcon className="h-4 w-4 text-brand-text-muted"/>} disabled={isViewMode}/>
                             <Input id="knowledgeBaseLink" name="knowledgeBaseLink" label="Ссылка на запись в Базе Знаний" value={equipment.knowledgeBaseLink || ''} onChange={handleInputChange} icon={<LinkIcon className="h-4 w-4 text-brand-text-muted"/>} disabled={isViewMode}/>
                         </div>
                    </div>
                </div>
                
                <div className="flex-shrink-0 pt-5 flex justify-between items-center border-t border-brand-border">
                    <div>
                        {equipment.id && !isViewMode && (
                            equipment.isArchived ? (
                                 <Button type="button" variant="danger" onClick={() => onDeleteInitiate(equipment as EquipmentItem)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                            ) : (
                                <Button type="button" variant="secondary" onClick={() => onArchiveInitiate(equipment as EquipmentItem)} isLoading={isSaving} leftIcon={<ArchiveBoxArrowDownIcon className="h-5 w-5"/>}>Архивировать</Button>
                            )
                        )}
                    </div>
                    <div className="flex space-x-3">
                        {isViewMode ? (
                          <>
                            <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
                            <Button type="button" onClick={(e) => { e.preventDefault(); setModalMode('edit'); }}>Редактировать</Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                            <Button type="submit" isLoading={isSaving}>Сохранить</Button>
                          </>
                        )}
                    </div>
                </div>
            </form>
            <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
        </Modal>
    );
};

export default EquipmentModal;