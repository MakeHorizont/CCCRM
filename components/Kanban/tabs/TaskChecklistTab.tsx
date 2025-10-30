import React, { useState } from 'react';
import { KanbanTask, KanbanChecklistItem } from '../../../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Button from '../../UI/Button';
import Input from '../../UI/Input';
import { PlusIcon, TrashIcon, Bars2Icon } from '../../UI/Icons';
import { generateId } from '../../../utils/idGenerators';

interface SortableChecklistItemProps {
    item: KanbanChecklistItem;
    onUpdate: (id: string, text: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
    isEditing: boolean;
    isOverlay?: boolean;
}

const SortableChecklistItem: React.FC<SortableChecklistItemProps> = ({ item, onUpdate, onToggle, onRemove, isEditing, isOverlay }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !isEditing || isOverlay });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isOverlay ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center space-x-2 p-1.5 bg-brand-surface rounded-md">
            {isEditing && <button {...attributes} {...listeners} className="cursor-grab text-brand-text-muted p-1"><Bars2Icon className="h-4 w-4"/></button>}
            <input type="checkbox" checked={item.completed} onChange={() => onToggle(item.id)} disabled={!isEditing} className="h-4 w-4 text-sky-500 rounded border-brand-border" />
            <Input id={`checklist-item-${item.id}`} type="text" value={item.text} onChange={e => onUpdate(item.id, e.target.value)} disabled={!isEditing} className={`flex-grow !py-1 text-sm ${item.completed ? 'line-through text-brand-text-muted' : ''}`} />
            {isEditing && <Button type="button" variant="danger" size="sm" onClick={() => onRemove(item.id)} className="p-1"><TrashIcon className="h-4 w-4"/></Button>}
        </div>
    );
};

interface TaskChecklistTabProps {
    taskData: Partial<KanbanTask>;
    setTaskData: (data: Partial<KanbanTask>) => void;
    isEditing: boolean;
}

const TaskChecklistTab: React.FC<TaskChecklistTabProps> = ({ taskData, setTaskData, isEditing }) => {
    const [newItemText, setNewItemText] = useState('');
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor), useSensor(TouchSensor));

    const checklist = taskData.checklist || [];

    const handleAddItem = () => {
        if (!newItemText.trim()) return;
        const newItem: KanbanChecklistItem = {
            id: generateId('chk'),
            text: newItemText.trim(),
            completed: false,
            order: checklist.length
        };
        setTaskData({ ...taskData, checklist: [...checklist, newItem] });
        setNewItemText('');
    };

    const handleUpdateItem = (id: string, text: string) => {
        const newChecklist = checklist.map(item => item.id === id ? { ...item, text } : item);
        setTaskData({ ...taskData, checklist: newChecklist });
    };

    const handleToggleItem = (id: string) => {
        const newChecklist = checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
        setTaskData({ ...taskData, checklist: newChecklist });
    };

    const handleRemoveItem = (id: string) => {
        const newChecklist = checklist.filter(item => item.id !== id);
        setTaskData({ ...taskData, checklist: newChecklist });
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = checklist.findIndex(item => item.id === active.id);
            const newIndex = checklist.findIndex(item => item.id === over.id);
            const newOrderedChecklist = arrayMove(checklist, oldIndex, newIndex);
            setTaskData({ ...taskData, checklist: newOrderedChecklist.map((item, index) => ({ ...item, order: index })) });
        }
    };

    const draggedItem = activeDragId ? checklist.find(item => item.id === activeDragId) : null;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveDragId(e.active.id)} onDragEnd={handleDragEnd}>
            <div className="space-y-3">
                <SortableContext items={checklist.map(item => item.id)} strategy={verticalListSortingStrategy}>
                    {checklist.map(item => (
                        <SortableChecklistItem 
                            key={item.id} 
                            item={item}
                            onUpdate={handleUpdateItem}
                            onToggle={handleToggleItem}
                            onRemove={handleRemoveItem}
                            isEditing={isEditing}
                        />
                    ))}
                </SortableContext>
                <DragOverlay>
                    {draggedItem ? <SortableChecklistItem item={draggedItem} onUpdate={()=>{}} onToggle={()=>{}} onRemove={()=>{}} isEditing={isEditing} isOverlay /> : null}
                </DragOverlay>

                {isEditing && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-brand-border">
                        <Input id="new-checklist-item" type="text" placeholder="Добавить новый пункт..." value={newItemText} onChange={e => setNewItemText(e.target.value)} className="flex-grow !py-1 text-sm"/>
                        <Button type="button" onClick={handleAddItem} disabled={!newItemText.trim()} leftIcon={<PlusIcon className="h-4 w-4"/>}>Добавить</Button>
                    </div>
                )}
            </div>
        </DndContext>
    );
};

export default TaskChecklistTab;