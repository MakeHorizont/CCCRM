import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { PencilSquareIcon } from '../UI/Icons'; 

interface UserHierarchyItemProps {
  user: User;
  allUsers: User[];
  level: number;
  onManagerChange: (userId: string, newManagerId: string | null) => void;
  onOpenProfile: (user: User) => void;
  isSavingGlobal: boolean;
  currentUserRole?: User['role'];
}

const UserHierarchyItem: React.FC<UserHierarchyItemProps> = ({ user, allUsers, level, onManagerChange, onOpenProfile, isSavingGlobal, currentUserRole }) => {
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(user.managerId || null);

  useEffect(() => {
    setSelectedManagerId(user.managerId || null);
  }, [user.managerId]);

  const handleSelectManager = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newManagerId = e.target.value === 'null' || e.target.value === '' ? null : e.target.value;
    setSelectedManagerId(newManagerId);
    onManagerChange(user.id, newManagerId);
  };

  const managerOptions = allUsers.filter(u => u.id !== user.id && u.role !== 'employee' && u.status !== 'fired');
  const canEditHierarchy = currentUserRole === 'ceo';
  const functionalRolesDisplay = user.functionalRoles && user.functionalRoles.length > 0 ? user.functionalRoles.join(', ') : 'Не указаны';

  return (
    <div 
      className="p-3 border-b border-brand-border hover:bg-brand-surface transition-colors group"
      style={{ paddingLeft: `${1 + level * 1.5}rem`}}
    >
      <div className="flex items-center justify-between">
        <div 
            className="flex-1 min-w-0 cursor-pointer group-hover:text-sky-400" 
            onClick={() => onOpenProfile(user)}
            title={`Открыть профиль: ${user.name || user.email}`}
        >
          <p className="text-sm font-medium text-brand-text-primary group-hover:text-sky-400 truncate">{user.name || user.email}</p>
          <p className="text-xs text-brand-text-muted truncate">{user.email}</p>
        </div>
        <div className="ml-4 flex-1 min-w-0 text-xs text-brand-text-secondary truncate" title={functionalRolesDisplay}>
            {functionalRolesDisplay}
        </div>
        <div className="ml-4 w-48 flex-shrink-0">
          {user.role !== 'ceo' ? (
            <select
              value={selectedManagerId === null ? 'null' : selectedManagerId || ''}
              onChange={handleSelectManager}
              disabled={isSavingGlobal || !canEditHierarchy}
              className="w-full bg-brand-card border border-brand-border rounded-md p-1.5 text-xs text-brand-text-primary focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
            >
              <option value="null">Нет руководителя</option>
              {managerOptions.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.name || manager.email}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-brand-text-muted italic">Верхний уровень</span>
          )}
        </div>
         <button 
            onClick={() => onOpenProfile(user)} 
            className="ml-2 p-1 text-brand-text-muted hover:text-brand-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
            aria-label="Открыть профиль"
        >
            <PencilSquareIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};


export default UserHierarchyItem;
