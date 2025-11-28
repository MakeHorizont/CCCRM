
// services/api/kanbanService.ts
import { KanbanBoard, KanbanTask, KanbanTaskStatus, StageEntry, FileAttachment } from '../../types';
import { mockKanbanBoards } from '../mockData/kanbanBoards';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { mockStrategicPlans } from '../mockData/strategicPlans'; 
import { MOCK_USERS } from '../mockData/users';
import { authService } from '../authService';
import { delay, deepCopy, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { findTaskRecursive } from './strategyService'; 
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getKanbanBoards = async (userId: string, functionalRoles: string[], includeArchived = false): Promise<KanbanBoard[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.get<KanbanBoard[]>('/kanban/boards', {
            userId,
            includeArchived
            // Functional roles typically handled by backend auth context
        });
    }

    await delay(200);
    let boards = deepCopy(mockKanbanBoards);
    if(!includeArchived) {
        boards = boards.filter(b => !b.isArchived);
    }
    const user = MOCK_USERS.find(u => u.id === userId);
    if(user?.role === 'ceo') return boards;

    return boards.filter(board => 
        board.accessRules.length === 0 || // Public board
        board.ownerId === userId ||
        board.accessRules.some(rule => 
            (rule.entityType === 'user' && rule.entityId === userId) ||
            (rule.entityType === 'role' && functionalRoles.includes(rule.entityId))
        )
    );
};

const getKanbanBoardById = async (boardId: string): Promise<KanbanBoard | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.get<KanbanBoard>(`/kanban/boards/${boardId}`);
    }

    await delay(100);
    const board = mockKanbanBoards.find(b => b.id === boardId);
    return board ? deepCopy(board) : null;
};

const addKanbanBoard = async (boardData: Omit<KanbanBoard, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt'>): Promise<KanbanBoard> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.post<KanbanBoard>('/kanban/boards', boardData);
    }

    await delay(400);
    const newBoard: KanbanBoard = {
        ...boardData,
        id: generateId('board'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockKanbanBoards.push(newBoard);
    return deepCopy(newBoard);
};

const updateKanbanBoard = async (boardData: KanbanBoard): Promise<KanbanBoard> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.patch<KanbanBoard>(`/kanban/boards/${boardData.id}`, boardData);
    }

    await delay(400);
    const index = mockKanbanBoards.findIndex(b => b.id === boardData.id);
    if(index === -1) throw new Error("Board not found");
    mockKanbanBoards[index] = {...mockKanbanBoards[index], ...boardData, updatedAt: new Date().toISOString()};
    return deepCopy(mockKanbanBoards[index]);
};

const archiveKanbanBoard = async (boardId: string, archive: boolean): Promise<{success: true}> => {
     if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        await apiClient.post(`/kanban/boards/${boardId}/archive`, { archive });
        return { success: true };
    }

    await delay(300);
    const index = mockKanbanBoards.findIndex(b => b.id === boardId);
    if(index === -1) throw new Error("Board not found");
    mockKanbanBoards[index].isArchived = archive;
    mockKanbanBoards[index].archivedAt = archive ? new Date().toISOString() : undefined;
    mockKanbanBoards[index].updatedAt = new Date().toISOString();
    return {success: true};
};

const deleteKanbanBoard = async (boardId: string): Promise<{success: true}> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        await apiClient.delete(`/kanban/boards/${boardId}`);
        return { success: true };
    }

    await delay(500);
    const index = mockKanbanBoards.findIndex(b => b.id === boardId);
    if(index > -1 && mockKanbanBoards[index].isArchived) {
        mockKanbanBoards.splice(index, 1);
        // Also remove this board from all tasks
        mockKanbanTasks.forEach(task => {
            task.boardIds = task.boardIds.filter(id => id !== boardId);
        });
        return {success: true};
    }
    if (index === -1) throw new Error("Board not found");
    throw new Error("Board must be archived before deletion");
};

