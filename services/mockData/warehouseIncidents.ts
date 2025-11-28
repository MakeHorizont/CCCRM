import { WarehouseItemIncident } from '../../types';

export let mockWarehouseIncidents: WarehouseItemIncident[] = [
    {
        id: 'inc-1',
        warehouseItemId: 'TMP001',
        timestamp: '2024-07-25T14:00:00Z',
        userId: 'user3',
        userName: 'Сергей Смирнов',
        type: 'damage',
        description: 'Последняя коробка промокла, 5 упаковок темпе повреждены водой.',
        attachments: [],
        isResolved: false,
    },
    {
        id: 'inc-2',
        warehouseItemId: 'TMP003',
        timestamp: '2024-07-24T10:00:00Z',
        userId: 'user2',
        userName: 'Кораблева Ульяна',
        type: 'defect',
        description: 'Партия от 23.07 имеет странный запах, возможно проблема с закваской.',
        isResolved: false,
    },
    {
        id: 'inc-3',
        warehouseItemId: 'TMP003',
        timestamp: '2024-07-22T18:00:00Z',
        userId: 'user2',
        userName: 'Кораблева Ульяна',
        type: 'shortage',
        description: 'По факту на полке 68 шт, в системе было 70. Недостача 2 шт.',
        isResolved: true,
        resolvedAt: '2024-07-23T09:00:00Z',
        resolvedBy: { userId: 'user1', userName: 'Левченко Роман'},
        resolverNotes: 'Списал недостачу, провел коррекцию остатков.'
    },
];
