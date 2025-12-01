
// services/api/userService.ts
import { User, PayslipData, PayslipLineItem, KanbanTaskStatus, AttendanceEntry, KTUDetails, KTUComponent, DailyStats } from '../../types';
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
         // Backend likely filters this based on active status
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
    
    // --- AUDIT LOGGING START ---
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
    // Compare functional roles
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
    // --- AUDIT LOGGING END ---

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
        user.attendance.push({ 
            date: today, 
            type: type,
            checkInTime: now.toISOString() 
        });
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

const getUserPayslip = async (userId: string, year: number, month: number): Promise<PayslipData> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<PayslipData>(`/hr/payroll/${userId}/payslip`, { year, month });
    }

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
    
    // KTU Calculation for Bonus
    const ktuData = await calculateUserKTU(userId); 
    const ktuMultiplier = ktuData.total;
    
    const rawTaskBonus = completedTasksInMonth.reduce((sum, task) => sum + ((task.coefficient || calculateTaskCoefficient(task)) * BONUS_PER_COEFFICIENT_POINT), 0);
    const finalTaskBonus = Math.round(rawTaskBonus * ktuMultiplier);

    if (finalTaskBonus > 0) {
        lineItems.push({ 
            type: 'task_bonus', 
            description: `Сдельная часть (Задачи: ${completedTasksInMonth.length} шт.) x КТУ ${ktuMultiplier}`, 
            amount: finalTaskBonus 
        });
    }
    
    const total = lineItems.reduce((sum, item) => sum + item.amount, 0);

    return { year, month, lineItems, total };
};

const calculateUserKTU = async (userId: string): Promise<KTUDetails> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<KTUDetails>(`/hr/payroll/${userId}/ktu`);
    }

    await delay(500);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const components: KTUComponent[] = [];
    let total = 1.0; // Base

    components.push({ label: 'Базовая ставка', value: 1.0, type: 'base', description: 'Гарантированный минимум за выход на работу' });

    const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    // 1. Production Output
    const productionOrders = mockProductionOrders.filter(po => 
        !po.isArchived && 
        po.assignedToId === userId && 
        po.actualEndDate &&
        new Date(po.actualEndDate) >= firstDayOfMonth &&
        new Date(po.actualEndDate) <= lastDayOfMonth
    );
    const productionScore = productionOrders.length * 0.05;
    if (productionScore > 0) {
        total += productionScore;
        components.push({ label: `Выполнение ПЗ (${productionOrders.length})`, value: productionScore, type: 'bonus', description: 'За успешное закрытие производственных заданий' });
    }

    // 2. Kanban Tasks
    const tasks = mockKanbanTasks.filter(t => 
        t.assigneeId === userId && 
        t.status === KanbanTaskStatus.DONE && 
        t.movedToDoneAt && 
        new Date(t.movedToDoneAt) >= firstDayOfMonth && 
        new Date(t.movedToDoneAt) <= lastDayOfMonth
    );
    let taskScore = 0;
    tasks.forEach(t => {
        const diff = t.complexity === 'high' ? 0.05 : (t.complexity === 'medium' ? 0.02 : 0.01);
        taskScore += diff;
    });
    if (taskScore > 0) {
        taskScore = Math.min(taskScore, 0.5);
        total += taskScore;
        components.push({ label: `Задачи Kanban (${tasks.length})`, value: parseFloat(taskScore.toFixed(2)), type: 'bonus', description: 'Бонус за сложность выполненных задач' });
    }

    // 3. Discipline
    const attendance = user.attendance || [];
    const currentMonthAttendance = attendance.filter(a => new Date(a.date).getMonth() === month && new Date(a.date).getFullYear() === year);
    
    let lateCount = 0;
    let unexcusedCount = 0;
    
    currentMonthAttendance.forEach(a => {
        if (a.type === 'late') lateCount++;
        if (a.type === 'unexcused_absence') unexcusedCount++;
    });

    if (lateCount > 0) {
        const penalty = lateCount * 0.05;
        total -= penalty;
        components.push({ label: `Опоздания (${lateCount})`, value: -penalty, type: 'penalty', description: 'Снижение за нарушение дисциплины' });
    }
    if (unexcusedCount > 0) {
        const penalty = unexcusedCount * 0.2;
        total -= penalty;
        components.push({ label: `Прогулы (${unexcusedCount})`, value: -penalty, type: 'penalty', description: 'Серьезное нарушение графика' });
    }

    // 4. Quality
    const incidents = mockWarehouseIncidents.filter(i => 
        i.userId === userId && 
        (i.type === 'damage' || i.type === 'defect') &&
        new Date(i.timestamp) >= firstDayOfMonth &&
        new Date(i.timestamp) <= lastDayOfMonth
    );
    
    if (incidents.length > 0) {
        const penalty = incidents.length * 0.1;
        total -= penalty;
        components.push({ label: `Инциденты качества (${incidents.length})`, value: -penalty, type: 'penalty', description: 'Брак или порча имущества' });
    }

    total = Math.max(0.5, parseFloat(total.toFixed(2)));

    const result: KTUDetails = {
        period,
        base: 1.0,
        total,
        components,
        calculatedAt: new Date().toISOString()
    };

    // Save to mock user if mocking
    if (!API_CONFIG.USE_REAL_API) {
        const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            MOCK_USERS[userIndex].currentMonthKTU = result;
            const history = MOCK_USERS[userIndex].ktuHistory || [];
            const existingHistoryIndex = history.findIndex(h => h.period === period);
            if (existingHistoryIndex > -1) {
                history[existingHistoryIndex] = result;
            } else {
                history.push(result);
            }
            MOCK_USERS[userIndex].ktuHistory = history;
            authService.updateMockUser(MOCK_USERS[userIndex]);
        }
    }

    return result;
};