const getKanbanTasks = async (filters: { viewMode?: 'active' | 'archived' | 'all', boardId?: string, assigneeId?: string, status?: KanbanTaskStatus[], startDate?: string, endDate?: string, showInMyTasks?: boolean, selfAssigned?: boolean }): Promise<KanbanTask[]> => {
  if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
      return apiClient.get<KanbanTask[]>('/kanban/tasks', filters);
  }

  await delay(400);
  let tasks = deepCopy(mockKanbanTasks);

  if (filters.viewMode === 'active') tasks = tasks.filter(t => !t.isArchived);
  else if (filters.viewMode === 'archived') tasks = tasks.filter(t => t.isArchived);

  if (filters.boardId) tasks = tasks.filter(t => t.boardIds.includes(filters.boardId!));
  if (filters.assigneeId) tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
  if (filters.status) tasks = tasks.filter(t => filters.status?.includes(t.status));
  if (filters.showInMyTasks) tasks = tasks.filter(t => t.showInMyTasks);
  if (filters.selfAssigned) tasks = tasks.filter(t => t.selfAssigned);
  
  if(filters.startDate) tasks = tasks.filter(t => new Date(t.movedToDoneAt || t.createdAt) >= new Date(filters.startDate!));
  if(filters.endDate) tasks = tasks.filter(t => new Date(t.movedToDoneAt || t.createdAt) <= new Date(filters.endDate!));
  return tasks;
};

const getKanbanTaskById = async (taskId: string): Promise<KanbanTask | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.get<KanbanTask>(`/kanban/tasks/${taskId}`);
    }

    await delay(200);
    const task = mockKanbanTasks.find(t => t.id === taskId);
    return task ? deepCopy(task) : null;
};

const addKanbanTask = async (taskData: Omit<KanbanTask, 'id' | 'isArchived' | 'archivedAt' | 'archivedStatus' | 'createdAt' | 'updatedAt' | 'assignee' | 'movedToDoneAt' | 'subTasks' | 'activeTaskStage' | 'taskStagePotentialHistory' | 'taskStageContradictionsHistory' | 'taskStageSolutionHistory' | 'coefficient'>): Promise<KanbanTask> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.post<KanbanTask>('/kanban/tasks', taskData);
    }

    await delay(400);
    const newTask: KanbanTask = {
    ...taskData,
    id: generateId('task'),
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subTasks: [],
    taskStagePotentialHistory: [],
    taskStageContradictionsHistory: [],
    taskStageSolutionHistory: [],
    };
    mockKanbanTasks.push(newTask);

    if (newTask.assigneeId) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser?.id !== newTask.assigneeId) {
            const notification = createSystemNotification(
                newTask.assigneeId,
                'info',
                `${currentUser?.name || 'Кто-то'} создал(а) и назначил(а) вам задачу: '${newTask.title}'`,
                `/kanban/task/${newTask.id}`,
                { type: 'task', id: newTask.id }
            );
        }
    }

    return deepCopy(newTask);
};

