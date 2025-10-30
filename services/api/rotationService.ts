// services/api/rotationService.ts
import { RotationScheduleEntry } from '../../types';
import { mockRotationSchedules } from '../mockData/rotationSchedules';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';

const getRotationSchedules = async (filters: { startDate: string, endDate: string }): Promise<RotationScheduleEntry[]> => {
    await delay(300);
    const start = new Date(filters.startDate).getTime();
    const end = new Date(filters.endDate).getTime();
    
    const filtered = mockRotationSchedules.filter(s => {
        const sStart = new Date(s.startDate).getTime();
        const sEnd = new Date(s.endDate).getTime();
        // Check for overlap
        return sStart <= end && sEnd >= start;
    });

    return deepCopy(filtered);
};

const addRotationSchedule = async (data: Omit<RotationScheduleEntry, 'id'>): Promise<RotationScheduleEntry> => {
    await delay(400);
    const newEntry: RotationScheduleEntry = {
        ...data,
        id: generateId('rot'),
    };
    mockRotationSchedules.push(newEntry);
    return deepCopy(newEntry);
};

const updateRotationSchedule = async (data: RotationScheduleEntry): Promise<RotationScheduleEntry> => {
    await delay(400);
    const index = mockRotationSchedules.findIndex(s => s.id === data.id);
    if (index === -1) throw new Error("Rotation entry not found");
    mockRotationSchedules[index] = { ...mockRotationSchedules[index], ...data };
    return deepCopy(mockRotationSchedules[index]);
};

const deleteRotationSchedule = async (id: string): Promise<{ success: true }> => {
    await delay(500);
    const index = mockRotationSchedules.findIndex(s => s.id === id);
    if (index > -1) {
        mockRotationSchedules.splice(index, 1);
        return { success: true };
    }
    throw new Error("Rotation entry not found");
};

const assignRotationToSelf = async (scheduleId: string, userId: string): Promise<RotationScheduleEntry> => {
    await delay(500);
    const index = mockRotationSchedules.findIndex(s => s.id === scheduleId);
    if (index === -1) throw new Error("Слот ротации не найден.");
    
    const schedule = mockRotationSchedules[index];
    if (schedule.userId) throw new Error("Этот слот уже занят.");

    // Anti-specialization rule: Check the last 2 completed rotations for the user.
    const userPastRotations = mockRotationSchedules
        .filter(s => s.userId === userId && new Date(s.endDate) < new Date())
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    
    const lastTwoRotations = userPastRotations.slice(0, 2);
    if (lastTwoRotations.some(r => r.area === schedule.area)) {
        throw new Error("Вы недавно работали в этой сфере. Для разностороннего развития выберите, пожалуйста, другую.");
    }

    schedule.userId = userId;
    return deepCopy(schedule);
};


export const rotationService = {
    getRotationSchedules,
    addRotationSchedule,
    updateRotationSchedule,
    deleteRotationSchedule,
    assignRotationToSelf,
};
