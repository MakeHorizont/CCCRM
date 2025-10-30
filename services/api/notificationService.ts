// services/api/notificationService.ts
import { Notification } from '../../types';
import { mockNotifications } from '../mockData/notifications';
import { delay, deepCopy } from './utils';

const getNotifications = async (userId: string): Promise<Notification[]> => {
    await delay(200);
    return deepCopy(mockNotifications.filter(n => n.userId === userId));
};

const markNotificationAsRead = async (notificationId: string): Promise<Notification> => {
    await delay(100);
    const index = mockNotifications.findIndex(n => n.id === notificationId);
    if (index === -1) throw new Error("Notification not found");
    mockNotifications[index].status = 'read';
    return deepCopy(mockNotifications[index]);
};

const markAllNotificationsAsRead = async (userId: string): Promise<{ success: true }> => {
    await delay(300);
    mockNotifications.forEach(n => {
        if (n.userId === userId && n.status === 'unread') {
            n.status = 'read';
        }
    });
    return { success: true };
};

export const notificationService = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};
