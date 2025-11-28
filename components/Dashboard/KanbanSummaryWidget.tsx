
import React from 'react';
import { Link } from 'react-router-dom';
import { KanbanTaskStatus } from '../../types';
import Card from '../UI/Card';
import { ViewColumnsIcon } from '../UI/Icons';
import { ROUTE_PATHS, getAssigneeColor } from '../../constants';
import Tooltip from '../UI/Tooltip';

interface KanbanSummaryData {
  totalActiveTasks: number;
  tasksByStatus: Record<KanbanTaskStatus, number>;
  workloadByUser: { userId: string; userName: string; taskCount: number; }[];
}

interface KanbanSummaryWidgetProps {
  summary: KanbanSummaryData;
}

const KanbanSummaryWidget: React.FC<KanbanSummaryWidgetProps> = ({ summary }) => {
  const { totalActiveTasks, tasksByStatus, workloadByUser } = summary;

  const statusEntries = [
    { status: KanbanTaskStatus.TODO, label: 'К выполнению' },
    { status: KanbanTaskStatus.IN_PROGRESS, label: 'В процессе' },
    { status: KanbanTaskStatus.DONE, label: 'Готово' },
  ];

  // FIX: Cast Object.values result to number[] to satisfy Math.max.
  const maxStatusCount = Math.max(...(Object.values(tasksByStatus) as number[]), 1); // Avoid division by zero

  return (
    <Card className="flex flex-col h-full">
      <Link to={ROUTE_PATHS.KANBAN_HOME} className="block hover:text-sky-600">
        <h2 className="text-xl font-semibold text-brand-text-primary mb-4 flex items-center">
          <ViewColumnsIcon className="h-6 w-6 mr-2" />
          Сводка по Kanban
        </h2>
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
        {/* Left side: Status breakdown */}
        <div className="space-y-3">
          <p className="text-brand-text-secondary">Всего активных задач: <span className="font-bold text-brand-text-primary text-lg">{totalActiveTasks}</span></p>
          <div className="space-y-2">
            {statusEntries.map(({ status, label }) => (
              <div key={status}>
                <div className="flex justify-between items-center text-xs mb-0.5">
                  <span className="text-brand-text-secondary">{label}</span>
                  <span className="font-medium text-brand-text-primary">{tasksByStatus[status]}</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full"
                    style={{ width: `${(tasksByStatus[status] / maxStatusCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: Workload by user */}
        <div>
          <h3 className="text-md font-semibold text-brand-text-primary mb-2">Загрузка по исполнителям</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar-thin pr-2">
            {workloadByUser.length > 0 && workloadByUser.some(u => u.taskCount > 0) ? (
              workloadByUser.filter(u => u.taskCount > 0).map(user => (
                <div key={user.userId} className="flex items-center justify-between text-sm hover:bg-zinc-100 p-1 rounded-md">
                   <Tooltip text={`Перейти к задачам ${user.userName}`}>
                     <Link to={`${ROUTE_PATHS.KANBAN_HOME}?assignee=${user.userId}`} className="flex items-center space-x-2 flex-grow truncate">
                          <div className={`w-6 h-6 rounded-full ${getAssigneeColor(user.userId)} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                              {user.userName.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="text-brand-text-secondary truncate">{user.userName}</span>
                     </Link>
                   </Tooltip>
                  <span className="font-semibold text-brand-text-primary flex-shrink-0 ml-2">{user.taskCount}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-brand-text-muted italic text-center py-4">Нет назначенных задач.</p>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d4d4d8;
          border-radius: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a1a1aa;
        }
      `}</style>
    </Card>
  );
};

export default KanbanSummaryWidget;