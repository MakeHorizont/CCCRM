// services/api/strategyService.ts
import { StrategicPlan, StrategicSubTask, KanbanTask, KanbanTaskStatus, SortableStrategicSubTaskKeys } from '../../types';
import { mockStrategicPlans } from '../mockData/strategicPlans';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';
import { DragEndEvent } from '@dnd-kit/core';

export const findTaskRecursive = (tasks: StrategicSubTask[], taskId: string): StrategicSubTask | null => {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    if (task.subTasks) {
      const found = findTaskRecursive(task.subTasks, taskId);
      if (found) return found;
    }
  }
  return null;
};

const removeTaskRecursive = (
    tasks: StrategicSubTask[],
    taskIdToRemove: string
  ): { removedTask: StrategicSubTask | null; updatedTasks: StrategicSubTask[] } => {
    let taskInstance: StrategicSubTask | null = null;
    const filterAndRecurse = (currentTasks: StrategicSubTask[]): StrategicSubTask[] => {
        const result: StrategicSubTask[] = [];
        for (const task of currentTasks) {
            if (task.id === taskIdToRemove) {
                if (!taskInstance) taskInstance = { ...task };
            } else {
                let processedTask = { ...task };
                if (task.subTasks && task.subTasks.length > 0) {
                    const subResult = removeTaskRecursive(task.subTasks, taskIdToRemove);
                    if (subResult.removedTask && !taskInstance) taskInstance = subResult.removedTask;
                    processedTask.subTasks = subResult.updatedTasks;
                }
                result.push(processedTask);
            }
        }
        return result;
    };
    const finalTasks = filterAndRecurse(tasks);
    return { removedTask: taskInstance, updatedTasks: finalTasks };
};

const addTaskRecursive = (tasks: StrategicSubTask[], taskToAdd: StrategicSubTask, parentId: string | null, newIndex?: number): StrategicSubTask[] => {
    if (parentId === null) {
        let newTasks = [...tasks];
        if (newIndex !== undefined && newIndex >= 0 && newIndex <= newTasks.length) {
            newTasks.splice(newIndex, 0, taskToAdd);
        } else {
            newTasks.push(taskToAdd);
        }
        return newTasks;
    }
    return tasks.map(task => {
        if (task.id === parentId) {
            let newSubTasks = [...(task.subTasks || [])];
            if (newIndex !== undefined && newIndex >= 0 && newIndex <= newSubTasks.length) {
                newSubTasks.splice(newIndex, 0, taskToAdd);
            } else {
                newSubTasks.push(taskToAdd);
            }
            return { ...task, subTasks: newSubTasks };
        }
        if (task.subTasks) {
          return { ...task, subTasks: addTaskRecursive(task.subTasks, taskToAdd, parentId, newIndex) };
        }
        return task;
    });
};

const deleteTaskRecursive = (tasks: StrategicSubTask[], taskId: string): StrategicSubTask[] => {
    let newTasks = tasks.filter(task => task.id !== taskId);
    newTasks = newTasks.map(task => {
        if (task.subTasks) {
            return {...task, subTasks: deleteTaskRecursive(task.subTasks, taskId)};
        }
        return task;
    });
    return newTasks;
};

const getStrategicPlans = async (filters: { viewMode: 'active' | 'archived' }): Promise<StrategicPlan[]> => {
    await delay(300);
    return deepCopy(mockStrategicPlans).filter(p => filters.viewMode === 'archived' ? p.isArchived : !p.isArchived);
};

const getStrategicPlanById = async (planId: string): Promise<StrategicPlan | null> => {
    await delay(200);
    const plan = mockStrategicPlans.find(p => p.id === planId);
    return plan ? deepCopy(plan) : null;
};

const addStrategicPlan = async (planData: Omit<StrategicPlan, 'id'|'subTasks'|'createdAt'|'updatedAt'|'isArchived'|'archivedAt'>): Promise<StrategicPlan> => {
    await delay(400);
    const newPlan: StrategicPlan = {
      ...planData,
      id: generateId('plan'),
      subTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
    };
    mockStrategicPlans.push(newPlan);
    return deepCopy(newPlan);
};

const updateStrategicPlan = async (planData: StrategicPlan): Promise<StrategicPlan> => {
    await delay(400);
    const index = mockStrategicPlans.findIndex(p => p.id === planData.id);
    if (index === -1) throw new Error("Strategic Plan not found");
    mockStrategicPlans[index] = { ...mockStrategicPlans[index], ...planData, updatedAt: new Date().toISOString() };
    return deepCopy(mockStrategicPlans[index]);
};

