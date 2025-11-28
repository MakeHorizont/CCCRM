
// services/api/dashboardService.ts
import { Order, ProductionOrder, KanbanTaskStatus, LowStockItem, PersonalDashboardSummary, User, ProductionMetrics, MaterialRequirement } from '../../types';
import { mockOrders } from '../mockData/orders';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { MOCK_USERS } from '../mockData/users';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockHouseholdItems } from '../mockData/householdItems';
import { delay, deepCopy } from './utils';

const getDashboardSummary = async (): Promise<{ newOrders: Order[]; outstandingInvoices: Order[]; productionOrdersNeedingReview: ProductionOrder[] }> => {
    await delay(500);
    const newOrders = mockOrders.filter(o => o.status === 'Новый' || o.status === 'В обработке' || o.status === 'Может быть собран' || o.status === 'Не может быть собран');
    const outstandingInvoices = mockOrders.filter(o => !o.isPaid && o.status !== 'Отменен');
    const productionOrdersNeedingReview = mockProductionOrders.filter(po => po.needsReviewAfterSalesOrderUpdate);
    return { newOrders: deepCopy(newOrders), outstandingInvoices: deepCopy(outstandingInvoices), productionOrdersNeedingReview: deepCopy(productionOrdersNeedingReview) };
};

const getDashboardKanbanSummary = async (): Promise<{ totalActiveTasks: number; tasksByStatus: Record<KanbanTaskStatus, number>; workloadByUser: { userId: string; userName: string; taskCount: number }[], overdueTasksCount: number }> => {
    await delay(500);
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

    return {
        totalActiveTasks: activeTasks.length,
        tasksByStatus,
        workloadByUser,
        overdueTasksCount,
    };
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

    // Sort by priority then due date to get top tasks
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
        user: deepCopy(user), // Return a copy of the user object
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

const getProductionMetrics = async (): Promise<ProductionMetrics> => {
    await delay(400);
    const activePOs = mockProductionOrders.filter(po => !po.isArchived && po.status !== 'Отменено');
    
    let totalPlanned = 0;
    let totalProduced = 0;
    let activeOrdersCount = 0;
    let delayedOrdersCount = 0;

    const today = new Date();

    activePOs.forEach(po => {
        if (['Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве', 'Контроль качества', 'Приостановлено'].includes(po.status)) {
            activeOrdersCount++;
            if (po.plannedEndDate && new Date(po.plannedEndDate) < today) {
                delayedOrdersCount++;
            }
        }
        
        po.orderItems.forEach(item => {
            totalPlanned += item.plannedQuantity;
            totalProduced += item.producedQuantity || 0;
        });
    });

    const efficiency = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0;

    return {
        totalPlannedItems: totalPlanned,
        totalProducedItems: totalProduced,
        efficiency,
        activeOrdersCount,
        delayedOrdersCount,
    };
};

const getResourceForecast = async (): Promise<{ name: string, daysLeft: number, dailyUsage: number, currentStock: number }[]> => {
    await delay(400);
    
    // 1. Calculate daily usage based on active Production Orders
    // Simplified logic: Assume all active POs will be consumed over the next 7 days uniformly
    const activePOs = mockProductionOrders.filter(po => 
        !po.isArchived && 
        ['Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве'].includes(po.status)
    );

    const totalUsageMap = new Map<string, number>(); // ItemId -> Total Quantity Needed

    activePOs.forEach(po => {
        po.orderItems.forEach(item => {
            const bom = item.billOfMaterialsSnapshot || [];
            bom.forEach(bomItem => {
                const needed = bomItem.quantityPerUnit * item.plannedQuantity;
                const current = totalUsageMap.get(bomItem.householdItemId) || 0;
                totalUsageMap.set(bomItem.householdItemId, current + needed);
            });
        });
    });

    const forecast: { name: string, daysLeft: number, dailyUsage: number, currentStock: number }[] = [];
    const PLANNING_HORIZON_DAYS = 7; 

    totalUsageMap.forEach((totalNeeded, itemId) => {
        const stockItem = mockHouseholdItems.find(i => i.id === itemId);
        if (stockItem) {
            const dailyUsage = totalNeeded / PLANNING_HORIZON_DAYS;
            const daysLeft = dailyUsage > 0 ? stockItem.quantity / dailyUsage : 999;
            
            if (daysLeft < 30) { // Only show relevant risks
                forecast.push({
                    name: stockItem.name,
                    daysLeft: Math.round(daysLeft * 10) / 10,
                    dailyUsage: Math.round(dailyUsage * 100) / 100,
                    currentStock: stockItem.quantity
                });
            }
        }
    });

    return forecast.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5); // Top 5 critical
};

export const dashboardService = {
    getDashboardSummary,
    getDashboardKanbanSummary,
    getPersonalDashboardSummary,
    getLowStockItems,
    getProductionMetrics,
    getResourceForecast,
};
