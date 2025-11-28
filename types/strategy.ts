// types/strategy.ts
import { User } from './user';
import { KanbanTaskStatus } from './kanban';

export interface StrategicSubTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  assigneeId?: string | null;
  assignee?: User | null;
  progress?: number;
  kanbanTaskId?: string | null;
  kanbanTaskStatus?: KanbanTaskStatus;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  subTasks: StrategicSubTask[];
  order?: number;
  newIndexInParent?: number;
}

export type SortableStrategicSubTaskKeys = 'title' | 'dueDate' | 'completed' | 'progress' | 'subTaskCount';

export interface StrategicPlan {
  id:string;
  title: string;
  description: string;
  status: 'Планируется' | 'Активен' | 'Завершен' | 'На удержании';
  owner: string;
  timeline: string;
  subTasks: StrategicSubTask[];
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
