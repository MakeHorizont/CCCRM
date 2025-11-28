import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanBoard, User } from '../../types'; // Added User for allUsersForModal
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService'; 
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import KanbanBoardModal from './KanbanBoardModal';
import { PlusCircleIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, TrashIcon, ViewColumnsIcon, EyeIcon, EyeSlashIcon, Cog6ToothIcon, ArrowLeftIcon } from '../UI/Icons';
import { ROUTE_PATHS } from '../../constants';

type ViewMode = 'active' | 'archived';

const ManageKanbanBoardsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Partial<KanbanBoard> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<KanbanBoard | null>(null);
  
  const [allUsersForModal, setAllUsersForModal] = useState<User[]>([]);
  const [allFunctionalRolesForModal, setAllFunctionalRolesForModal] = useState<string[]>([]);


  const fetchPrerequisitesForPage = useCallback(async () => {
      try {
          const [users, roles] = await Promise.all([
              authService.getMockUsers(), // Assuming this gets all users
              apiService.getAvailableFunctionalRoles() // Assuming this gets all roles
          ]);
          setAllUsersForModal(users);
          setAllFunctionalRolesForModal(roles);
      } catch (err) {
          console.error("Failed to load users/roles for board management:", err);
          setError("Не удалось загрузить данные для управления досками.");
      }
  }, []);


  const fetchBoards = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Use admin view if API supports it, otherwise get all accessible boards
      const allBoardsData = await apiService.getKanbanBoards(user.id, user.functionalRoles || [], true);
      setBoards(allBoardsData.filter(b => viewMode === 'archived' ? b.isArchived : !b.isArchived));
    } catch (err) {
      setError('Не удалось загрузить доски Kanban для управления.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, viewMode]);

  useEffect(() => {
    if (!user || (user.role !== 'ceo' && user.role !== 'manager')) {
        navigate(ROUTE_PATHS.KANBAN_HOME);
        return;
    }
    fetchPrerequisitesForPage();
    fetchBoards();
  }, [fetchBoards, fetchPrerequisitesForPage, user, navigate]);

  const handleOpenModal = (board?: KanbanBoard) => {
    setEditingBoard(board ? { ...board } : { name: '', description: '', ownerId: user!.id, accessRules: [] });
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBoard(null);
  };

  const handleSaveBoard = async (boardData: Partial<KanbanBoard>) => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    try {
      if (boardData.id) {
        await apiService.updateKanbanBoard(boardData as KanbanBoard);
      } else {
        await apiService.addKanbanBoard({
            name: boardData.name!,
            description: boardData.description,
            ownerId: user.id, // Should be current user
            accessRules: boardData.accessRules || [],
            // createdAt, updatedAt, isArchived are handled by backend/apiService
        } as Omit<KanbanBoard, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt'>);
      }
      handleCloseModal();
      fetchBoards(); // Refresh list after save
    } catch (err) {
      setError((err as Error).message || 'Не удалось сохранить доску.');
      throw err; // Re-throw for modal to catch its own errors
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveToggle = async (board: KanbanBoard) => {
    setIsSaving(true);
    try {
      await apiService.archiveKanbanBoard(board.id, !board.isArchived);
      fetchBoards();
    } catch (err) {
      setError('Ошибка архивации/восстановления доски.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInitiate = (board: KanbanBoard) => {
    if (board.isArchived) { // Only allow deletion of archived boards
      setBoardToDelete(board);
      setIsDeleteConfirmOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!boardToDelete) return;
    setIsSaving(true);
    try {
      await apiService.deleteKanbanBoard(boardToDelete.id);
      setIsDeleteConfirmOpen(false);
      setBoardToDelete(null);
      fetchBoards();
    } catch (err) {
      setError((err as Error).message || 'Ошибка удаления доски.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && boards.length === 0) { // Show main loader only if no boards are displayed yet
    return <div className="flex justify-center items-center h-64 p-8"><LoadingSpinner /></div>;
  }


  return (
    <div className="space-y-6">
      <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_HOME)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="mb-0">
        К списку досок
      </Button>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
          <Cog6ToothIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Управление Досками Kanban
        </h1>
        <div className="flex space-x-3">
          <Button
            onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
            variant="secondary"
            leftIcon={viewMode === 'active' ? <EyeIcon className="h-5 w-5"/> : <EyeSlashIcon className="h-5 w-5"/>}
          >
            {viewMode === 'active' ? 'Показать архив' : 'Показать активные'}
          </Button>
          {viewMode === 'active' && (
            <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5"/>}>
              Создать Доску
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-center p-4 bg-red-500/10 rounded-md">{error}</p>}
      {isLoading && boards.length > 0 && <div className="text-center my-4"><LoadingSpinner size="sm"/> Загрузка...</div>}


      {boards.length === 0 && !isLoading && (
        <Card className="text-center p-8">
          <ViewColumnsIcon className="h-16 w-16 mx-auto mb-4 text-brand-text-muted" />
          <p className="text-brand-text-secondary">
            {viewMode === 'active' ? 'Активные доски не найдены.' : 'Архивные доски не найдены.'}
          </p>
          {viewMode === 'active' && 
            <Button onClick={() => handleOpenModal()} className="mt-4">Создать первую доску</Button>
          }
        </Card>
      )}

      {boards.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-brand-text-secondary">
              <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                <tr>
                  <th scope="col" className="px-6 py-3">Название</th>
                  <th scope="col" className="px-6 py-3">Описание</th>
                  <th scope="col" className="px-6 py-3">Владелец</th>
                  <th scope="col" className="px-6 py-3">Доступ</th>
                  <th scope="col" className="px-6 py-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {boards.map((board) => (
                  <tr key={board.id} className={`hover:bg-brand-secondary transition-colors ${board.isArchived ? 'opacity-70' : ''}`}>
                    <td className="px-6 py-4 font-medium text-brand-text-primary">{board.name}</td>
                    <td className="px-6 py-4 truncate max-w-xs" title={board.description}>{board.description || '-'}</td>
                    <td className="px-6 py-4">{allUsersForModal.find(u => u.id === board.ownerId)?.name || board.ownerId}</td>
                    <td className="px-6 py-4 text-xs">
                        {board.accessRules.length > 0 ? board.accessRules.map(r => `${r.entityType === 'user' ? 'User' : 'Role'}: ${r.entityType === 'user' ? (allUsersForModal.find(u=>u.id === r.entityId)?.name || r.entityId) : r.entityId}`).join(', ') : 'Всем'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(board)} aria-label="Редактировать">
                          <PencilSquareIcon className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchiveToggle(board)} aria-label={board.isArchived ? "Восстановить" : "Архивировать"}>
                          {board.isArchived ? <ArrowUturnLeftIcon className="h-5 w-5" /> : <ArchiveBoxArrowDownIcon className="h-5 w-5" />}
                        </Button>
                        {board.isArchived && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteInitiate(board)} aria-label="Удалить" className="text-red-500 hover:text-red-400">
                            <TrashIcon className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isModalOpen && editingBoard && user && (
        <KanbanBoardModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveBoard}
          initialBoardData={editingBoard}
          isSaving={isSaving}
          allUsers={allUsersForModal}
          allFunctionalRoles={allFunctionalRolesForModal}
        />
      )}

      {isDeleteConfirmOpen && boardToDelete && (
        <ConfirmationModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Подтверждение удаления доски"
          message={<p>Вы уверены, что хотите окончательно удалить доску <strong className="text-brand-text-primary">{boardToDelete.name}</strong>? Все задачи на этой доске также будут отвязаны от нее (но не удалены). Это действие необратимо.</p>}
          confirmText="Удалить"
          confirmButtonVariant='danger'
          isLoading={isSaving}
        />
      )}
    </div>
  );
};

export default ManageKanbanBoardsPage;