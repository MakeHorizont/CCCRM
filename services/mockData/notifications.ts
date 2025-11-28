import { Notification } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockNotifications: Notification[] = [
  {
    id: generateId('notif'),
    userId: 'user3', // Sergey Smirnov
    type: 'info',
    status: 'unread',
    message: "Вам назначена новая задача: 'Разработать новый вкус темпе'",
    link: '/kanban/task/task1',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    sourceEntity: { type: 'task', id: 'task1' }
  },
  {
    id: generateId('notif'),
    userId: 'user1', // Roman
    type: 'info',
    status: 'unread',
    message: "Кораблева Ульяна ответила в обсуждении: 'Предложение по улучшению...'",
    link: '/discussions#topic-1', // Link to specific topic
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    sourceEntity: { type: 'discussion', id: 'topic-1' }
  },
   {
    id: generateId('notif'),
    userId: 'user2', // Ulyana
    type: 'info',
    status: 'read',
    message: "Обсуждение 'Стратегия маркетинга на Q4 2024' переведено в стадию голосования.",
    link: '/discussions#topic-2',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    sourceEntity: { type: 'discussion', id: 'topic-2' }
  },
  {
    id: generateId('notif'),
    userId: 'user1', // Roman
    type: 'warning',
    status: 'unread',
    message: "Критический остаток: 'Соевые бобы органические' (Осталось: 18 кг).",
    link: '/household-accounting',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    sourceEntity: { type: 'stock', id: 'HI001' }
  },
];