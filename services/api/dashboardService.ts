// services/api/dashboardService.ts
import { Order, ProductionOrder, KanbanTaskStatus, LowStockItem, PersonalDashboardSummary, User } from '../../types';
import { mockOrders } from '../mockData/orders';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { MOCK_USERS } from '../mockData/users';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockHouseholdItems } from '../mockData/householdItems';
import { delay, deepCopy } from './utils';

const getDashboardSummary = (): Promise<{ newOrders: Order[]; outstandingInvoices: Order[]; productionOrdersNeedingReview: ProductionOrder[] }> => {
    return new Promise(resolve => {
      delay(500).then(() => {
        const newOrders = mockOrders.filter(o => o.status === 'Новый' || o.status === 'В обработке' || o.status === 'Может быть собран' || o.status === 'Не может быть собран');
        const outstandingInvoices = mockOrders.filter(o => !o.isPaid && o.status !== 'Отменен');
        const productionOrdersNeedingReview = mockProductionOrders.filter(po => po.needsReviewAfterSalesOrderUpdate);
        resolve({ newOrders: deepCopy(newOrders), outstandingInvoices: deepCopy(outstandingInvoices), productionOrdersNeedingReview: deepCopy(productionOrdersNeedingReview) });
      });
    });
};
  
const getDashboardKanbanSummary = (): Promise<{ totalActiveTasks: number; tasksByStatus: Record<KanbanTaskStatus, number>; workloadByUser: { userId: string; userName: string; taskCount: number }[], overdueTasksCount: number }> => {
    return new Promise(resolve => {
        delay(500).then(() => {
            const activeTasks = mockKanbanTasks.filter(t => !t.isArchived);
            const tasksByStatus = {
                [KanbanTaskStatus.TODO]: activeTasks.filter(t => t.status === KanbanTaskStatus.TODO).length,
                [KanbanTaskStatus.IN_PROGRESS]: activeTasks.filter(t => t.status === KanbanTaskStatus.IN_PROGRESS).length,
                [KanbanTaskStatus.DONE]: activeTasks.filter(t => t.status === KanbanTaskStatus.DONE).length,
            };
            
            const workloadMap: Record<string, { userName: string, taskCount: number }> = {};
            activeTasks.forEach(task => {
                if(task.assigneeId) {
                    if(!workloadMap[task.assigneeId]) {
                        const user = MOCK_USERS.find(u => u.id === task.assigneeId);
                        workloadMap[task.assigneeId] = { userName: user?.name || `User ${task.assigneeId}`, taskCount: 0};
                    }
                    workloadMap[task.assigneeId].taskCount++;
                }
            });
            const workloadByUser = Object.entries(workloadMap).map(([userId, data]) => ({
                userId, ...data
            })).sort((a,b) => b.taskCount - a.taskCount);

            const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== KanbanTaskStatus.DONE);
            const overdueTasksCount = overdueTasks.length;

            resolve({
                totalActiveTasks: activeTasks.length,
                tasksByStatus,
                workloadByUser,
                overdueTasksCount,
            });
        });
    });
};

const getPersonalDashboardSummary = async (userId: string): Promise<PersonalDashboardSummary> => {
    await delay(500);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
        throw new Error("User not found for personal dashboard summary.");
    }

    const allUserTasks = mockKanbanTasks.filter(t => t.assigneeId === userId);
    const activeTasks = allUserTasks.filter(t => !t.isArchived);
    const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== KanbanTaskStatus.DONE);

    const topTasks = activeTasks
        .filter(t => t.status !== KanbanTaskStatus.DONE)
        .sort((a, b) => {
            const priorityA = parseInt(a.priority || '4');
            const priorityB = parseInt(b.priority || '4');
            if (priorityA !== priorityB) return priorityA - priorityB;
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
        })
        .slice(0, 5);

    const inProgressGoals = (user.developmentPlan || []).filter(g => g.status === 'in_progress');

    const recentAchievements = (user.achievements || [])
        .sort((a, b) => new Date(b.dateAwarded).getTime() - new Date(a.dateAwarded).getTime())
        .slice(0, 3);
        
    const displayedBadge = user.displayedAchievementId
        ? (user.achievements || []).find(ach => ach.id === user.displayedAchievementId) || null
        : null;

    const summary: PersonalDashboardSummary = {
        tasks: {
            activeCount: activeTasks.filter(t => t.status !== KanbanTaskStatus.DONE).length,
            overdueCount: overdueTasks.length,
            topTasks: topTasks,
        },
        development: {
            inProgressGoals: inProgressGoals,
        },
        achievements: {
            recentAchievements: recentAchievements,
            displayedBadge: displayedBadge,
        },
        user: deepCopy(user),
    };
    return summary;
};

const getLowStockItems = async (): Promise<LowStockItem[]> => {
    await delay(500);
    const lowStock: LowStockItem[] = [];

    mockWarehouseItems.forEach(item => {
        if (!item.isArchived && item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
            lowStock.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                lowStockThreshold: item.lowStockThreshold,
                unit: 'шт.',
                type: 'warehouse',
            });
        }
    });

    mockHouseholdItems.forEach(item => {
        if (!item.isArchived && item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
            lowStock.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                lowStockThreshold: item.lowStockThreshold,
                unit: item.unit,
                type: 'household',
            });
        }
    });

    return lowStock;
};

export const dashboardService = {
    getDashboardSummary,
    getDashboardKanbanSummary,
    getPersonalDashboardSummary,
    getLowStockItems,
};
