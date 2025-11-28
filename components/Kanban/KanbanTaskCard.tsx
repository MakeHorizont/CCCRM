
import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

import { KanbanTask, User, KanbanTaskStatus, TaskStage, TaskDifficulty, KanbanChecklistItem } from '../../types'; 
import { UserCircleIcon, CalendarDaysIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, FireIcon, StarIcon, SparklesIcon, CheckCircleIcon, EyeIcon, XCircleIcon as ClearStageIcon, BeakerIcon, InformationCircleIcon, BookmarkIcon, ListBulletIcon, FlagIcon } from '../UI/Icons'; // Added FlagIcon
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import { PRIORITY_ICON_MAP, getAssigneeColor, TASK_STAGES_ORDER, TASK_STAGE_COMPLETED_ICON, ROUTE_PATHS, TASK_COMPLEXITY_OPTIONS, calculateTaskCoefficient } from '../../constants'; 


interface KanbanTaskCardProps {
  task: KanbanTask;
  index?: number; 
  onTaskStageChange?: (taskId: string, newStage: TaskStage | null) => void; 
  users: User[];
  isOverlay?: boolean; 
}

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({ task, index, onTaskStageChange, users, isOverlay }) => {
  const navigate = useNavigate();
  const assignee = users.find(u => u.id === task.assigneeId);
  const assigneeColor = getAssigneeColor(assignee?.id);
  const taskCoefficient = task.coefficient || calculateTaskCoefficient(task);
  const complexityLabel = TASK_COMPLEXITY_OPTIONS.find(c => c.value === (task.complexity || 'medium'))?.label || 'Средняя';

  const checklistProgress = useMemo(() => {
    if (!task.checklist || task.checklist.length === 0) return null;
    const completedItems = task.checklist.filter(item => item.completed).length;
    return { completed: completedItems, total: task.checklist.length };
  }, [task.checklist]);


  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !!isOverlay, resizeObserverConfig: { disabled: true } });

  const styleFromSortable: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0 : 1, 
    cursor: 'grab',
  };
  
  const overlayStyle: React.CSSProperties = { 
    cursor: 'grabbing',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  };

  const handleOpenTaskDetail = () => {
    if (!isOverlay) { 
      navigate(`${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${task.id}`);
    }
  };


  const PriorityDisplay: React.FC<{priority: KanbanTask['priority']}> = React.memo(({ priority }) => {
    if (!priority) return null;
    const priorityInfo = PRIORITY_ICON_MAP[priority as '1'|'2'|'3'];
    const IconComponent = priorityInfo.icon;
    return (
      <IconComponent className={`h-4 w-4 ${priorityInfo.color}`} />
    );
  });

  const handleStageButtonClick = (stage: TaskStage | null, e: React.MouseEvent) => { 
    e.stopPropagation(); 
    if (onTaskStageChange && !task.isArchived) {
      onTaskStageChange(task.id, stage);
    }
  };

  const currentStageIndex = task.activeTaskStage ? TASK_STAGES_ORDER.indexOf(task.activeTaskStage) : -1;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? overlayStyle : styleFromSortable}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      id={task.id}
      className="bg-brand-surface p-3 rounded-lg border border-brand-border hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group relative touch-manipulation cursor-pointer"
      onClick={handleOpenTaskDetail}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-md font-semibold text-brand-text-primary break-words pr-8">{task.title}</h3>
        {task.strategicSubTaskId && (
            <Tooltip text="Часть Стратегического Плана">
                <FlagIcon className="h-4 w-4 text-purple-500 absolute top-3 right-3" />
            </Tooltip>
        )}
      </div>
      <p className="text-sm text-brand-text-secondary mb-3 break-words max-h-24 overflow-y-auto custom-scrollbar-task-desc">{task.description}</p>
       
      {task.status === KanbanTaskStatus.IN_PROGRESS && !task.isArchived && onTaskStageChange && (
        <div className="my-2 space-y-1">
          <div className="text-xs text-brand-text-muted mb-1 flex justify-between items-center">
            <span>Этапы задачи:</span>
            {task.activeTaskStage && (
                <Tooltip text="Сбросить текущий этап">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => handleStageButtonClick(null, e)} 
                        className="p-0.5 text-xs text-brand-text-muted hover:text-red-500"
                        aria-label="Сбросить этап"
                    >
                        <ClearStageIcon className="h-3.5 w-3.5"/>
                    </Button>
                </Tooltip>
            )}
          </div>
          <div className="flex space-x-1">
            {TASK_STAGES_ORDER.map((stage, index) => {
              const isActive = stage === task.activeTaskStage; 
              const isCompleted = currentStageIndex > -1 && index < currentStageIndex;
              
              let buttonClasses = "text-xs px-1.5 py-0.5 rounded-md flex-1 text-center transition-all duration-150 ease-in-out flex items-center justify-center space-x-1 ";
              if (isActive) {
                buttonClasses += "bg-sky-500 text-white shadow-sm ring-1 ring-sky-300";
              } else if (isCompleted) {
                buttonClasses += "bg-emerald-500 text-white opacity-90 hover:opacity-100";
              } else {
                buttonClasses += "bg-zinc-100 text-brand-text-secondary border border-brand-border dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-300 dark:hover:border-sky-500";
              }

              return (
                <Button
                  key={stage}
                  type="button"
                  onClick={(e) => handleStageButtonClick(stage, e)}
                  className={buttonClasses}
                  size="sm"
                  variant="ghost" 
                  disabled={task.isArchived}
                  aria-pressed={isActive}
                >
                  {isCompleted && <TASK_STAGE_COMPLETED_ICON className="h-3 w-3 text-white" />} 
                  <span>{stage}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {(task.progress !== undefined && task.progress > 0 && task.progress < 100 && task.status !== KanbanTaskStatus.DONE) && (
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1 my-1">
            <div className="bg-sky-500 h-1 rounded-full" style={{ width: `${task.progress}%` }}></div>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-brand-text-muted mt-2">
        <div className="flex items-center space-x-1.5">
          {task.dueDate && (
            <Tooltip text={`Срок: ${new Date(task.dueDate).toLocaleDateString('ru-RU')}`}>
              <span className="inline-flex items-center"><CalendarDaysIcon className="h-4 w-4" /></span>
            </Tooltip>
          )}
          {assignee && (
            <Tooltip text={`Исп: ${assignee.name || assignee.email}`}>
              <div className={`w-5 h-5 rounded-full ${assigneeColor} flex items-center justify-center text-white text-[10px] font-semibold`}>
                {assignee.name ? assignee.name.substring(0,1).toUpperCase() : assignee.email.substring(0,1).toUpperCase()}
              </div>
            </Tooltip>
          )}
          {!assignee && task.assigneeId && (
             <Tooltip text={`Исп: ID ${task.assigneeId}`}>
                <div className={`w-5 h-5 rounded-full bg-zinc-400 flex items-center justify-center text-white text-[10px] font-semibold`}>?</div>
            </Tooltip>
          )}
          {!assignee && !task.assigneeId && (
            <Tooltip text="Не назначен">
              <span className="inline-flex items-center"><UserCircleIcon className="h-4 w-4 text-brand-text-muted opacity-70" /></span>
            </Tooltip>
          )}
           {task.selfAssigned && (
            <Tooltip text="Задача взята самостоятельно">
              <BookmarkIcon className="h-3.5 w-3.5 text-teal-500" />
            </Tooltip>
          )}
           {checklistProgress && (
            <Tooltip text={`Чек-лист: ${checklistProgress.completed} из ${checklistProgress.total} выполнено`}>
              <span className={`inline-flex items-center ${checklistProgress.completed === checklistProgress.total && checklistProgress.total > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-brand-text-muted'}`}>
                <ListBulletIcon className="h-4 w-4" />
                <span className="ml-0.5">{checklistProgress.completed}/{checklistProgress.total}</span>
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
           <Tooltip text={`Коэфф.: ${taskCoefficient}`}>
                <span className="inline-flex items-center"><BeakerIcon className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400"/></span>
           </Tooltip>
           <Tooltip text={`Сложность: ${complexityLabel}`}>
                <span className="inline-flex items-center"><InformationCircleIcon className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400"/></span>
           </Tooltip>
           {task.priority && (
            <Tooltip text={PRIORITY_ICON_MAP[task.priority as '1'|'2'|'3'].label}>
                <span className="inline-block"><PriorityDisplay priority={task.priority} /></span>
            </Tooltip>
           )}
        </div>
      </div>
    </div>
  );
};
