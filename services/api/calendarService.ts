
import { CalendarEvent } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockOrders } from '../mockData/orders';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { mockEquipment } from '../mockData/equipment';
import { mockRotationSchedules } from '../mockData/rotationSchedules';
import { mockCouncilProposals } from '../mockData/council'; // Assuming meetings/votes might be relevant
import { MOCK_USERS } from '../mockData/users';
import { ROUTE_PATHS } from '../../constants';
import { delay } from './utils';

const getCalendarEvents = async (filters?: { month: number, year: number, types?: string[] }): Promise<CalendarEvent[]> => {
    await delay(300); // Simulate aggregation latency

    const events: CalendarEvent[] = [];
    const targetMonth = filters?.month;
    const targetYear = filters?.year;

    // Helper to check if date is in target month (if filters provided)
    const isInMonth = (dateStr?: string) => {
        if (!dateStr) return false;
        if (targetMonth === undefined || targetYear === undefined) return true;
        const d = new Date(dateStr);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    };

    // 1. Production Orders (Start and End dates)
    if (!filters?.types || filters.types.includes('production')) {
        mockProductionOrders.forEach(po => {
            if (po.isArchived || po.status === 'Отменено') return;
            
            if (isInMonth(po.plannedStartDate)) {
                events.push({
                    id: `po-start-${po.id}`,
                    title: `Старт ПЗ: ${po.name}`,
                    date: po.plannedStartDate!.split('T')[0],
                    type: 'production',
                    link: `${ROUTE_PATHS.PRODUCTION}/${po.id}`,
                    status: po.status,
                    assigneeName: po.assigneeName || undefined
                });
            }
            if (isInMonth(po.plannedEndDate) && po.plannedEndDate !== po.plannedStartDate) {
                events.push({
                    id: `po-end-${po.id}`,
                    title: `Сдача ПЗ: ${po.name}`,
                    date: po.plannedEndDate!.split('T')[0],
                    type: 'production',
                    link: `${ROUTE_PATHS.PRODUCTION}/${po.id}`,
                    status: po.status,
                    assigneeName: po.assigneeName || undefined
                });
            }
        });
    }

    // 2. Sales Orders (Shipping Date)
    if (!filters?.types || filters.types.includes('sales')) {
        mockOrders.forEach(order => {
            if (order.isArchived || order.status === 'Отменен') return;
            
            // Use date as order date, or if we had a specific "deliveryDate" field. 
            // For now, let's assume 'date' is creation, but in a real ERP we'd schedule shipment.
            // Let's use 'date' for now as "Order Date".
            if (isInMonth(order.date)) {
                events.push({
                    id: `order-${order.id}`,
                    title: `Заказ #${order.id} (${order.customerName})`,
                    date: order.date.split('T')[0],
                    type: 'sales',
                    link: `${ROUTE_PATHS.ORDERS}/${order.id}`,
                    status: order.status,
                    description: `${order.amount.toLocaleString()} ₽`
                });
            }
        });
    }

    // 3. Maintenance (Scheduled Maintenance)
    if (!filters?.types || filters.types.includes('maintenance')) {
        mockEquipment.forEach(eq => {
            if (eq.isArchived || !eq.nextMaintenanceDate) return;
            
            if (isInMonth(eq.nextMaintenanceDate)) {
                events.push({
                    id: `maint-${eq.id}`,
                    title: `ТО: ${eq.name}`,
                    date: eq.nextMaintenanceDate.split('T')[0],
                    type: 'maintenance',
                    link: `${ROUTE_PATHS.EQUIPMENT}/${eq.id}`,
                    status: 'planned'
                });
            }
        });
    }

    // 4. Kanban Tasks (Due Dates)
    if (!filters?.types || filters.types.includes('task')) {
        mockKanbanTasks.forEach(task => {
            if (task.isArchived || !task.dueDate) return;
            
            if (isInMonth(task.dueDate)) {
                const assignee = MOCK_USERS.find(u => u.id === task.assigneeId);
                events.push({
                    id: `task-${task.id}`,
                    title: `Задача: ${task.title}`,
                    date: task.dueDate.split('T')[0],
                    type: 'task',
                    link: `${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${task.id}`,
                    status: task.status,
                    assigneeName: assignee?.name
                });
            }
        });
    }

    // 5. Rotations (Start dates)
    if (!filters?.types || filters.types.includes('rotation')) {
        mockRotationSchedules.forEach(rot => {
             if (isInMonth(rot.startDate)) {
                const user = MOCK_USERS.find(u => u.id === rot.userId);
                 events.push({
                    id: `rot-${rot.id}`,
                    title: `Ротация: ${rot.area} (${user?.name || 'Вакансия'})`,
                    date: rot.startDate,
                    type: 'rotation',
                    link: ROUTE_PATHS.ROTATION,
                    status: 'scheduled'
                });
             }
        });
    }

    return events.sort((a,b) => a.date.localeCompare(b.date));
};

export const calendarService = {
    getCalendarEvents,
};
