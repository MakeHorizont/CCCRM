// services/api/utils.ts

import { Bonus, Notification, WarehouseItem, HouseholdItem, User } from '../../types';
import { MOCK_USERS } from '../mockData/users';
import { mockNotifications } from '../mockData/notifications';
import { ROUTE_PATHS } from '../../constants';
import { generateId } from '../../utils/idGenerators';

export let mockBonuses: Bonus[] = [];

// --- Event Manager ---
export const eventManager = {
  subscribers: {} as Record<string, ((data: any) => void)[]>,
  subscribe(eventName: string, callback: (data: any) => void) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = [];
    }
    this.subscribers[eventName].push(callback);
  },
  dispatch(eventName: string, data: any) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in event handler for ${eventName}:`, e);
        }
      });
    }
  }
};

// --- Low Stock Notification Listener ---
eventManager.subscribe('stock.below_threshold', (data: { item: WarehouseItem | HouseholdItem, itemType: 'warehouse' | 'household' }) => {
    const managersAndCEO = MOCK_USERS.filter(u => u.role === 'ceo' || u.role === 'manager');
    const link = data.itemType === 'warehouse' ? ROUTE_PATHS.WAREHOUSE : ROUTE_PATHS.HOUSEHOLD_ACCOUNTING;
    
    managersAndCEO.forEach(manager => {
        const existingUnreadNotification = mockNotifications.find(n => 
            n.sourceEntity.type === 'stock' && 
            n.sourceEntity.id === data.item.id &&
            n.status === 'unread' &&
            n.userId === manager.id
        );

        if (!existingUnreadNotification) {
            const unit = 'unit' in data.item ? data.item.unit : 'шт.';
            createSystemNotification(
                manager.id,
                'warning',
                `Низкий остаток: "${data.item.name}" (осталось: ${data.item.quantity} ${unit})`,
                link,
                { type: 'stock', id: data.item.id }
            );
        }
    });
});

// Function to simulate a network delay
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Simple deep copy for mock data to avoid mutation issues
export const deepCopy = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

type SortConfig<T> = { key: keyof T, direction: 'asc' | 'desc' } | null;

export const createSystemNotification = (userId: string, type: Notification['type'], message: string, link: string, sourceEntity: Notification['sourceEntity']): Notification => {
    const newNotification: Notification = {
        id: generateId('notif'),
        userId,
        type,
        status: 'unread',
        message,
        link,
        createdAt: new Date().toISOString(),
        sourceEntity
    };
    mockNotifications.unshift(newNotification);
    // Optionally trigger Telegram notification
    // if(type === 'bonus' || type === 'critical') {
    //   sendToTelegramGateway(newNotification);
    // }
    return newNotification;
};

// --- Telegram Gateway Simulation ---
export const sendToTelegramGateway = async (notification: Notification): Promise<void> => {
    console.log(`[TELEGRAM GATEWAY] Forwarding notification:
  - UserID: ${notification.userId}
  - Type: ${notification.type}
  - Message: ${notification.message}`);
    await delay(100); 
    return;
};


export const sortData = <T,>(data: T[], sortConfig: SortConfig<T>): T[] => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    return [...data].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        return 0;
    });
};
