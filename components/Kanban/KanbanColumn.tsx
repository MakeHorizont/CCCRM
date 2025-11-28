import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { KanbanTask, KanbanTaskStatus, User, TaskStage } from '../../types'; // Renamed DialecticStage to TaskStage
import { KanbanTaskCard } from './KanbanTaskCard';
import { KANBAN_COLUMN_COLORS } from '../../constants';

interface KanbanColumnProps {
  id: string; // Unique ID for the droppable column, e.g., "active-TODO" or "archive-IN_PROGRESS"
  title: string;
  status: KanbanTaskStatus;
  tasks: KanbanTask[];
  onTaskStageChange: (taskId: string, newStage: TaskStage | null) => void; // Renamed from onDialecticStageChange, newStage can be null
  isArchiveColumn: boolean;
  users: User[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, status, tasks, onTaskStageChange, isArchiveColumn, users }) => {
  const columnColor = KANBAN_COLUMN_COLORS[status] || 'border-t-zinc-300';

  const { setNodeRef, isOver } = useDroppable({ id });

  const droppableStyle: React.CSSProperties = {
    backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined, // Subtle blue highlight
    minWidth: '320px', 
    maxWidth: '380px', 
    width: '100%', 
    minHeight: '200px', 
  };

  return (
    <div
      ref={setNodeRef}
      style={droppableStyle}
      id={id}
      className={`bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 flex flex-col h-full border-t-4 ${columnColor} flex-shrink-0`} 
    >
      <h2 className="text-lg font-semibold text-brand-text-primary mb-4 px-1">{title} ({tasks.length})</h2>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 overflow-y-auto flex-grow pr-1 custom-scrollbar-column-tasks"> 
          {tasks.length === 0 && (
            <p className="text-sm text-brand-text-muted text-center py-4">Нет задач в этой колонке.</p>
          )}
          {tasks.map((task, index) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              index={index}
              onTaskStageChange={onTaskStageChange} // Renamed
              users={users}
            />
          ))}
        </div>
      </SortableContext>
       <style>{`
        .custom-scrollbar-column-tasks::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-column-tasks::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-column-tasks::-webkit-scrollbar-thumb {
          background: #d4d4d8;
        }
        .dark .custom-scrollbar-column-tasks::-webkit-scrollbar-thumb {
          background: #52525b;
        }
        .custom-scrollbar-column-tasks::-webkit-scrollbar-thumb:hover {
          background: #a1a1aa;
        }
         .dark .custom-scrollbar-column-tasks::-webkit-scrollbar-thumb:hover {
          background: #71717a;
        }
      `}</style>
    </div>
  );
};

export default KanbanColumn;