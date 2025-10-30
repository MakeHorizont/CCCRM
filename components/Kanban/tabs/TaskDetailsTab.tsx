import React, { ChangeEvent } from 'react';
import { KanbanTask, KanbanTaskStatus, User, KanbanBoard } from '../../../types';
import Input from '../../UI/Input';
import { TASK_COMPLEXITY_OPTIONS, PRIORITY_ICON_MAP } from '../../../constants';

interface TaskDetailsTabProps {
    taskData: Partial<KanbanTask>;
    setTaskData: (data: Partial<KanbanTask>) => void;
    isEditing: boolean;
    allUsers: User[];
    allBoards: KanbanBoard[];
}

const TaskDetailsTab: React.FC<TaskDetailsTabProps> = ({ taskData, setTaskData, isEditing, allUsers, allBoards }) => {
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setTaskData({ ...taskData, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (value === 'null' ? null : value) });
    };

    const handleBoardSelection = (boardId: string) => {
        const currentBoardIds = taskData.boardIds || [];
        const newBoardIds = currentBoardIds.includes(boardId)
            ? currentBoardIds.filter(id => id !== boardId)
            : [...currentBoardIds, boardId];
        setTaskData({ ...taskData, boardIds: newBoardIds });
    };

    return (
        <div className="space-y-4">
            <Input id="task-title" name="title" label="Название задачи" value={taskData.title || ''} onChange={handleInputChange} disabled={!isEditing} required className="text-lg font-semibold"/>
            <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-1">Описание</label>
                <textarea name="description" value={taskData.description || ''} onChange={handleInputChange} disabled={!isEditing} rows={4} className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Статус</label>
                    <select name="status" value={taskData.status || ''} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                        {Object.values(KanbanTaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Исполнитель</label>
                    <select name="assigneeId" value={taskData.assigneeId || ''} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                        <option value="">Не назначен</option>
                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                    </select>
                </div>
                <Input id="task-dueDate" name="dueDate" type="date" label="Срок выполнения" value={taskData.dueDate?.split('T')[0] || ''} onChange={handleInputChange} disabled={!isEditing} />
                <div>
                    <label className="block text-sm font-medium mb-1">Приоритет</label>
                    <select name="priority" value={taskData.priority || ''} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                        <option value="">Нет</option>
                        {Object.entries(PRIORITY_ICON_MAP).map(([key, {label}]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Сложность</label>
                    <select name="complexity" value={taskData.complexity || 'medium'} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
                        {TASK_COMPLEXITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="flex items-center space-x-4 pt-6">
                    <label className="flex items-center"><input type="checkbox" name="showInMyTasks" checked={taskData.showInMyTasks || false} onChange={handleInputChange} disabled={!isEditing} className="h-4 w-4"/> <span className="ml-2 text-sm">Показывать в "Мои Задачи"</span></label>
                    <label className="flex items-center"><input type="checkbox" name="selfAssigned" checked={taskData.selfAssigned || false} onChange={handleInputChange} disabled={!isEditing} className="h-4 w-4"/> <span className="ml-2 text-sm">Взята самостоятельно</span></label>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Доски</label>
                <div className="flex flex-wrap gap-2 p-2 bg-brand-surface rounded-md">
                    {allBoards.map(board => (
                        <button
                            key={board.id}
                            type="button"
                            onClick={() => isEditing && handleBoardSelection(board.id)}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                (taskData.boardIds || []).includes(board.id)
                                    ? 'bg-sky-500/30 border-sky-500 text-sky-800 dark:text-sky-100'
                                    : 'bg-brand-secondary border-brand-border text-brand-text-secondary'
                            } ${isEditing ? 'cursor-pointer hover:border-sky-400' : 'cursor-default'}`}
                            disabled={!isEditing}
                        >
                            {board.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TaskDetailsTab;