const updateKanbanTask = async (taskData: Partial<KanbanTask> & {id: string}): Promise<KanbanTask> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        return apiClient.patch<KanbanTask>(`/kanban/tasks/${taskData.id}`, taskData);
    }

    await delay(300);
    const index = mockKanbanTasks.findIndex(t => t.id === taskData.id);
    if (index === -1) throw new Error("Task not found");
    const oldTask = { ...mockKanbanTasks[index] };
    const updatedTask = { ...oldTask, ...taskData, updatedAt: new Date().toISOString() };
    mockKanbanTasks[index] = updatedTask;

    if (taskData.assigneeId && taskData.assigneeId !== oldTask.assigneeId) {
        const currentUser = await authService.getCurrentUser();
        const newAssignee = MOCK_USERS.find(u => u.id === taskData.assigneeId);
        if (newAssignee && currentUser?.id !== newAssignee.id) {
            const notification = createSystemNotification(
                newAssignee.id,
                'info',
                `${currentUser?.name || 'Кто-то'} назначил(а) вам задачу: '${updatedTask.title}'`,
                `/kanban/task/${updatedTask.id}`,
                { type: 'task', id: updatedTask.id }
            );
        }
    }

    // --- SYNC WITH STRATEGIC PLAN ---
    // If this task is linked to a Strategic SubTask, update the plan status/progress automatically.
    if (updatedTask.strategicSubTaskId) {
        // Find the plan that contains this subtask
        for (const plan of mockStrategicPlans) {
            const subTask = findTaskRecursive(plan.subTasks, updatedTask.strategicSubTaskId);
            if (subTask) {
                // Found it! Update its status based on Kanban status
                if (updatedTask.status === KanbanTaskStatus.DONE) {
                    subTask.completed = true;
                    subTask.progress = 100;
                } else {
                    subTask.completed = false;
                    if (updatedTask.status === KanbanTaskStatus.IN_PROGRESS) {
                        subTask.progress = Math.max(subTask.progress || 0, 50); // Assume at least 50% if in progress
                    }
                    // If TODO, we leave progress as is or could reset to 0
                }
                subTask.updatedAt = new Date().toISOString();
                // We need to update the plan timestamp too
                plan.updatedAt = new Date().toISOString();
                console.log(`[SYNC] Updated Strategic Plan "${plan.title}" subtask "${subTask.title}" based on Kanban Task status.`);
                break; // Stop searching
            }
        }
    }

    return deepCopy(updatedTask);
};

const archiveKanbanTask = async (taskId: string, archive: boolean): Promise<KanbanTask> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
         return apiClient.post<KanbanTask>(`/kanban/tasks/${taskId}/archive`, { archive });
    }

    await delay(300);
    const index = mockKanbanTasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error("Task not found");
    
    const task = mockKanbanTasks[index];
    task.isArchived = archive;
    task.archivedAt = archive ? new Date().toISOString() : undefined;
    if (archive) {
        task.archivedStatus = task.status;
    }
    task.updatedAt = new Date().toISOString();
    
    return deepCopy(task);
};

const deleteKanbanTask = async (taskId: string): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
         await apiClient.delete(`/kanban/tasks/${taskId}`);
         return { success: true };
    }

    await delay(500);
    const index = mockKanbanTasks.findIndex(t => t.id === taskId);
    if (index > -1 && mockKanbanTasks[index].isArchived) {
        mockKanbanTasks.splice(index, 1);
        return { success: true };
    }
    if (index === -1) throw new Error("Task not found");
    throw new Error("Task must be archived before deletion");
};


const addTaskStageEntry = async (taskId: string, stage: 'potential' | 'contradictions' | 'solution', text: string, files: File[]): Promise<KanbanTask> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.KANBAN) {
        // File upload logic would be here in real implementation
        return apiClient.post<KanbanTask>(`/kanban/tasks/${taskId}/stages`, { stage, text });
    }

    await delay(500);
    const taskIndex = mockKanbanTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error("Task not found");
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const newEntry: StageEntry = {
    id: generateId('stage-entry'),
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    text: text,
    attachments: files.map(f => ({
        id: generateId('file'), name: f.name, url: `/mock-files/${f.name}`, type: f.type, size: f.size, timestamp: new Date().toISOString()
    }))
    };
    
    const task = mockKanbanTasks[taskIndex];
    if (stage === 'potential') task.taskStagePotentialHistory.push(newEntry);
    else if (stage === 'contradictions') task.taskStageContradictionsHistory.push(newEntry);
    else if (stage === 'solution') task.taskStageSolutionHistory.push(newEntry);

    return deepCopy(task);
};

export const kanbanService = {
    getKanbanBoards,
    getKanbanBoardById,
    addKanbanBoard,
    updateKanbanBoard,
    archiveKanbanBoard,
    deleteKanbanBoard,
    getKanbanTasks,
    getKanbanTaskById,
    addKanbanTask,
    updateKanbanTask,
    archiveKanbanTask,
    deleteKanbanTask,
    addTaskStageEntry,
};