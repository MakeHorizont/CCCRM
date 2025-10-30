

import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { KanbanBoard, KanbanBoardAccessRule, User } from '../../types';
import { TrashIcon, PlusIcon } from '../UI/Icons';

interface KanbanBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boardData: Partial<KanbanBoard>) => Promise<void>;
  initialBoardData: Partial<KanbanBoard>;
  isSaving: boolean;
  allUsers: User[];
  allFunctionalRoles: string[];
}

const KanbanBoardModal: React.FC<KanbanBoardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBoardData,
  isSaving,
  allUsers,
  allFunctionalRoles,
}) => {
  const [boardData, setBoardData] = useState<Partial<KanbanBoard>>(initialBoardData);
  const [modalError, setModalError] = useState<string | null>(null);
  
  const [newAccessRule, setNewAccessRule] = useState<{entityId: string; entityType: 'user' | 'role'}>({entityId: '', entityType: 'user'});

  useEffect(() => {
    setBoardData(initialBoardData);
    setModalError(null);
    setNewAccessRule({entityId: '', entityType: 'user'});
  }, [initialBoardData, isOpen]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBoardData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAccessRule = () => {
    if (!newAccessRule.entityId) return;
    const existingRules = boardData.accessRules || [];
    if (existingRules.some(r => r.entityId === newAccessRule.entityId && r.entityType === newAccessRule.entityType)) {
        setModalError("Такое правило доступа уже существует.");
        return;
    }
    setBoardData(prev => ({
        ...prev,
        accessRules: [...existingRules, { ...newAccessRule }]
    }));
    setNewAccessRule({entityId: '', entityType: 'user'}); 
    setModalError(null);
  };

  const handleRemoveAccessRule = (ruleToRemove: KanbanBoardAccessRule) => {
    setBoardData(prev => ({
        ...prev,
        accessRules: (prev?.accessRules || []).filter(r => !(r.entityId === ruleToRemove.entityId && r.entityType === ruleToRemove.entityType))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!boardData.name?.trim()) {
      setModalError('Название доски обязательно.');
      return;
    }
    try {
        await onSave(boardData);
        // onClose(); // Parent will handle close on success
    } catch (err) {
        // Error is set by parent, or can be set here if parent doesn't
        setModalError((err as Error).message || "Произошла ошибка при сохранении.");
    }
  };
  
  const filteredUsersForNewRule = allUsers.filter(u => !(boardData.accessRules || []).some(r => r.entityType === 'user' && r.entityId === u.id));
  const filteredRolesForNewRule = allFunctionalRoles.filter(roleName => !(boardData.accessRules || []).some(r => r.entityType === 'role' && r.entityId === roleName));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={boardData.id ? 'Редактировать доску' : 'Создать доску Kanban'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar-thin">
        {modalError && <p className="text-red-500 text-sm mb-3 p-2 bg-red-500/10 rounded-md">{modalError}</p>}
        <Input id="board-name" name="name" label="Название доски *" value={boardData.name || ''} onChange={handleInputChange} required autoFocus disabled={boardData.isArchived || isSaving}/>
        <div>
          <label htmlFor="board-description" className="block text-sm font-medium text-brand-text-primary mb-1">Описание</label>
          <textarea id="board-description" name="description" value={boardData.description || ''} onChange={handleInputChange} rows={3} disabled={boardData.isArchived || isSaving}
            className="block w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg placeholder-brand-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary sm:text-sm text-brand-text-primary" />
        </div>

        {!boardData.isArchived && (
          <div className="space-y-3 pt-2 border-t border-brand-border">
            <h4 className="text-md font-semibold text-brand-text-primary">Правила доступа</h4>
            {(boardData.accessRules || []).length === 0 && <p className="text-xs text-brand-text-muted italic">Если правила не указаны, доска доступна всем.</p>}
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar-thin pr-1">
              {(boardData.accessRules || []).map((rule, index) => (
                <div key={`${rule.entityType}-${rule.entityId}-${index}`} className="flex items-center justify-between p-1.5 bg-brand-surface rounded-md text-xs">
                  <span>
                    {rule.entityType === 'user' ? `Пользователь: ${allUsers.find(u => u.id === rule.entityId)?.name || rule.entityId}` : `Роль: ${rule.entityId}`}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAccessRule(rule)} className="p-0.5 text-red-400 hover:text-red-300" aria-label="Удалить правило" disabled={isSaving}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <label htmlFor="access-rule-type" className="sr-only">Тип правила</label>
                <select 
                    id="access-rule-type"
                    value={newAccessRule.entityType} 
                    onChange={(e) => setNewAccessRule({entityId: '', entityType: e.target.value as 'user' | 'role'})}
                    className="w-full bg-brand-card border border-brand-border rounded-md p-1.5 text-xs text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
                    disabled={isSaving}
                >
                    <option value="user">Пользователь</option>
                    <option value="role">Функциональная Роль</option>
                </select>
              </div>
              <div className="flex-grow">
                 <label htmlFor="access-rule-entity" className="sr-only">Сущность</label>
                 <select 
                    id="access-rule-entity"
                    value={newAccessRule.entityId}
                    onChange={(e) => setNewAccessRule(prev => ({...prev, entityId: e.target.value}))}
                    className="w-full bg-brand-card border border-brand-border rounded-md p-1.5 text-xs text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
                    disabled={isSaving || (newAccessRule.entityType === 'user' ? filteredUsersForNewRule.length === 0 : filteredRolesForNewRule.length === 0)}
                 >
                    <option value="" disabled>{newAccessRule.entityType === 'user' ? (filteredUsersForNewRule.length === 0 ? 'Все пользователи добавлены' : 'Выберите пользователя...') : (filteredRolesForNewRule.length === 0 ? 'Все роли добавлены' : 'Выберите роль...')}</option>
                    {newAccessRule.entityType === 'user' ? 
                        filteredUsersForNewRule.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>) :
                        // FIX: Explicitly type `roleName` as string to resolve inference issue.
                        filteredRolesForNewRule.map((roleName: string) => <option key={roleName} value={roleName}>{roleName}</option>)
                    }
                 </select>
              </div>
              <Button type="button" size="sm" onClick={handleAddAccessRule} disabled={!newAccessRule.entityId || isSaving} leftIcon={<PlusIcon className="h-3.5 w-3.5"/>}>Добавить</Button>
            </div>
          </div>
        )}

        <div className="pt-5 flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
          {!boardData.isArchived && <Button type="submit" isLoading={isSaving}>{boardData.id ? 'Сохранить' : 'Создать'}</Button>}
        </div>
      </form>
      <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
    </Modal>
  );
};

export default KanbanBoardModal;