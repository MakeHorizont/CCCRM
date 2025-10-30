import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KanbanBoard } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ViewColumnsIcon, UserCircleIcon, Cog6ToothIcon, PlusCircleIcon, ArchiveBoxIcon } from '../UI/Icons';
import { ROUTE_PATHS } from '../../constants';

const KanbanBoardsListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccessibleBoards = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Assuming getKanbanBoards filters by user access or fetches all if admin
      const accessibleBoards = await apiService.getKanbanBoards(user.id, user.functionalRoles || []);
      setBoards(accessibleBoards.filter(b => !b.isArchived)); // Only show active boards on this list page
    } catch (err) {
      setError('Не удалось загрузить список досок Kanban.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccessibleBoards();
  }, [fetchAccessibleBoards]);

  const canManageBoards = user?.role === 'ceo' || user?.role === 'manager';

  if (isLoading) {
    return <div className="flex justify-center items-center h-full p-8"><LoadingSpinner /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
          <ViewColumnsIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Доски Kanban
        </h1>
        {canManageBoards && (
          <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_MANAGE_BOARDS)} leftIcon={<Cog6ToothIcon className="h-5 w-5" />}>
            Управление досками
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-sky-500/30 transition-shadow transform hover:scale-105">
          <Link to={ROUTE_PATHS.KANBAN_MY_TASKS} className="block p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center mb-2">
                <UserCircleIcon className="h-7 w-7 mr-3 text-sky-400" />
                <h2 className="text-xl font-semibold text-brand-text-primary">Мои Задачи</h2>
              </div>
              <p className="text-sm text-brand-text-secondary">Все задачи, назначенные вам, со всех доступных досок.</p>
            </div>
          </Link>
        </Card>

        {boards.map(board => (
          <Card key={board.id} className="hover:shadow-indigo-500/30 transition-shadow transform hover:scale-105">
            <Link to={`${ROUTE_PATHS.KANBAN_BOARD}/${board.id}`} className="block p-4 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <ViewColumnsIcon className="h-7 w-7 mr-3 text-indigo-400" />
                  <h2 className="text-xl font-semibold text-brand-text-primary truncate" title={board.name}>{board.name}</h2>
                </div>
                <p className="text-sm text-brand-text-secondary truncate h-10 overflow-hidden" style={{WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical'}}>
                    {board.description || 'Нет описания.'}
                </p>
              </div>
              <p className="text-xs text-brand-text-muted mt-2">Создана: {new Date(board.createdAt).toLocaleDateString()}</p>
            </Link>
          </Card>
        ))}

        {boards.length === 0 && !canManageBoards && (
             <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-brand-text-muted">
                    <ArchiveBoxIcon className="h-10 w-10 mb-2"/>
                    <span className="text-lg font-medium">Нет доступных досок</span>
                    <p className="text-sm">Обратитесь к администратору для получения доступа или создания новых досок.</p>
                </div>
            </Card>
        )}

        {canManageBoards && (
            <Card className="border-2 border-dashed border-brand-border hover:border-sky-500 transition-colors transform hover:scale-105">
                <button
                    onClick={() => navigate(ROUTE_PATHS.KANBAN_MANAGE_BOARDS)}
                    className="w-full h-full flex flex-col items-center justify-center p-6 text-brand-text-muted hover:text-sky-400"
                    aria-label="Создать новую доску или управлять существующими"
                >
                    <PlusCircleIcon className="h-10 w-10 mb-2"/>
                    <span className="text-lg font-medium">Создать / Управлять</span>
                    <p className="text-sm">{boards.length > 0 ? "Создать еще одну доску или управлять" : "Создать первую доску"}</p>
                </button>
            </Card>
        )}
      </div>
    </div>
  );
};

export default KanbanBoardsListPage;