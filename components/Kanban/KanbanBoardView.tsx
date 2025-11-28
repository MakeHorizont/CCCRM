import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragCancelEvent, DragOverlay } from '@dnd-kit/core';
import { useAuth } from '../../hooks/useAuth';
import { KanbanBoard, KanbanTask, KanbanTaskStatus, User, TaskStage } from '../../types';
import { apiService } from '../../services/apiService';
import KanbanColumn from './KanbanColumn';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { PlusCircleIcon, Cog6ToothIcon, ArrowLeftIcon } from '../UI/Icons';
import { KanbanTaskCard } from './KanbanTaskCard';
import { ROUTE_PATHS } from '../../constants';
import { useView } from '../../hooks/useView';

const KanbanBoardView: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { user: currentUser } = useAuth();
  const { isMobileView } = useView();
  const navigate = useNavigate();

  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeDraggedTask, setActiveDraggedTask] = useState<KanbanTask | null>(null);
  const [draggedItemWidth, setDraggedItemWidth] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchBoardData = useCallback(async () => {
    if (!boardId || !currentUser) {
      setError("ID доски или пользователь не определены.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [boardData, tasksData, assignableUsersList] = await Promise.all([
        apiService.getKanbanBoardById(boardId),
        apiService.getKanbanTasks({ boardId, viewMode: 'active' }), // Only active tasks for a board view
        apiService.getUsersForAssignee(currentUser.id)
      ]);

      if (!boardData) {
        setError("Доска не найдена.");
        setBoard(null); setTasks([]);
      } else {
         const hasAccess = boardData.ownerId === currentUser.id ||
                          currentUser.role === 'ceo' ||
                          boardData.accessRules.length === 0 ||
                          boardData.accessRules.some(rule => 
                            (rule.entityType === 'user' && rule.entityId === currentUser.id) ||
                            (rule.entityType === 'role' && (currentUser.functionalRoles || []).includes(rule.entityId))
                          );
        if (!hasAccess) {
            setError("У вас нет доступа к этой доске.");
            setBoard(null); setTasks([]);
        } else {
            setBoard(boardData);
            setTasks(tasksData.filter(t => !t.isArchived)); // Ensure only active tasks for this board
        }
      }
      setUsersForAssigning(assignableUsersList);
    } catch (err) {
      setError('Не удалось загрузить данные доски.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [boardId, currentUser]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  const handleTaskStageChange = async (taskId: string, newStage: TaskStage | null) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (taskToUpdate && taskToUpdate.status === KanbanTaskStatus.IN_PROGRESS) {
      try {
        const updatedTaskFromApi = await apiService.updateKanbanTask({ id: taskId, activeTaskStage: newStage });
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTaskFromApi : t));
      } catch (err) {
        setError((err as Error).message || "Ошибка обновления этапа задачи.");
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      setActiveDraggedTask(task);
      if (active.rect.current.initial) {
        setDraggedItemWidth(active.rect.current.initial.width);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDraggedTask(null);
    setDraggedItemWidth(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const taskBeingDragged = activeDraggedTask;

    setActiveDraggedTask(null);
    setDraggedItemWidth(null);

    if (!active || !over || !taskBeingDragged || !boardId) return;

    const taskId = active.id as string;
    const sourceColumnStatus = taskBeingDragged.status;
    const targetContainerId = over.data.current?.sortable?.containerId || over.id as string;

    if (!targetContainerId || !targetContainerId.startsWith(`board-${boardId}-`)) {
        console.warn("Task dropped on an invalid target or outside current board columns. Target:", targetContainerId);
        return;
    }

    const targetStatus = targetContainerId.split('-').pop() as KanbanTaskStatus;

    if (sourceColumnStatus !== targetStatus) {
      const originalTasks = [...tasks];
      setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status: targetStatus, updatedAt: new Date().toISOString() } : t));

      let payload: Partial<KanbanTask> & {id:string} = { id: taskId, status: targetStatus };
      if (targetStatus === KanbanTaskStatus.DONE) {
          payload.movedToDoneAt = new Date().toISOString();
      }
      if (targetStatus === KanbanTaskStatus.IN_PROGRESS && taskBeingDragged.status !== KanbanTaskStatus.IN_PROGRESS) {
          payload.activeTaskStage = null; 
      } else if (targetStatus !== KanbanTaskStatus.IN_PROGRESS) {
          payload.activeTaskStage = null; 
      }

      try {
        await apiService.updateKanbanTask(payload);
      } catch (apiError) {
        console.error("Failed to update task status on backend:", apiError);
        setError((apiError as Error).message || "Failed to move task.");
        setTasks(originalTasks); // Revert optimistic update
      }
    }
  };

  const canEditThisBoard = board && currentUser && (board.ownerId === currentUser.id || currentUser.role === 'ceo' || currentUser.role === 'manager');

  const columnsDef: { title: string; status: KanbanTaskStatus }[] = [
    { title: 'К выполнению', status: KanbanTaskStatus.TODO },
    { title: 'В процессе', status: KanbanTaskStatus.IN_PROGRESS },
    { title: 'Готово', status: KanbanTaskStatus.DONE },
  ];

  if (isLoading) return <div className="flex-grow flex justify-center items-center h-full p-8"><LoadingSpinner /></div>;
  if (error || !board) return <div className="text-red-500 text-center p-8 flex-grow flex justify-center items-center">{error || "Доска не найдена."}</div>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} collisionDetection={closestCenter}>
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
                 <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_HOME)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="hidden sm:flex">
                    Ко всем доскам
                </Button>
                 <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_HOME)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="sm:hidden">
                    К списку досок
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-brand-text-primary">{board.name}</h1>
                    {board.description && <p className="text-sm text-brand-text-muted mt-1">{board.description}</p>}
                </div>
            </div>
            <div className="flex space-x-2 mt-2 sm:mt-0">
                {canEditThisBoard && (
                <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_MANAGE_BOARDS)} variant="secondary" size="sm" leftIcon={<Cog6ToothIcon className="h-4 w-4"/>}>
                    Настройки доски
                </Button>
                )}
                <Button onClick={() => navigate(`${ROUTE_PATHS.KANBAN_TASK_DETAIL}/new?boardId=${boardId}`)} leftIcon={<PlusCircleIcon className="h-5 w-5"/>} size="sm">
                Добавить задачу
                </Button>
            </div>
        </div>


        <div className="flex-grow min-h-[calc(100vh-280px-12rem)] md:min-h-[300px] overflow-hidden">
          <div className="flex gap-6 overflow-x-auto pb-4 h-full custom-scrollbar">
            {columnsDef.map((column) => (
              <KanbanColumn
                key={`board-${boardId}-${column.status}`}
                id={`board-${boardId}-${column.status}`}
                title={column.title}
                status={column.status}
                tasks={tasks.filter(task => task.status === column.status).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
                onTaskStageChange={handleTaskStageChange}
                isArchiveColumn={false}
                users={usersForAssigning}
              />
            ))}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDraggedTask ? (
          <div style={{ width: draggedItemWidth ? `${draggedItemWidth}px` : 'auto' }}>
            <KanbanTaskCard task={activeDraggedTask} users={usersForAssigning} isOverlay onTaskStageChange={handleTaskStageChange} />
          </div>
        ) : null}
      </DragOverlay>
       <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </DndContext>
  );
};

export default KanbanBoardView;