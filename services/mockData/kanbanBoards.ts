import { KanbanBoard } from '../../types';

export let mockKanbanBoards: KanbanBoard[] = [
    { id: 'board-default', name: 'Общая доска', description: 'Задачи для всей команды', ownerId: 'user1', accessRules: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isArchived: false },
    { id: 'board-marketing', name: 'Маркетинг', description: 'Задачи отдела маркетинга', ownerId: 'user1', accessRules: [{entityId: 'Маркетолог', entityType: 'role'}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isArchived: false },
    { id: 'board-dev', name: 'Разработка Продукта', ownerId: 'user2', accessRules: [{entityId: 'user3', entityType: 'user'}], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isArchived: false },
];
