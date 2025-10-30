import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { UsersIconDefault, CheckCircleIcon } from '../UI/Icons';
import UserHierarchyItem from './UserHierarchyItem';
import { useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';

const HierarchyPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingHierarchy, setIsSavingHierarchy] = useState(false);
  const [saveHierarchySuccess, setSaveHierarchySuccess] = useState(false);
  const [pendingHierarchyChanges, setPendingHierarchyChanges] = useState<Record<string, string | null>>({});

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersData = await apiService.getUsersWithHierarchyDetails();
      setUsers(usersData);
    } catch (err) {
      setError('Не удалось загрузить данные.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleManagerChange = (userId: string, newManagerId: string | null) => {
    setPendingHierarchyChanges(prev => ({ ...prev, [userId]: newManagerId }));
    setSaveHierarchySuccess(false); 
  };

  const handleSaveHierarchyChanges = async () => {
    setIsSavingHierarchy(true);
    setError(null);
    setSaveHierarchySuccess(false);
    let successCount = 0;

    for (const userId in pendingHierarchyChanges) {
      const newManagerId = pendingHierarchyChanges[userId];
      try {
        await apiService.updateUserProfile(userId, { managerId: newManagerId });
        successCount++;
      } catch (err) {
        setError(`Ошибка при обновлении руководителя для пользователя ${userId}: ${(err as Error).message}`);
        break; 
      }
    }
    setIsSavingHierarchy(false);
    if (successCount > 0 && !error) {
        setSaveHierarchySuccess(true);
        setTimeout(() => setSaveHierarchySuccess(false), 3000);
    }
    setPendingHierarchyChanges({});
    fetchAllData(); 
  };
  
  const handleOpenProfilePage = (user: User) => {
    navigate(`${ROUTE_PATHS.PROFILE}/${user.id}`);
  };


  // FIX: Changed JSX.Element[] to React.ReactElement[] to resolve "Cannot find namespace 'JSX'".
  const buildHierarchy = (allUsers: User[], managerId: string | null | undefined, level: number): React.ReactElement[] => {
    return allUsers
      .filter(u => u.managerId === managerId || (managerId === null && u.managerId === undefined)) 
      .sort((a,b) => (a.name || a.email).localeCompare(b.name || b.email))
      .flatMap(user => [
        <UserHierarchyItem 
            key={user.id} 
            user={user} 
            allUsers={allUsers} 
            level={level} 
            onManagerChange={handleManagerChange}
            onOpenProfile={handleOpenProfilePage}
            isSavingGlobal={isSavingHierarchy}
            currentUserRole={currentUser?.role}
        />,
        ...buildHierarchy(allUsers, user.id, level + 1)
      ]);
  };
  
  if (currentUser?.role !== 'ceo' && !currentUser?.permissions?.includes('manage_user_hierarchy')) {
      return (
          <div className="text-center p-8">
              <h1 className="text-2xl font-semibold text-red-500">Доступ запрещен</h1>
              <p className="text-brand-text-secondary mt-2">У вас нет прав для просмотра этой страницы.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
          <UsersIconDefault className="h-8 w-8 mr-3 text-brand-primary" />
          Управление Коллективом
        </h1>
        {Object.keys(pendingHierarchyChanges).length > 0 && (
            <Button onClick={handleSaveHierarchyChanges} isLoading={isSavingHierarchy} variant="primary" leftIcon={<CheckCircleIcon className="h-5 w-5"/>}>
            Сохранить изменения ({Object.keys(pendingHierarchyChanges).length})
            </Button>
        )}
      </div>

      {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 text-center p-4">{error}</p>}
      {saveHierarchySuccess && <p className="text-emerald-500 text-center p-2 bg-emerald-500/10 rounded-md">Изменения в иерархии успешно сохранены!</p>}

      {!isLoading && !error && (
        <Card>
          <div className="mb-2 p-3 bg-brand-surface rounded-t-md flex items-center justify-between text-xs font-medium text-brand-text-muted">
            <span className="flex-1 min-w-0">Сотрудник (клик для профиля)</span>
            <span className="ml-4 flex-1 min-w-0 text-left">Функциональные роли</span>
            <span className="ml-4 w-48 flex-shrink-0 text-left">Руководитель</span>
            <span className="w-6 flex-shrink-0"></span> {/* Spacer for profile button icon */}
          </div>
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar-thin">
             {users.length > 0 ? buildHierarchy(users.filter(u => u.status !== 'fired'), null, 0) : <p className="p-4 text-center text-brand-text-muted">Пользователи не найдены.</p>}
          </div>
        </Card>
      )}

       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
};

export default HierarchyPage;