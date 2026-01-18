
import { CalendarEvent } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockOrders } from '../mockData/orders';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { mockEquipment } from '../mockData/equipment';
import { mockRotationSchedules } from '../mockData/rotationSchedules';
import { mockDiscussions } from '../mockData/discussions';
import { MOCK_USERS } from '../mockData/users';
import { ROUTE_PATHS } from '../../constants';
import { delay } from './utils';

const getCalendarEvents = async (filters?: { month: number, year: number, types?: string[] }): Promise<CalendarEvent[]> => {
    await delay(300);

    const events: CalendarEvent[] = [];
    const targetMonth = filters?.month;
    const targetYear = filters?.year;

    const isInMonth = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return (targetMonth === undefined || d.getUTCMonth() === targetMonth) && 
               (targetYear === undefined || d.getUTCFullYear() === targetYear);
    };

    // 1. Production (Planned Start)
    mockProductionOrders.forEach(po => {
        if (po.isArchived || po.status === 'Отменено') return;
        if (isInMonth(po.plannedStartDate)) {
            events.push({
                id: `po-${po.id}`,
                title: `🏗️ ПЗ: ${po.name}`,
                date: po.plannedStartDate!.split('T')[0],
                type: 'production',
                link: `${ROUTE_PATHS.PRODUCTION}/${po.id}`,
                status: po.status
            });
        }
    });

    // 2. Sales (Orders)
    mockOrders.forEach(order => {
        if (order.isArchived || order.status === 'Отменен') return;
        if (isInMonth(order.date)) {
            events.push({
                id: `order-${order.id}`,
                title: `💰 Заказ: ${order.customerName}`,
                date: order.date.split('T')[0],
                type: 'sales',
                link: `${ROUTE_PATHS.ORDERS}/${order.id}`,
                status: order.status,
                description: `${order.amount.toLocaleString()} ₽`
            });
        }
    });

    // 3. Maintenance (Scheduled Repairs)
    mockEquipment.forEach(eq => {
        if (eq.isArchived || !eq.nextMaintenanceDate) return;
        if (isInMonth(eq.nextMaintenanceDate)) {
            events.push({
                id: `maint-${eq.id}`,
                title: `🔧 ТО: ${eq.name}`,
                date: eq.nextMaintenanceDate.split('T')[0],
                type: 'maintenance',
                link: `${ROUTE_PATHS.EQUIPMENT}/${eq.id}`,
                status: 'urgent'
            });
        }
    });

    // 4. Tasks (Kanban Due Dates)
    mockKanbanTasks.forEach(task => {
        if (task.isArchived || !task.dueDate) return;
        if (isInMonth(task.dueDate)) {
            events.push({
                id: `task-${task.id}`,
                title: `📌 ${task.title}`,
                date: task.dueDate.split('T')[0],
                type: 'task',
                link: `${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${task.id}`,
                status: task.status
            });
        }
    });

    // 5. Rotations (Start Dates)
    mockRotationSchedules.forEach(rot => {
        if (isInMonth(rot.startDate)) {
            const user = MOCK_USERS.find(u => u.id === rot.userId);
            events.push({
                id: `rot-${rot.id}`,
                title: `🔄 Ротация: ${rot.area} (${user?.name || 'Свободно'})`,
                date: rot.startDate,
                type: 'rotation',
                link: ROUTE_PATHS.ROTATION
            });
        }
    });

    // 6. Meetings (Active votings from Council/Discussions)
    mockDiscussions.forEach(topic => {
        if (topic.isArchived || topic.status !== 'voting') return;
        if (isInMonth(topic.createdAt)) {
            events.push({
                id: `meeting-${topic.id}`,
                title: `⚖️ Совет: ${topic.title}`,
                date: topic.createdAt.split('T')[0],
                type: 'meeting',
                link: `${ROUTE_PATHS.DISCUSSIONS}/${topic.id}`,
                status: 'urgent'
            });
        }
    });

    return events.sort((a,b) => a.date.localeCompare(b.date));
};

export const calendarService = {
    getCalendarEvents,
};