const archiveStrategicPlan = async (planId: string, archive: boolean): Promise<{success: true}> => {
    await delay(300);
    const index = mockStrategicPlans.findIndex(p => p.id === planId);
    if (index === -1) throw new Error("Strategic Plan not found");
    mockStrategicPlans[index].isArchived = archive;
    mockStrategicPlans[index].archivedAt = archive ? new Date().toISOString() : undefined;
    mockStrategicPlans[index].updatedAt = new Date().toISOString();
    return { success: true };
};

const deleteStrategicPlan = async (planId: string): Promise<{success: true}> => {
    await delay(500);
    const index = mockStrategicPlans.findIndex(p => p.id === planId);
    if (index > -1 && mockStrategicPlans[index].isArchived) {
      mockStrategicPlans.splice(index, 1);
      return { success: true };
    }
    if (index === -1) throw new Error("Plan not found");
    throw new Error("Plan must be archived before deletion");
};

const addStrategicSubTask = async (planId: string, subTaskData: Omit<StrategicSubTask, 'id'|'createdAt'|'updatedAt'|'assignee'|'kanbanTaskId'|'subTasks'>, newIndexInParent?: number): Promise<StrategicPlan> => {
    await delay(300);
    const planIndex = mockStrategicPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) throw new Error("Plan not found");
    const newSubTask: StrategicSubTask = {
      ...subTaskData,
      id: generateId('subtask'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subTasks: [],
    };
    mockStrategicPlans[planIndex].subTasks = addTaskRecursive(mockStrategicPlans[planIndex].subTasks, newSubTask, subTaskData.parentId || null, newIndexInParent);
    return deepCopy(mockStrategicPlans[planIndex]);
};

const updateStrategicSubTask = async (planId: string, subTaskData: StrategicSubTask, newIndexInParent?: number): Promise<StrategicPlan> => {
    await delay(300);
    const planIndex = mockStrategicPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) throw new Error("Plan not found");
    const { removedTask } = removeTaskRecursive(mockStrategicPlans[planIndex].subTasks, subTaskData.id);
    if (!removedTask) throw new Error("Subtask to update not found");

    const taskToInsert = { ...removedTask, ...subTaskData, updatedAt: new Date().toISOString() };
    const tasksWithoutOld = removeTaskRecursive(mockStrategicPlans[planIndex].subTasks, subTaskData.id).updatedTasks;
    mockStrategicPlans[planIndex].subTasks = addTaskRecursive(tasksWithoutOld, taskToInsert, subTaskData.parentId || null, newIndexInParent);
    
    return deepCopy(mockStrategicPlans[planIndex]);
};

const deleteStrategicSubTask = async (planId: string, subTaskId: string): Promise<StrategicPlan> => {
    await delay(400);
    const planIndex = mockStrategicPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) throw new Error("Plan not found");
    mockStrategicPlans[planIndex].subTasks = deleteTaskRecursive(mockStrategicPlans[planIndex].subTasks, subTaskId);
    return deepCopy(mockStrategicPlans[planIndex]);
};

const createKanbanTaskFromStrategicSubTask = async (planId: string, subTaskId: string): Promise<KanbanTask> => {
    await delay(500);
    const plan = mockStrategicPlans.find(p => p.id === planId);
    if (!plan) throw new Error("Plan not found");
    const subTask = findTaskRecursive(plan.subTasks, subTaskId);
    if (!subTask) throw new Error("Subtask not found");

    const newKanbanTask: KanbanTask = {
      id: generateId('task'),
      title: subTask.title,
      description: subTask.description || `Задача из стратегического плана: ${plan.title}`,
      status: KanbanTaskStatus.TODO,
      assigneeId: subTask.assigneeId,
      dueDate: subTask.dueDate,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subTasks: [],
      checklist: [],
      boardIds: ['board-default'], // Or some other logic
      showInMyTasks: !!subTask.assigneeId,
      strategicSubTaskId: subTask.id,
      taskStagePotentialHistory: [],
      taskStageContradictionsHistory: [],
      taskStageSolutionHistory: [],
    };
    mockKanbanTasks.push(newKanbanTask);
    
    subTask.kanbanTaskId = newKanbanTask.id;
    await updateStrategicPlan(plan);

    return deepCopy(newKanbanTask);
};

const findSubTaskInPlan = (plan: StrategicPlan | null, subTaskId: string): StrategicSubTask | null => {
    if (!plan) return null;
    return findTaskRecursive(plan.subTasks, subTaskId);
};

