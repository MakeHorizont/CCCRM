
import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Button from '../UI/Button';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import { TechnologyCard, WarehouseItem, TechnologyStep, TechStepType, HouseholdItem, EquipmentItem } from '../../types';
import { apiService } from '../../services/apiService';
import { ArrowLeftIcon, PencilSquareIcon, PlusCircleIcon, TrashIcon, Bars2Icon, BeakerIcon, FireIcon, BoltIcon, CogIcon, ExclamationTriangleIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, SaveIcon } from '../UI/Icons';
import { ROUTE_PATHS } from '../../constants';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Input from '../UI/Input';

type EditorMode = 'view' | 'edit';


const SortableStepItem: React.FC<{
    step: TechnologyStep; 
    onUpdate: (stepId: string, updates: Partial<TechnologyStep>) => void;
    onRemove: (stepId: string) => void;
    availableIngredients: HouseholdItem[];
    availableEquipment: EquipmentItem[];
    isOverlay?: boolean;
    disabled?: boolean;
}> = ({ step, onUpdate, onRemove, availableIngredients, availableEquipment, isOverlay, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id, data: { item: step }, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging && !isOverlay ? 0.5 : 1,
    boxShadow: isOverlay ? '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.1)' : 'none',
    cursor: isOverlay ? 'grabbing' : (disabled ? 'default' : 'grab'),
  };

  const StepIcon = {
    ingredient: <BeakerIcon className="h-5 w-5 text-sky-400"/>,
    action: <BoltIcon className="h-5 w-5 text-yellow-400"/>,
    process: <FireIcon className="h-5 w-5 text-orange-400"/>,
    safety: <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
  }[step.type];

  return (
    <div ref={setNodeRef} style={style} className="p-3 bg-brand-surface rounded-md border border-brand-border mb-2">
      <div className="flex items-start space-x-2">
        <span {...attributes} {...listeners} className={`pt-1 text-brand-text-muted hover:text-brand-text-primary touch-none ${disabled ? 'cursor-default' : 'cursor-grab'}`}>
          <Bars2Icon className="h-5 w-5"/>
        </span>
        <div className="flex-grow space-y-2">
          <div className="flex items-center space-x-2">
            {StepIcon}
            <Input id={`step-name-${step.id}`} type="text" value={step.name} onChange={e => onUpdate(step.id, { name: e.target.value })} className="flex-grow !py-1 text-sm font-medium" disabled={disabled}/>
            {!disabled && <Button type="button" variant="danger" size="sm" onClick={() => onRemove(step.id)} className="p-1 leading-none"><TrashIcon className="h-4 w-4"/></Button>}
          </div>
          <textarea value={step.description || ''} onChange={e => onUpdate(step.id, { description: e.target.value })} placeholder="Описание шага..." rows={1} className="w-full text-xs p-1.5 bg-brand-card border border-brand-border rounded-md" disabled={disabled}/>
          {step.type === 'ingredient' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <select value={step.componentId || ''} onChange={e => {
                  const selected = availableIngredients.find(i => i.id === e.target.value);
                  onUpdate(step.id, { componentId: e.target.value, componentName: selected?.name, unit: selected?.unit });
              }} className="w-full bg-brand-card border border-brand-border rounded-md p-1.5" disabled={disabled}>
                  <option value="">Выберите сырье...</option>
                  {availableIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <Input id={`step-qty-${step.id}`} type="number" step="0.001" value={String(step.plannedQuantity || '')} onChange={e => onUpdate(step.id, { plannedQuantity: parseFloat(e.target.value) || undefined })} placeholder="Кол-во" className="!py-1.5 w-full" disabled={disabled}/>
                <span className="text-brand-text-muted">{step.unit || 'ед.'}</span>
              </div>
            </div>
          )}
          {(step.type === 'action' || step.type === 'process') && (
               <div className="text-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     <Input id={`step-duration-${step.id}`} type="number" value={String(step.durationMinutes || '')} onChange={e => onUpdate(step.id, { durationMinutes: parseInt(e.target.value) || undefined })} label="Длительность (мин)" smallLabel placeholder="Напр: 30" className="!py-1.5" disabled={disabled}/>
                     <Input id={`step-power-${step.id}`} type="number" value={String(step.powerUsagePercentage || '')} onChange={e => onUpdate(step.id, { powerUsagePercentage: parseInt(e.target.value) || undefined })} label="Нагрузка (%)" smallLabel placeholder="0-100" min="0" max="100" className="!py-1.5" disabled={disabled}/>
                  </div>
                  <div>
                    <label htmlFor={`equip-select-${step.id}`} className="block text-xs font-medium text-brand-text-muted mb-1">Требуемое оборудование (опционально)</label>
                    <select id={`equip-select-${step.id}`} value={step.requiredEquipmentId || ''} onChange={e => {
                        const selected = availableEquipment.find(eq => eq.id === e.target.value);
                        onUpdate(step.id, { requiredEquipmentId: e.target.value || undefined, requiredEquipmentName: selected?.name || undefined });
                    }} className="w-full bg-brand-card border border-brand-border rounded-md p-1.5" disabled={disabled}>
                        <option value="">Не выбрано</option>
                        {availableEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                    </select>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};


const TechnologyEditorPage: React.FC = () => {
    const { warehouseItemId } = useParams<{ warehouseItemId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const isNew = location.pathname.endsWith('/new');
    const targetItemId = isNew ? new URLSearchParams(location.search).get('warehouseItemId') : warehouseItemId;

    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [techCard, setTechCard] = useState<Partial<TechnologyCard>>({});
    const [targetItem, setTargetItem] = useState<WarehouseItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
    const [availableIngredients, setAvailableIngredients] = useState<HouseholdItem[]>([]);
    const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([]);


    useEffect(() => {
        const fetchData = async () => {
            if (!targetItemId) { setError("Не указан товар для технологической карты."); setIsLoading(false); return; }
            setIsLoading(true);
            try {
                const [itemData, ingredients, equipment, cards] = await Promise.all([
                    apiService.getWarehouseItemById(targetItemId),
                    apiService.getHouseholdItems({ viewMode: 'active' }),
                    apiService.getEquipmentItems({ viewMode: 'active' }),
                    apiService.getTechnologyCards({ viewMode: 'all' }),
                ]);

                if (!itemData) { setError("Целевой товар не найден."); setIsLoading(false); return; }
                setTargetItem(itemData);
                setAvailableIngredients(ingredients.filter(i => i.category === 'Сырьё' || i.category === 'Специи'));
                setAvailableEquipment(equipment);

                const cardData = cards.find(c => c.warehouseItemId === targetItemId);

                if (cardData) {
                    setTechCard({...cardData, steps: (cardData.steps || []).sort((a,b) => a.order - b.order)});
                    setMode(cardData.isArchived ? 'view' : 'view');
                } else {
                    setTechCard({ warehouseItemId: targetItemId, name: `Технология для "${itemData.name}"`, steps: [], isArchived: false });
                    if (!isNew) setMode('edit'); else setMode('edit');
                }
            } catch (err) { setError("Ошибка загрузки данных.");
            } finally { setIsLoading(false); }
        };
        fetchData();
    }, [targetItemId, isNew]);
    
    const handleSave = async () => {
        setIsSaveConfirmOpen(false);
        setIsSaving(true);
        try {
            if (techCard?.id) {
                await apiService.updateTechnologyCard(techCard as TechnologyCard);
            } else {
                await apiService.addTechnologyCard(techCard as any);
            }
            navigate(ROUTE_PATHS.TECHNOLOGIES);
        } catch(err) { setError((err as Error).message);
        } finally { setIsSaving(false); }
    };

    const handleArchiveToggle = async () => {
      if(!techCard?.id) return;
      setIsSaving(true);
      await apiService.archiveTechnologyCard(techCard.id, !techCard.isArchived);
      navigate(ROUTE_PATHS.TECHNOLOGIES);
    };

    const handleDelete = async () => {
      if(!techCard?.id) return;
      setIsSaving(true);
      await apiService.deleteTechnologyCard(techCard.id);
      navigate(ROUTE_PATHS.TECHNOLOGIES);
    };
    
    const handleUpdateStep = (stepId: string, updates: Partial<TechnologyStep>) => {
        setTechCard(prev => prev ? ({ ...prev, steps: (prev.steps || []).map(s => s.id === stepId ? { ...s, ...updates } : s) }) : null);
    };

    const handleRemoveStep = (stepId: string) => {
        setTechCard(prev => prev ? ({ ...prev, steps: (prev.steps || []).filter(s => s.id !== stepId).map((s, index) => ({ ...s, order: index + 1 })) }) : null);
    };

    const handleAddStep = (type: TechStepType) => {
        const newStep: TechnologyStep = {
            id: `new-step-${Date.now()}`,
            order: (techCard?.steps?.length || 0) + 1,
            type: type, name: `Новый шаг: ${type}`
        };
        setTechCard(prev => prev ? ({ ...prev, steps: [...(prev.steps || []), newStep] }) : null);
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }), useSensor(KeyboardSensor));
    
    const handleDragStart = (event: DragEndEvent) => setActiveDragId(event.active.id);

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setTechCard(prev => {
                if (!prev || !prev.steps) return prev;
                const oldIndex = prev.steps.findIndex(s => s.id === active.id);
                const newIndex = prev.steps.findIndex(s => s.id === over.id);
                const newSteps = arrayMove(prev.steps, oldIndex, newIndex);
                return { ...prev, steps: newSteps.map((s, idx) => ({ ...s, order: idx + 1 })) };
            });
        }
    };
    
    if (isLoading) return <LoadingSpinner />;
    if (error) return <p className="text-red-500 text-center p-4">{error}</p>;
    if (!targetItem || !techCard) return <p className="text-center p-4">Данные не найдены.</p>;

    const pageTitle = isNew ? `Новая тех. карта для ${targetItem.name}` : `Тех. карта: ${targetItem.name}`;
    const draggedStep = activeDragId ? techCard.steps?.find(s => s.id === activeDragId) : null;
    const isFormDisabled = mode === 'view' || isSaving;

    return (
         <div className="space-y-4">
             <Button onClick={() => navigate(ROUTE_PATHS.TECHNOLOGIES)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку тех. карт
            </Button>
            
             <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">{pageTitle} (Версия: {techCard.version || 1})</h1>
                     <div className="flex space-x-2">
                        {mode === 'view' && !techCard.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !techCard.isArchived && (
                             <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>
                <Card>
                    <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar-thin">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
                            <SortableContext items={(techCard.steps || []).map(s => s.id)} strategy={verticalListSortingStrategy}>
                            {(techCard.steps || []).map(step => (
                                <SortableStepItem 
                                    key={step.id} 
                                    step={step}
                                    onUpdate={handleUpdateStep}
                                    onRemove={handleRemoveStep}
                                    availableIngredients={availableIngredients}
                                    availableEquipment={availableEquipment}
                                    disabled={techCard.isArchived || isFormDisabled}
                                />
                            ))}
                            </SortableContext>
                            <DragOverlay>
                                {draggedStep ? (
                                <SortableStepItem step={draggedStep} onUpdate={()=>{}} onRemove={()=>{}} availableIngredients={availableIngredients} availableEquipment={availableEquipment} isOverlay disabled={techCard.isArchived || isFormDisabled}/>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                     <div className="flex-shrink-0 pt-4 border-t border-brand-border flex items-center justify-between">
                        <div className="flex space-x-2">
                            {!techCard.isArchived && !isFormDisabled && (
                                <>
                                    <Button size="sm" onClick={() => handleAddStep('ingredient')} leftIcon={<BeakerIcon className="h-4 w-4"/>}>Сырье</Button>
                                    <Button size="sm" onClick={() => handleAddStep('action')} leftIcon={<BoltIcon className="h-4 w-4"/>}>Действие</Button>
                                    <Button size="sm" onClick={() => handleAddStep('process')} leftIcon={<FireIcon className="h-4 w-4"/>}>Процесс</Button>
                                    <Button size="sm" onClick={() => handleAddStep('safety')} leftIcon={<ExclamationTriangleIcon className="h-4 w-4"/>}>ТБ</Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
                 <div className="flex space-x-2 mt-4">
                    {techCard.id && mode === 'view' && !techCard.isArchived && (
                        <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                    )}
                    {techCard.id && techCard.isArchived && (
                         <>
                           <Button type="button" variant="secondary" onClick={handleArchiveToggle} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                           <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                        </>
                    )}
                </div>
             </form>
              {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleSave} title="Подтвердить сохранение" message="Сохранить изменения в технологической карте? Будет создана новая версия." confirmText="Сохранить" isLoading={isSaving} />}
              {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать?" message="Карту нельзя будет использовать для новых ПЗ." confirmText="Да, архивировать" confirmButtonVariant="danger" isLoading={isSaving} />}
              {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить?" message="Это действие необратимо." confirmText="Удалить" confirmButtonVariant="danger" isLoading={isSaving} />}
             <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
        </div>
    );
};

export default TechnologyEditorPage;
