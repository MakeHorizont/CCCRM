import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragCancelEvent, DragOverlay } from '@dnd-kit/core';
import { useAuth } from '../../hooks/useAuth';
import { KanbanTask, KanbanTaskStatus, User, TaskStage, KanbanBoard } from '../../types';
import { apiService } from '../../services/apiService';
import KanbanColumn from './KanbanColumn';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { EyeIcon, EyeSlashIcon, ListBulletIcon, ViewColumnsIcon, ArrowLeftIcon } from '../UI/Icons';
import { KanbanTaskCard } from './KanbanTaskCard';
import { ROUTE_PATHS, PRIORITY_ICON_MAP } from '../../constants';
import Tooltip from '../UI/Tooltip';
import Card from '../UI/Card';

type ViewMode = 'list' | 'board';
type ListFilter = 'overdue' | 'today' | 'upcoming' | 'no_date';

const KANBAN_STATUS_STYLES: Record<KanbanTaskStatus, string> = {
    [KanbanTaskStatus.TODO]: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
    [KanbanTaskStatus.IN_PROGRESS]: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    [KanbanTaskStatus.DONE]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
};

// Sub-component for rendering a task in the list view
const TaskListItem: React.FC<{ task: KanbanTask; getBoardName: (boardId: string) => string }> = ({ task, getBoardName }) => {
    const priorityInfo = task.priority ? PRIORITY_ICON_MAP[task.priority] : null;
    const IconComponent = priorityInfo?.icon;

    return (
        <Link to={`${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${task.id}`} className="block p-3 bg-brand-surface hover:bg-brand-secondary rounded-md border border-brand-border transition-colors">
            <div className="flex justify-between items-start">
                <p className="font-medium text-brand-text-primary flex-grow pr-4">{task.title}</p>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    {priorityInfo && IconComponent && <IconComponent className={`h-4 w-4 ${priorityInfo.color}`} />}
                    <span className={`px-2 py-0.5 text-[10px] rounded-full ${KANBAN_STATUS_STYLES[task.status]}`}>
                        {task.status}
                    </span>
                </div>
            </div>
            <div className="text-xs text-brand-text-muted mt-1 flex justify-between">
                <span>
                    {task.boardIds.map(id => getBoardName(id)).join(', ')}
                </span>
                {task.dueDate && <span>Срок: {new Date(task.dueDate).toLocaleDateString()}</span>}
            </div>
        </Link>
    );
};


const MyTasksPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [myActiveTasks, setMyActiveTasks] = useState<KanbanTask[]>([]);
  const [myArchivedTasks, setMyArchivedTasks] = useState<KanbanTask[]>([]);
  const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchiveBoard, setShowArchiveBoard] = useState(false);
  const [activeDraggedTask, setActiveDraggedTask] = useState<KanbanTask | null>(null);
  const [draggedItemWidth, setDraggedItemWidth] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [listFilter, setListFilter] = useState<ListFilter>('today');
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchMyTasksData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      setError("Пользователь не авторизован.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [boardsData, allUserTasks, assignableUsersList] = await Promise.all([
          apiService.getKanbanBoards(currentUser.id, currentUser.functionalRoles || []),
          apiService.getKanbanTasks({
              assigneeId: currentUser.id,
              showInMyTasks: true,
              viewMode: 'all',
          }),
          apiService.getUsersForAssignee(currentUser.id)
      ]);
      
      const active = allUserTasks.filter(task => !task.isArchived);
      const archived = allUserTasks.filter(task => task.isArchived);

      setBoards(boardsData);
      setMyActiveTasks(active);
      setMyArchivedTasks(archived);
      setUsersForAssigning(assignableUsersList);

    } catch (err) {
      setError('Не удалось загрузить ваши задачи.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyTasksData();
  }, [fetchMyTasksData]);

  const handleTaskStageChange = async (taskId: string, newStage: TaskStage | null) => {
    const taskToUpdate = myActiveTasks.find(t => t.id === taskId) || myArchivedTasks.find(t => t.id === taskId);
    if (taskToUpdate && taskToUpdate.status === KanbanTaskStatus.IN_PROGRESS && !taskToUpdate.isArchived) {
      try {
        const updatedTaskFromApi = await apiService.updateKanbanTask({ id: taskId, activeTaskStage: newStage });
        if (!updatedTaskFromApi.isArchived && updatedTaskFromApi.showInMyTasks) {
            setMyActiveTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTaskFromApi : t));
        } else if (updatedTaskFromApi.isArchived && updatedTaskFromApi.showInMyTasks) {
            setMyArchivedTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTaskFromApi : t));
        } else {
            fetchMyTasksData();
        }
      } catch (err) {
        setError((err as Error).message || "Ошибка обновления этапа задачи.");
      }
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = [...myActiveTasks, ...myArchivedTasks].find(t => t.id === active.id);
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

    if (!active || !over || !taskBeingDragged) {
        setActiveDraggedTask(null);
        setDraggedItemWidth(null);
        return;
    }

    const taskId = active.id as string;
    const sourceContainerId = active.data.current?.sortable?.containerId as string;
    const targetContainerId = over.data.current?.sortable?.containerId || over.id as string;

    if (!targetContainerId || (!targetContainerId.startsWith('my-active-') && !targetContainerId.startsWith('my-archive-'))) {
        setActiveDraggedTask(null);
        setDraggedItemWidth(null);
        console.warn("Task dropped on an invalid target or outside columns for 'My Tasks'. No action taken.", targetContainerId);
        return;
    }

    setActiveDraggedTask(null);
    setDraggedItemWidth(null);

    const isTargetActiveBoard = targetContainerId.startsWith('my-active-');
    const targetStatusColumn = targetContainerId.split('-').pop() as KanbanTaskStatus;

    if (sourceContainerId === targetContainerId && active.id === over.id) {
        return;
    }
    if (sourceContainerId === targetContainerId) {
        return;
    }

    if (taskBeingDragged.status !== targetStatusColumn || taskBeingDragged.isArchived === isTargetActiveBoard) { 
        const originalStateBackup = { activeTasks: [...myActiveTasks], archivedTasks: [...myArchivedTasks] };

        let updatedTaskPayload: Partial<KanbanTask> & { id: string } = {
            id: taskId,
            showInMyTasks: true, 
        };

        if (targetStatusColumn === KanbanTaskStatus.DONE) {
            updatedTaskPayload.movedToDoneAt = new Date().toISOString();
        }

        if (isTargetActiveBoard) {
            updatedTaskPayload.isArchived = false;
            updatedTaskPayload.status = targetStatusColumn;
             updatedTaskPayload.activeTaskStage = (targetStatusColumn === KanbanTaskStatus.IN_PROGRESS && taskBeingDragged.status !== KanbanTaskStatus.IN_PROGRESS)
                                    ? null
                                    : (targetStatusColumn === KanbanTaskStatus.IN_PROGRESS)
                                        ? taskBeingDragged.activeTaskStage
                                        : null;
            if (taskBeingDragged.isArchived) {
                 updatedTaskPayload.archivedStatus = undefined;
            }
        } else { // Target is archive board
            updatedTaskPayload.isArchived = true;
            updatedTaskPayload.archivedStatus = targetStatusColumn;
            updatedTaskPayload.status = taskBeingDragged.status;
            updatedTaskPayload.activeTaskStage = null;
        }

        const optimisticallyUpdatedTask = { ...taskBeingDragged, ...updatedTaskPayload, updatedAt: new Date().toISOString() };

        let nextActiveTasks = myActiveTasks.filter(t => t.id !== taskId);
        let nextArchivedTasks = myArchivedTasks.filter(t => t.id !== taskId);

        if (isTargetActiveBoard) {
            nextActiveTasks.push(optimisticallyUpdatedTask);
        } else {
            nextArchivedTasks.push(optimisticallyUpdatedTask);
        }

        setMyActiveTasks(nextActiveTasks.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setMyArchivedTasks(nextArchivedTasks.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));

        try {
            await apiService.updateKanbanTask(updatedTaskPayload);
            fetchMyTasksData(); 
        } catch (apiError) {
            console.error("Failed to update task on backend:", apiError);
            setError((apiError as Error).message || "Failed to move task.");
            setMyActiveTasks(originalStateBackup.activeTasks);
            setMyArchivedTasks(originalStateBackup.archivedTasks);
        }
    }
  };

  const columns: { title: string; status: KanbanTaskStatus }[] = [
    { title: 'К выполнению', status: KanbanTaskStatus.TODO },
    { title: 'В процессе', status: KanbanTaskStatus.IN_PROGRESS },
    { title: 'Готово', status: KanbanTaskStatus.DONE },
  ];

  const getBoardName = useCallback((boardId: string) => {
      return boards.find(b => b.id === boardId)?.name || boardId;
  }, [boards]);

  const filteredListTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayString = today.toISOString().split('T')[0];
    
    const tasks = myActiveTasks.filter(t => t.status !== KanbanTaskStatus.DONE);

    switch (listFilter) {
        case 'overdue':
            return tasks.filter(t => t.dueDate && t.dueDate < todayString);
        case 'today':
            return tasks.filter(t => t.dueDate === todayString);
        case 'upcoming':
            return tasks.filter(t => t.dueDate && t.dueDate > todayString);
        case 'no_date':
            return tasks.filter(t => !t.dueDate);
        default:
            return tasks;
    }
  }, [myActiveTasks, listFilter]);


  const listFilters: { id: ListFilter; label: string }[] = [
    { id: 'overdue', label: 'Просроченные' },
    { id: 'today', label: 'Сегодня' },
    { id: 'upcoming', label: 'Предстоящие' },
    { id: 'no_date', label: 'Без срока' },
  ];

  const renderListView = () => (
    <div className="flex-grow">
        <div className="border-b border-brand-border mb-4">
            <div className="flex space-x-2">
                {listFilters.map(filter => (
                    <Button
                        key={filter.id}
                        variant={listFilter === filter.id ? 'secondary' : 'ghost'}
                        onClick={() => setListFilter(filter.id)}
                        className={`py-2 px-3 text-sm ${listFilter === filter.id ? 'font-semibold' : ''}`}
                    >
                        {filter.label}
                    </Button>
                ))}
            </div>
        </div>
        <div className="space-y-3">
            {filteredListTasks.length > 0 ? (
                filteredListTasks.map(task => (
                    <TaskListItem key={task.id} task={task} getBoardName={getBoardName} />
                ))
            ) : (
                <Card className="text-center p-6 text-brand-text-muted">
                    <p>Задач в этой категории нет.</p>
                </Card>
            )}
        </div>
    </div>
  );

  const renderBoardView = () => (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} collisionDetection={closestCenter}>
        <div className="flex-grow min-h-[calc(100vh-250px-10rem)] md:min-h-[300px] overflow-hidden">
          <div className="flex gap-6 overflow-x-auto pb-4 h-full custom-scrollbar">
            {columns.map((column) => (
              <KanbanColumn
                key={`my-active-${column.status}`}
                id={`my-active-${column.status}`}
                title={column.title}
                status={column.status}
                tasks={myActiveTasks.filter(task => task.status === column.status).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
                onTaskStageChange={handleTaskStageChange}
                isArchiveColumn={false}
                users={usersForAssigning}
              />
            ))}
          </div>
        </div>
        {showArchiveBoard && (
          <div className="mt-8 pt-4 border-t border-brand-border">
            <h2 className="text-2xl font-semibold text-brand-text-primary mb-4">Архив моих задач</h2>
            <div className="h-[250px] overflow-hidden bg-brand-surface rounded-lg">
              <div className="flex gap-6 overflow-x-auto pb-4 h-full custom-scrollbar">
                {columns.map((column) => (
                  <KanbanColumn
                    key={`my-archive-${column.status}`}
                    id={`my-archive-${column.status}`}
                    title={`${column.title} (Архив)`}
                    status={column.status}
                    tasks={myArchivedTasks.filter(task => task.archivedStatus === column.status).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())}
                    onTaskStageChange={handleTaskStageChange}
                    isArchiveColumn={true}
                    users={usersForAssigning}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <DragOverlay dropAnimation={null}>
            {activeDraggedTask ? (
                 <div style={{ width: draggedItemWidth ? `${draggedItemWidth}px` : 'auto' }}>
                    <KanbanTaskCard
                        task={activeDraggedTask}
                        users={usersForAssigning}
                        isOverlay
                        onTaskStageChange={handleTaskStageChange}
                    />
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );

  return (
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
                 <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_HOME)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>} className="hidden sm:flex">
                    К списку досок
                </Button>
                <h1 className="text-3xl font-semibold text-brand-text-primary mb-2 sm:mb-0">Мои задачи Kanban</h1>
            </div>
            <div className="flex space-x-2">
                 <div className="p-1 bg-brand-surface rounded-lg flex">
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} leftIcon={<ListBulletIcon className="h-4 w-4"/>}>Список</Button>
                    <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('board')} leftIcon={<ViewColumnsIcon className="h-4 w-4"/>}>Доска</Button>
                 </div>
                <Button onClick={() => setShowArchiveBoard(!showArchiveBoard)} variant="secondary" leftIcon={showArchiveBoard ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}>
                    {showArchiveBoard ? 'Скрыть архив' : 'Показать архив'}
                </Button>
            </div>
        </div>

        {isLoading && <div className="flex-grow flex items-center justify-center p-8"><LoadingSpinner /></div>}
        {error && <p className="text-red-500 text-center p-4 flex-grow flex justify-center items-center">{error}</p>}

        {!isLoading && !error && currentUser && (viewMode === 'list' ? renderListView() : renderBoardView())}
        
        {!isLoading && !currentUser && <p className="text-brand-text-muted text-center flex-grow flex justify-center items-center">Пожалуйста, войдите, чтобы увидеть ваши задачи.</p>}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
};

export default MyTasksPage;