const getDailyStats = async (userId: string): Promise<DailyStats> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.HR) {
        return apiClient.get<DailyStats>(`/hr/payroll/${userId}/daily-stats`);
    }

    await delay(200);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayAttendance = user.attendance?.find(a => a.date === todayStr);
    
    let hoursWorked = 0;
    let shiftStatus: DailyStats['shiftStatus'] = 'not_started';
    
    if (todayAttendance) {
        if (todayAttendance.checkOutTime) {
            shiftStatus = 'closed';
            const start = new Date(todayAttendance.checkInTime || todayAttendance.date);
            const end = new Date(todayAttendance.checkOutTime);
            hoursWorked = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
        } else if (todayAttendance.checkInTime) {
            shiftStatus = 'active';
            const start = new Date(todayAttendance.checkInTime);
            hoursWorked = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
        }
    }

    const hourlyRate = (user.dailyRate || 0) / 8;
    const earnedBase = Math.min(hoursWorked, 12) * hourlyRate; 

    // Bonus calculation for today
    const todayTasks = mockKanbanTasks.filter(t => 
        t.status === KanbanTaskStatus.DONE && 
        t.assigneeId === userId && 
        t.movedToDoneAt && 
        t.movedToDoneAt.startsWith(todayStr)
    );
    
    let currentKTU = 1.0;
    if (todayAttendance?.type === 'late') currentKTU -= 0.1;
    
    const rawBonus = todayTasks.reduce((sum, t) => sum + ((t.coefficient || calculateTaskCoefficient(t)) * BONUS_PER_COEFFICIENT_POINT), 0);
    const earnedBonus = rawBonus * currentKTU;

    return {
        date: todayStr,
        shiftStatus,
        checkInTime: todayAttendance?.checkInTime,
        hoursWorked,
        earnedTotal: Math.round(earnedBase + earnedBonus),
        earnedBase: Math.round(earnedBase),
        earnedBonus: Math.round(earnedBonus),
        currentKTU,
        completedTasksCount: todayTasks.length,
    };
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
};
