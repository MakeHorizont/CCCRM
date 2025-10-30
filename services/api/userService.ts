// services/api/userService.ts
import { User, PayslipData, PayslipLineItem, KanbanTaskStatus } from '../../types';
import { MOCK_USERS } from '../mockData/users';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { authService } from '../authService';
import { delay, deepCopy } from './utils';
import { BONUS_PER_COEFFICIENT_POINT, calculateTaskCoefficient } from '../../constants';

const getUsersWithHierarchyDetails = (): Promise<User[]> => {
    return new Promise(resolve => {
        delay(300).then(() => resolve(deepCopy(authService.getMockUsers())));
    });
};

const getUsersForAssignee = (currentUserId: string): Promise<User[]> => {
    return new Promise(resolve => {
        delay(100).then(() => {
            const users = authService.getMockUsers().filter(u => u.status !== 'fired');
            resolve(deepCopy(users));
        });
    });
};

const getAvailableFunctionalRoles = (): Promise<string[]> => {
    return new Promise(resolve => {
        const roles = new Set<string>();
        authService.getMockUsers().forEach(user => {
            user.functionalRoles?.forEach(role => roles.add(role));
        });
        resolve(Array.from(roles).sort());
    });
};

const updateUserProfile = async (userId: string, profileData: Partial<User>): Promise<User> => {
    await delay(400);
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        throw new Error('User not found');
    }
    
    const updatedUser = { ...MOCK_USERS[userIndex], ...profileData };
    
    authService.updateMockUser(updatedUser as User);
    
    const updatedUserFromService = authService.getMockUsers().find(u => u.id === userId);

    if(!updatedUserFromService) throw new Error("Update failed in mock service.");
    
    return deepCopy(updatedUserFromService as User);
};

const getUserPayslip = async (userId: string, year: number, month: number): Promise<PayslipData> => {
    await delay(500);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user || user.dailyRate === undefined) {
        throw new Error("Данные пользователя или дневная ставка недоступны.");
    }

    const lineItems: PayslipLineItem[] = [];
    const attendanceForMonth = (user.attendance || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getUTCFullYear() === year && entryDate.getUTCMonth() === month;
    });

    let workDaysForBaseSalary = 0;
    let remoteDaysWithSpecialRate = 0;
    let tripDaysCount = 0;

    attendanceForMonth.forEach(e => {
        if (e.type === 'work' || e.type === 'late') workDaysForBaseSalary++;
        else if (e.type === 'trip') { workDaysForBaseSalary++; tripDaysCount++; }
        else if (e.type === 'remote') {
            if (user.remoteWorkRate && user.remoteWorkRate > 0) remoteDaysWithSpecialRate++;
            else workDaysForBaseSalary++;
        }
    });

    const baseSalary = user.dailyRate * workDaysForBaseSalary;
    if (baseSalary > 0) lineItems.push({ type: 'base', description: `Оклад (${workDaysForBaseSalary} дн.)`, amount: baseSalary });

    const remotePay = (user.remoteWorkRate || 0) * remoteDaysWithSpecialRate;
    if (remotePay > 0) lineItems.push({ type: 'remote', description: `Удаленная работа (${remoteDaysWithSpecialRate} дн.)`, amount: remotePay });

    const tripBonus = (user.tripBonusPerDay || 0) * tripDaysCount;
    if (tripBonus > 0) lineItems.push({ type: 'trip_bonus', description: `Командировочные (${tripDaysCount} дн.)`, amount: tripBonus });

    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    
    const completedTasksInMonth = mockKanbanTasks.filter(t => 
        t.assigneeId === userId && 
        t.status === KanbanTaskStatus.DONE && 
        t.movedToDoneAt && 
        new Date(t.movedToDoneAt) >= firstDayOfMonth && 
        new Date(t.movedToDoneAt) <= lastDayOfMonth
    );
    const taskBonus = completedTasksInMonth.reduce((sum, task) => sum + ((task.coefficient || calculateTaskCoefficient(task)) * BONUS_PER_COEFFICIENT_POINT), 0);
    if (taskBonus > 0) lineItems.push({ type: 'task_bonus', description: `Премия за задачи (${completedTasksInMonth.length} шт.)`, amount: taskBonus });
    
    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    return { year, month, lineItems, total };
};

export const userService = {
    getUsersWithHierarchyDetails,
    getUsersForAssignee,
    getAvailableFunctionalRoles,
    updateUserProfile,
    getUserPayslip,
};
