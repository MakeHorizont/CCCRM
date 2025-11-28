
import { SystemEvent } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockSystemEvents: SystemEvent[] = [
    {
        id: generateId('evt'),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        userId: 'user1',
        userName: 'Левченко Роман',
        type: 'finance',
        action: 'Изменение настроек Фонда',
        details: 'Процент отчислений изменен с 15% на 20% по решению Совета.',
        entityId: 'fund-settings',
        entityType: 'CollectiveFund'
    },
    {
        id: generateId('evt'),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        userId: 'user2',
        userName: 'Кораблева Ульяна',
        type: 'production',
        action: 'Списание брака',
        details: 'Списано 5кг сои. Причина: нарушение температурного режима.',
        entityId: 'PO-001',
        entityType: 'ProductionOrder'
    },
    {
        id: generateId('evt'),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        userId: 'system',
        userName: 'Система',
        type: 'auth',
        action: 'Автоматический бэкап',
        details: 'Резервное копирование базы данных успешно завершено.',
    }
];