const getAndSortDisplayedSubTasks = (
    plan: StrategicPlan,
    parentId: string | null,
    sortConfig: { key: SortableStrategicSubTaskKeys; direction: 'asc' | 'desc' } | null
): StrategicSubTask[] => {
    let tasksToShow: StrategicSubTask[];
    if (parentId === null) {
        tasksToShow = plan.subTasks || [];
    } else {
        const parentTask = findTaskRecursive(plan.subTasks || [], parentId);
        tasksToShow = parentTask?.subTasks || [];
    }

    if (!sortConfig) return tasksToShow;

    return [...tasksToShow].sort((a, b) => {
        let valA: any, valB: any;
        switch (sortConfig.key) {
            case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
            case 'dueDate':
                valA = a.dueDate ? new Date(a.dueDate).getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                valB = b.dueDate ? new Date(b.dueDate).getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                break;
            case 'completed': valA = a.completed ? 1 : (a.progress || 0) / 1000; valB = b.completed ? 1 : (b.progress || 0) / 1000; break;
            case 'progress': valA = a.progress ?? (a.completed ? 100 : 0); valB = b.progress ?? (b.completed ? 100 : 0); break;
            case 'subTaskCount': valA = a.subTasks?.length || 0; valB = b.subTasks?.length || 0; break;
            default: return 0;
        }
        if (typeof valA === 'string' && typeof valB === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
};

const handleSubTaskDragEnd = async (event: DragEndEvent, plan: StrategicPlan, currentParentId: string | null): Promise<StrategicPlan> => {
    await delay(300);
    const { active, over } = event;
    if (!active || !over) return plan;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeData = active.data.current as { item: StrategicSubTask };
    const overData = over.data.current as { item?: StrategicSubTask };

    if (!activeData || !activeData.item) return plan;
    const draggedItemOriginal = activeData.item;
    
    let newParentId: string | null;
    let newIndexInParent: number;

    const currentPlanTasks = JSON.parse(JSON.stringify(plan.subTasks)) as StrategicSubTask[];

    const isDescendant = (potentialChildId: string | null, potentialParentId: string, tasks: StrategicSubTask[]): boolean => {
      if (!potentialChildId) return false;
      if (potentialChildId === potentialParentId) return true; 
      const parent = findTaskRecursive(tasks, potentialParentId);
      if (!parent) return false;
      let queue = [...(parent.subTasks || [])];
      while(queue.length > 0) {
          const current = queue.shift();
          if (!current) continue;
          if (current.id === potentialChildId) return true;
          if (current.subTasks) queue.push(...current.subTasks);
      }
      return false;
    };

    if (overData?.item && overData.item.id !== activeId) { 
        newParentId = overData.item.id;
        const parentItem = findTaskRecursive(currentPlanTasks, newParentId);
        newIndexInParent = parentItem?.subTasks?.length || 0; 
    } else { 
        newParentId = currentParentId; 
        let targetList: StrategicSubTask[];
        if (newParentId === null) { 
            targetList = currentPlanTasks;
        } else {
            const parentInFullTree = findTaskRecursive(currentPlanTasks, newParentId);
            targetList = parentInFullTree?.subTasks || [];
        }
        const overItemIndexInTargetList = targetList.findIndex(t => t.id === overId);
        newIndexInParent = overItemIndexInTargetList !== -1 ? overItemIndexInTargetList : targetList.length;
        if (activeId === overId && newParentId === draggedItemOriginal.parentId) { 
            return plan;
        }
    }

    if (isDescendant(newParentId, activeId, currentPlanTasks)) {
        throw new Error("Нельзя переместить родительскую задачу внутрь ее дочерней задачи.");
    }

    const planIndex = mockStrategicPlans.findIndex(p => p.id === plan.id);
    if (planIndex === -1) throw new Error("Plan not found during drag end");
    
    const { removedTask } = removeTaskRecursive(mockStrategicPlans[planIndex].subTasks, activeId);
    if (!removedTask) throw new Error("Subtask to update not found");

    const taskToInsert = { ...removedTask, parentId: newParentId, updatedAt: new Date().toISOString() };
    const tasksWithoutOld = removeTaskRecursive(mockStrategicPlans[planIndex].subTasks, activeId).updatedTasks;
    mockStrategicPlans[planIndex].subTasks = addTaskRecursive(tasksWithoutOld, taskToInsert, newParentId, newIndexInParent);
    
    const refreshedPlan = mockStrategicPlans[planIndex];
    if (!refreshedPlan) throw new Error("Plan not found after update.");
    return deepCopy(refreshedPlan);
};

export const strategyService = {
    getStrategicPlans,
    getStrategicPlanById,
    addStrategicPlan,
    updateStrategicPlan,
    archiveStrategicPlan,
    deleteStrategicPlan,
    addStrategicSubTask,
    updateStrategicSubTask,
    deleteStrategicSubTask,
    createKanbanTaskFromStrategicSubTask,
    findSubTaskInPlan,
    getAndSortDisplayedSubTasks,
    handleSubTaskDragEnd,
};