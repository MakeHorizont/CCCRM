
import { RotationScheduleEntry } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockRotationSchedules: RotationScheduleEntry[] = [
    {
        id: generateId('rot'),
        userId: 'user2', // Кораблева Ульяна
        area: 'Производство',
        startDate: '2024-12-01',
        endDate: '2024-12-14',
    },
    {
        id: generateId('rot'),
        userId: 'user2',
        area: 'Коммуникации',
        startDate: '2024-12-15',
        endDate: '2024-12-31',
    },
    {
        id: generateId('rot'),
        userId: 'user3', // Сергей Смирнов
        area: 'Стратегия',
        startDate: '2024-12-05',
        endDate: '2024-12-20',
    },
    {
        id: generateId('rot'),
        userId: 'user1', // Левченко Роман
        area: 'Администрирование',
        startDate: '2024-12-01',
        endDate: '2024-12-31',
    },
    {
        id: generateId('rot'),
        userId: null,
        area: 'Производство',
        startDate: '2024-12-21',
        endDate: '2024-12-27',
    },
    {
        id: generateId('rot'),
        userId: null,
        area: 'Коммуникации',
        startDate: '2024-12-28',
        endDate: '2025-01-05',
    },
];
