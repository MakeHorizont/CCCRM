
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StrategicSubTask, User } from '../../types';
import { Bars2Icon, CheckCircleIcon, ChevronRightIcon, PaperAirplaneIcon, PencilSquareIcon, PlusIcon, TrashIcon, UserPlusIcon, LinkIcon } from '../UI/Icons';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import Input from '../UI/Input';
import ConfirmationModal from '../UI/ConfirmationModal';
import { getAssigneeColor } from '../../constants';

interface RecursiveSubTaskItemProps {
    subTask: StrategicSubTask;
    planId: string;
    planIsArchived: boolean;
    onUpdate: (planId: string, updatedSubTask: StrategicSubTask, newIndexInParent?: number) => Promise<void>;
    onDelete: (planId: string, subTaskId: string) => Promise<void>;
    onSendToKanban: (planId: string, subTaskId: string) => void;
    onAddNestedSubTask: (planId: string, parentSubTask: StrategicSubTask) => void;
    onNavigateToChildren?: (subTask: StrategicSubTask) => void;
    usersForAssigning: User[];
    currentUserId: string | undefined;
    depth: number;
    isDraggable: boolean;
    isOverlay?: boolean;
}

export const RecursiveSubTaskItem: React.FC<RecursiveSubTaskItemProps> = ({
    subTask, planId, planIsArchived, onUpdate, onDelete, onSendToKanban, onAddNestedSubTask, onNavigateToChildren, usersForAssigning, currentUserId, depth, isDraggable, isOverlay
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<StrategicSubTask>>(subTask);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => { setEditData(subTask) }, [subTask]);

    const { attributes, listeners, setNodeRef, transform, transition, isOver, isDragging: useSortableIsDragging } = useSortable({
      id: subTask.id,
      data: { type: 'subtask', parentId: subTask.parentId, depth, item: subTask },
      disabled: !!isOverlay || planIsArchived || !isDraggable,
      resizeObserverConfig: { disabled: true }
    });
    
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: useSortableIsDragging && !isOverlay ? 0.5 : 1, 
        backgroundColor: isOver && !isOverlay && !useSortableIsDragging ? 'rgba(79, 70, 229, 0.05)' : undefined, 
        cursor: isOverlay ? 'grabbing' : (planIsArchived || !isDraggable ? 'default' : 'grab'),
        marginLeft: !isOverlay ? `${depth * 20}px` : undefined,
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'progress') {
            const progressValue = parseInt(value);
            setEditData(prev => ({ ...prev, [name]: Math.max(0, Math.min(100, progressValue || 0)) }));
        } else if (name === 'assigneeId') {
            const selectedUser = usersForAssigning.find(u => u.id === value);
            setEditData(prev => ({ ...prev, assigneeId: value || undefined, assignee: selectedUser }));
        }
        else {
            setEditData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleToggleComplete = async () => {
        await onUpdate(planId, { ...subTask, completed: !subTask.completed, progress: !subTask.completed ? 100 : (subTask.progress === 100 ? 0 : subTask.progress) });
    };
    const handleSaveEdit = async () => {
        await onUpdate(planId, editData as StrategicSubTask);
        setIsEditing(false);
    };

    const handleTakeResponsibility = async () => {
        if (currentUserId && !subTask.assigneeId) {
            const currentUserDetails = usersForAssigning.find(u => u.id === currentUserId);
            await onUpdate(planId, { ...subTask, assigneeId: currentUserId, assignee: currentUserDetails });
        }
    };

    const assigneeColor = getAssigneeColor(subTask.assigneeId);
    const assignee = subTask.assignee || usersForAssigning.find(u => u.id === subTask.assigneeId);
    const effectiveProgress = subTask.kanbanTaskId ? (subTask.progress ?? 0) : (subTask.completed ? 100 : (subTask.progress ?? 0));
    
    const itemClasses = `p-3 rounded-md mb-2 border border-brand-border ${
      isOverlay 
        ? 'bg-brand-card shadow-lg' 
        : subTask.completed 
          ? 'bg-emerald-900/40' 
          : 'bg-brand-surface hover:border-brand-primary'
    }`;

    return (
        <div ref={isOverlay ? undefined : setNodeRef} style={style} className={itemClasses}>
            {isEditing && !planIsArchived ? (
                <div className="space-y-2">
                    <Input id={`st-title-${subTask.id}`} name="title" label="Название" value={editData.title || ''} onChange={handleInputChange} />
                    <textarea name="description" value={editData.description || ''} onChange={handleInputChange} placeholder="Описание"
                        className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500 text-sm" rows={2}/>
                    <div className="grid grid-cols-2 gap-2">
                        <Input id={`st-dueDate-${subTask.id}`} name="dueDate" label="Срок" type="date" value={editData.dueDate?.split('T')[0] || ''} onChange={handleInputChange} />
                        <div>
                            <label htmlFor={`st-assignee-${subTask.id}`} className="block text-sm font-medium text-brand-text-primary mb-1">Исполнитель</label>
                            <select id={`st-assignee-${subTask.id}`} name="assigneeId" value={editData.assigneeId || ''} onChange={handleInputChange}
                                className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500">
                                <option value="">Не назначен</option>
                                {usersForAssigning.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                            </select>
                        </div>
                    </div>
                    {!subTask.kanbanTaskId && (
                         <Input id={`st-progress-${subTask.id}`} name="progress" label={`Прогресс (${editData.progress || 0}%)`} type="range" min="0" max="100" step="5" value={String(editData.progress || 0)} onChange={handleInputChange}
                            className="w-full h-2 bg-brand-surface rounded-lg appearance-none cursor-pointer accent-sky-500 mt-6"
                         />
                    )}
                    <div className="flex justify-end space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Отмена</Button>
                        <Button size="sm" onClick={handleSaveEdit}>Сохранить</Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center flex-grow min-w-0">
                             {isDraggable && !isOverlay && (
                                <Tooltip text="Переместить">
                                    <button {...attributes} {...listeners} className="p-1 mr-2 cursor-grab text-brand-text-muted hover:text-brand-text-primary active:cursor-grabbing">
                                        <Bars2Icon className="h-4 w-4"/>
                                    </button>
                                </Tooltip>
                             )}
                             {(isOverlay || !isDraggable) && <div className="p-1 mr-2"><Bars2Icon className="h-4 w-4 text-brand-text-muted"/></div>}
                            <div className="flex-grow min-w-0">
                                <h4 className={`text-md font-medium truncate ${subTask.completed ? 'line-through text-brand-text-muted' : 'text-brand-text-primary'}`} title={subTask.title}>{subTask.title}</h4>
                                {subTask.description && <p className="text-xs text-brand-text-secondary mt-0.5 truncate" title={subTask.description}>{subTask.description}</p>}
                            </div>
                        </div>
                        <div className="flex space-x-1 items-center ml-2 flex-shrink-0">
                            {onNavigateToChildren && subTask.subTasks && subTask.subTasks.length > 0 && !isOverlay && (
                                <Tooltip text={`Открыть дочерние (${subTask.subTasks.length})`}>
                                    <Button variant="ghost" size="sm" onClick={() => onNavigateToChildren(subTask)} className="p-1">
                                        <ChevronRightIcon className="h-4 w-4 text-sky-400"/>
                                    </Button>
                                </Tooltip>
                            )}
                            {!planIsArchived && (
                                <Tooltip text="Добавить подзадачу">
                                    <Button variant="ghost" size="sm" onClick={() => onAddNestedSubTask(planId, subTask)} className="p-1"><PlusIcon className="h-4 w-4"/></Button>
                                </Tooltip>
                            )}
                            {!planIsArchived && !subTask.completed && (
                                <Tooltip text="Редактировать">
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="p-1"><PencilSquareIcon className="h-4 w-4"/></Button>
                                </Tooltip>
                            )}
                             {!planIsArchived && (
                                <Tooltip text="Удалить">
                                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="p-1"><TrashIcon className="h-4 w-4 text-red-500"/></Button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                    {(effectiveProgress > 0 || subTask.completed) && (
                         <div className="w-full bg-brand-surface rounded-full h-1.5 mt-1.5 relative">
                            <div className={`h-1.5 rounded-full ${subTask.completed ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${effectiveProgress}%` }}></div>
                            {effectiveProgress > 0 && effectiveProgress < 100 && !subTask.completed &&
                                <span className="absolute -top-1 right-0 text-[10px] text-sky-400 transform -translate-y-full">{effectiveProgress}%</span>
                            }
                        </div>
                    )}
                    <div className="text-xs text-brand-text-muted mt-1.5 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            {subTask.dueDate && <span>Срок: {new Date(subTask.dueDate).toLocaleDateString('ru-RU')}</span>}
                            {assignee && (
                                <Tooltip text={`Исполнитель: ${assignee.name || assignee.email}`}>
                                    <span className={`px-1.5 py-0.5 rounded ${assigneeColor} text-white text-[10px]`}>
                                        {assignee.name ? assignee.name.substring(0,1).toUpperCase() : assignee.email.substring(0,1).toUpperCase()}
                                    </span>
                                </Tooltip>
                            )}
                             {!assignee && !planIsArchived && currentUserId && (
                                <Tooltip text="Взять ответственность">
                                    <Button variant="ghost" size="sm" onClick={handleTakeResponsibility} className="p-0.5 text-sky-400 hover:text-sky-300">
                                       <UserPlusIcon className="h-4 w-4" />
                                    </Button>
                                </Tooltip>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {subTask.kanbanTaskId && (
                                <Tooltip text={`Связано с Kanban: ${subTask.kanbanTaskId}`}>
                                    <span className="inline-block"><LinkIcon className="h-4 w-4 text-sky-400"/></span>
                                </Tooltip>
                            )}
                            {!planIsArchived && !subTask.completed && ( 
                                <Tooltip text="Отправить/Обновить в Kanban">
                                    <Button variant="ghost" size="sm" onClick={() => onSendToKanban(planId, subTask.id)} className="p-0.5">
                                        <PaperAirplaneIcon className="h-4 w-4 text-sky-400"/>
                                    </Button>
                                </Tooltip>
                            )}
                            {!planIsArchived && (
                                <Tooltip text={subTask.completed ? "Отметить как невыполненное" : "Отметить как выполненное"}>
                                    <button onClick={handleToggleComplete} className={`p-1 rounded ${subTask.completed ? '' : 'text-zinc-500 hover:text-emerald-400'}`}>
                                        <CheckCircleIcon className={`h-5 w-5 ${subTask.completed ? 'fill-current text-emerald-400' : ''}`}/>
                                    </button>
                                </Tooltip>
                            )}
                             {subTask.completed && planIsArchived && <span className="text-emerald-500 text-xs">Выполнено</span>}
                             {subTask.subTasks && subTask.subTasks.length > 0 && <span className="text-brand-text-muted text-xs">Подзадач: {subTask.subTasks.length}</span>}
                        </div>
                    </div>
                </>
            )}
            {showDeleteConfirm && (
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={async () => { await onDelete(planId, subTask.id); setShowDeleteConfirm(false); }}
                    title="Удалить подзадачу?"
                    message={<p>Вы уверены, что хотите удалить подзадачу <strong className="text-brand-text-primary">{subTask.title}</strong> и все ее вложенные подзадачи?</p>}
                />
            )}
        </div>
    );
};
