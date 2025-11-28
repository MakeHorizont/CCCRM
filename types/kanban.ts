// types/kanban.ts
import { User } from './user';
import { FileAttachment } from './common';

export enum KanbanTaskStatus {
  TODO = 'К выполнению',
  IN_PROGRESS = 'В процессе',
  DONE = 'Готово',
}

export interface KanbanSubTask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskStage = 'Потенциал' | 'Противоречия' | 'Решение';
export type TaskDifficulty = 'low' | 'medium' | 'high';

export interface StageEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  text: string;
  attachments?: FileAttachment[];
}

export interface KanbanChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface KanbanBoardAccessRule {
  entityId: string;
  entityType: 'user' | 'role';
}

export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  accessRules: KanbanBoardAccessRule[];
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: KanbanTaskStatus;
  assigneeId?: string | null;
  assignee?: User | null;
  dueDate?: string;
  isArchived: boolean;
  archivedStatus?: KanbanTaskStatus;
  archivedAt?: string;
  strategicSubTaskId?: string;
  priority?: '1' | '2' | '3' | null;
  createdAt: string;
  updatedAt: string;
  movedToDoneAt?: string;
  progress?: number;
  subTasks: KanbanSubTask[];
  activeTaskStage?: TaskStage | null;
  taskStagePotentialHistory: StageEntry[];
  taskStageContradictionsHistory: StageEntry[];
  taskStageSolutionHistory: StageEntry[];
  complexity?: TaskDifficulty;
  selfAssigned?: boolean;
  coefficient?: number;
  showInMyTasks: boolean;
  checklist: KanbanChecklistItem[];
  boardIds: string[];
}
