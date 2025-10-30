import { RotationScheduleEntry } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockRotationSchedules: RotationScheduleEntry[] = [
    {
        id: generateId('rot'),
        userId: 'user2', // Кораблева Ульяна (Руководитель производства)
        area: 'Производство',
        startDate: '2024-08-01',
        endDate: '2024-08-07',
    },
    {
        id: generateId('rot'),
        userId: 'user2',
        area: 'Коммуникации',
        startDate: '2024-08-08',
        endDate: '2024-08-14',
    },
    {
        id: generateId('rot'),
        userId: 'user3', // Сергей Смирнов (Технолог)
        area: 'Производство',
        startDate: '2024-08-12',
        endDate: '2024-08-25',
    },
    {
        id: generateId('rot'),
        userId: 'user4', // Анна Кузнецова (Маркетолог)
        area: 'Коммуникации',
        startDate: '2024-08-01',
        endDate: '2024-08-11',
    },
     {
        id: generateId('rot'),
        userId: 'user4',
        area: 'Стратегия',
        startDate: '2024-08-12',
        endDate: '2024-08-18',
    },
    {
        id: generateId('rot'),
        userId: 'user1', // CEO
        area: 'Администрирование',
        startDate: '2024-08-19',
        endDate: '2024-08-25',
    },
    // Unassigned slots for self-assignment
    {
        id: generateId('rot'),
        userId: null,
        area: 'Производство',
        startDate: '2024-08-15',
        endDate: '2024-08-21',
    },
    {
        id: generateId('rot'),
        userId: null,
        area: 'Стратегия',
        startDate: '2024-08-22',
        endDate: '2024-08-28',
    },
];
