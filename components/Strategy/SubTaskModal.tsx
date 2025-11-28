import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { StrategicSubTask, User } from '../../types';

interface SubTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (subTask: Partial<StrategicSubTask>) => Promise<void>;
    editingSubTaskData: Partial<StrategicSubTask> & { parentId?: string | null };
    usersForAssigning: User[];
    isSaving: boolean;
}

const SubTaskModal: React.FC<SubTaskModalProps> = ({ isOpen, onClose, onSave, editingSubTaskData, usersForAssigning, isSaving }) => {
    const [subTaskData, setSubTaskData] = useState(editingSubTaskData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSubTaskData(editingSubTaskData);
            setError(null);
        }
    }, [editingSubTaskData, isOpen]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const u = usersForAssigning.find(usr => usr.id === value);
        if (name === 'assigneeId') {
            setSubTaskData(p => ({ ...p, assigneeId: value || undefined, assignee: u }));
        } else {
            setSubTaskData(p => ({ ...p, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSave(subTaskData);
        } catch (err) {
            setError((err as Error).message);
        }
    };
    
    if (!subTaskData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={subTaskData.id ? "Редактировать подзадачу" : "Добавить подзадачу"} size="md">
            <form onSubmit={handleSubmit} className="space-y-3">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input id="new-st-title" name="title" label="Название подзадачи *" value={subTaskData.title || ''} onChange={handleInputChange} required/>
                <textarea name="description" value={subTaskData.description || ''} onChange={handleInputChange} placeholder="Описание (опционально)"
                        className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 text-sm" rows={3}/>
                <Input id="new-st-dueDate" name="dueDate" label="Срок выполнения (опционально)" type="date" value={subTaskData.dueDate?.split('T')[0] || ''} onChange={handleInputChange} />
                 <select id="new-st-assigneeId" name="assigneeId" value={subTaskData.assigneeId || ''} 
                        onChange={handleInputChange}
                        className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                        <option value="">Не назначен</option>
                        {usersForAssigning.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                    <Button type="submit" isLoading={isSaving}>{subTaskData.id ? "Сохранить" : "Добавить"}</Button>
                </div>
             </form>
        </Modal>
    );
};

export default SubTaskModal;
