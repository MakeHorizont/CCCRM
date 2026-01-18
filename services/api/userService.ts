
// services/api/userService.ts
import { User, PayslipData, PayslipLineItem, KanbanTaskStatus, AttendanceEntry, KTUDetails, KTUComponent, DailyStats, HonorBoardEntry } from '../../types';
import { MOCK_USERS } from '../mockData/users';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { authService } from '../authService';
import { delay, deepCopy } from './utils';
import { BONUS_PER_COEFFICIENT_POINT, calculateTaskCoefficient } from '../../constants';
import { systemService } from './systemService';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getUsersWithHierarchyDetails = async (): Promise<User[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<User[]>('/hr/users');
    }
    return new Promise(resolve => {
        delay(300).then(() => resolve(deepCopy(authService.getMockUsers())));
    });
};

const getUsersForAssignee = async (currentUserId: string): Promise<User[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<User[]>('/hr/users', { status: 'active' });
    }
    return new Promise(resolve => {
        delay(100).then(() => {
            const users = authService.getMockUsers().filter(u => u.status !== 'fired');
            resolve(deepCopy(users));
        });
    });
};

const getAvailableFunctionalRoles = async (): Promise<string[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<string[]>('/hr/roles');
    }
    return new Promise(resolve => {
        const roles = new Set<string>();
        authService.getMockUsers().forEach(user => {
            user.functionalRoles?.forEach(role => roles.add(role));
        });
        resolve(Array.from(roles).sort());
    });
};

const updateUserProfile = async (userId: string, profileData: Partial<User>): Promise<User> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.patch<User>(`/hr/users/${userId}`, profileData);
    }

    await delay(400);
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        throw new Error('User not found');
    }
    
    const oldUserData = { ...MOCK_USERS[userIndex] };
    const updatedUser = { ...MOCK_USERS[userIndex], ...profileData };
    
    const changes: string[] = [];
    
    if (profileData.dailyRate !== undefined && profileData.dailyRate !== oldUserData.dailyRate) {
        changes.push(`Оклад: ${oldUserData.dailyRate} -> ${profileData.dailyRate}`);
    }
    if (profileData.role !== undefined && profileData.role !== oldUserData.role) {
        changes.push(`Системная роль: ${oldUserData.role} -> ${profileData.role}`);
    }
    if (profileData.status !== undefined && profileData.status !== oldUserData.status) {
        changes.push(`Статус: ${oldUserData.status} -> ${profileData.status}`);
    }
    const oldRoles = (oldUserData.functionalRoles || []).sort().join(', ');
    const newRoles = (updatedUser.functionalRoles || []).sort().join(', ');
    if (oldRoles !== newRoles) {
        changes.push(`Группы: [${oldRoles}] -> [${newRoles}]`);
    }

    if (changes.length > 0) {
        await systemService.logEvent(
            'Изменение профиля сотрудника',
            `Изменены данные пользователя ${updatedUser.name} (${updatedUser.email}): ${changes.join('; ')}`,
            'user_update',
            userId,
            'User'
        );
    }

    authService.updateMockUser(updatedUser as User);
    const updatedUserFromService = authService.getMockUsers().find(u => u.id === userId);
    if(!updatedUserFromService) throw new Error("Update failed in mock service.");
    return deepCopy(updatedUserFromService as User);
};

const startWorkShift = async (userId: string): Promise<void> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        await apiClient.post('/hr/attendance/check-in', { userId });
        return;
    }
    await delay(300);
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    const user = MOCK_USERS[userIndex];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (!user.attendance) user.attendance = [];
    const existingEntryIndex = user.attendance.findIndex(e => e.date === today);
    const isLate = now.getHours() >= 10; 
    const type = isLate ? 'late' : 'work';
    if (existingEntryIndex === -1) {
        user.attendance.push({ date: today, type: type, checkInTime: now.toISOString() });
    } else {
        if (['excused_absence', 'unexcused_absence'].includes(user.attendance[existingEntryIndex].type)) {
             user.attendance[existingEntryIndex].type = type;
             user.attendance[existingEntryIndex].checkInTime = now.toISOString();
        }
    }
    authService.updateMockUser(user);
    await systemService.logEvent('Начало смены', 'Сотрудник начал смену через терминал.', 'auth', userId, 'User');
};

const endWorkShift = async (userId: string): Promise<void> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        await apiClient.post('/hr/attendance/check-out', { userId });
        return;
    }
    await delay(300);
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    const user = MOCK_USERS[userIndex];
    const today = new Date().toISOString().split('T')[0];
    if (!user.attendance) return; 
    const existingEntryIndex = user.attendance.findIndex(e => e.date === today);
    if (existingEntryIndex !== -1) {
        user.attendance[existingEntryIndex].checkOutTime = new Date().toISOString();
    }
    authService.updateMockUser(user);
    await systemService.logEvent('Конец смены', 'Сотрудник завершил смену через терминал.', 'auth', userId, 'User');
};

const calculateUserKTU = async (userId: string): Promise<KTUDetails> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<KTUDetails>(`/hr/payroll/${userId}/ktu`);
    }

    await delay(200);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;
    const components: KTUComponent[] = [{ label: 'Базовая ставка', value: 1.0, type: 'base', description: 'Гарантированный минимум' }];
    let total = 1.0;

    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const productionOrders = mockProductionOrders.filter(po => 
        !po.isArchived && po.assignedToId === userId && po.actualEndDate &&
        new Date(po.actualEndDate) >= firstDayOfMonth && new Date(po.actualEndDate) <= lastDayOfMonth
    );
    const productionScore = productionOrders.length * 0.05;
    if (productionScore > 0) {
        total += productionScore;
        components.push({ label: `Выполнение ПЗ (${productionOrders.length})`, value: productionScore, type: 'bonus' });
    }

    const tasks = mockKanbanTasks.filter(t => 
        t.assigneeId === userId && t.status === KanbanTaskStatus.DONE && t.movedToDoneAt && 
        new Date(t.movedToDoneAt) >= firstDayOfMonth && new Date(t.movedToDoneAt) <= lastDayOfMonth
    );
    let taskScore = tasks.reduce((sum, t) => sum + (t.complexity === 'high' ? 0.05 : t.complexity === 'medium' ? 0.02 : 0.01), 0);
    if (taskScore > 0) {
        taskScore = Math.min(taskScore, 0.5);
        total += taskScore;
        components.push({ label: `Задачи Kanban (${tasks.length})`, value: parseFloat(taskScore.toFixed(2)), type: 'bonus' });
    }

    const attendance = (user.attendance || []).filter(a => new Date(a.date).getMonth() === month && new Date(a.date).getFullYear() === year);
    const latePenalty = attendance.filter(a => a.type === 'late').length * 0.05;
    if (latePenalty > 0) {
        total -= latePenalty;
        components.push({ label: `Опоздания`, value: -latePenalty, type: 'penalty' });
    }

    total = Math.max(0.5, parseFloat(total.toFixed(2)));
    return { period, base: 1.0, total, components, calculatedAt: new Date().toISOString() };
};

const getUserPayslip = async (userId: string, year: number, month: number): Promise<PayslipData> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<PayslipData>(`/hr/payroll/${userId}/payslip`, { year, month });
    }
    await delay(400);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user || user.dailyRate === undefined) throw new Error("Missing data.");

    const lineItems: PayslipLineItem[] = [];
    const attendanceForMonth = (user.attendance || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getUTCFullYear() === year && entryDate.getUTCMonth() === month;
    });

    let workDays = 0;
    attendanceForMonth.forEach(e => { if (['work', 'late', 'trip'].includes(e.type)) workDays++; });
    const baseSalary = user.dailyRate * workDays;
    if (baseSalary > 0) lineItems.push({ type: 'base', description: `Оклад (${workDays} дн.)`, amount: baseSalary });

    const ktuData = await calculateUserKTU(userId);
    const tasks = mockKanbanTasks.filter(t => t.assigneeId === userId && t.status === KanbanTaskStatus.DONE);
    const taskBonus = tasks.reduce((sum, t) => sum + ((t.coefficient || calculateTaskCoefficient(t)) * BONUS_PER_COEFFICIENT_POINT), 0) * ktuData.total;
    if (taskBonus > 0) lineItems.push({ type: 'task_bonus', description: `Сделка x КТУ ${ktuData.total}`, amount: Math.round(taskBonus) });

    return { year, month, lineItems, total: lineItems.reduce((sum, i) => sum + i.amount, 0) };
};

const getDailyStats = async (userId: string): Promise<DailyStats> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<DailyStats>(`/hr/payroll/${userId}/daily-stats`);
    }
    await delay(200);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = user.attendance?.find(a => a.date === todayStr);
    return {
        date: todayStr, shiftStatus: todayAttendance ? (todayAttendance.checkOutTime ? 'closed' : 'active') : 'not_started',
        checkInTime: todayAttendance?.checkInTime, hoursWorked: 8, earnedTotal: 2500, earnedBase: 2000, earnedBonus: 500,
        currentKTU: 1.0, completedTasksCount: 2
    };
};

const getCollectiveHonorBoard = async (): Promise<HonorBoardEntry[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<HonorBoardEntry[]>('/hr/honor-board');
    }
    await delay(600);
    // Simulating calculation for top contributors
    const activeUsers = MOCK_USERS.filter(u => u.status === 'active');
    const board: HonorBoardEntry[] = await Promise.all(activeUsers.map(async (u) => {
        const ktu = await calculateUserKTU(u.id);
        const tasks = mockKanbanTasks.filter(t => t.assigneeId === u.id && t.status === KanbanTaskStatus.DONE).length;
        return {
            userId: u.id,
            userName: u.name || u.email,
            ktu: ktu.total,
            achievementsCount: u.achievements?.length || 0,
            tasksCompleted: tasks,
            avatarLetter: (u.name || u.email).charAt(0).toUpperCase()
        };
    }));
    return board.sort((a, b) => b.ktu - a.ktu || b.tasksCompleted - a.tasksCompleted).slice(0, 5);
};

export const userService = {
    getUsersWithHierarchyDetails,
    getUsersForAssignee,
    getAvailableFunctionalRoles,
    updateUserProfile,
    startWorkShift,
    endWorkShift,
    getUserPayslip,
    calculateUserKTU,
    getDailyStats,
    getCollectiveHonorBoard
};
