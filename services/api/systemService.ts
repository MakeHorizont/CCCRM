
import { SystemEvent, SystemEventType } from '../../types';
import { mockSystemEvents } from '../mockData/systemEvents';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getSystemEvents = async (filters?: { type?: SystemEventType, userId?: string, startDate?: string, endDate?: string }): Promise<SystemEvent[]> => {
    // STRANGLER PATTERN: Check if we should use real API
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.SYSTEM) {
        try {
            return await apiClient.get<SystemEvent[]>('/system/events', filters);
        } catch (error) {
            console.error("Failed to fetch from real API, falling back to mock (dev mode only)", error);
            // Fallback allowed only during dev transition
        }
    }

    await delay(300);
    let events = deepCopy(mockSystemEvents);

    if (filters) {
        if (filters.type) events = events.filter(e => e.type === filters.type);
        if (filters.userId) events = events.filter(e => e.userId === filters.userId);
        if (filters.startDate) events = events.filter(e => new Date(e.timestamp) >= new Date(filters.startDate!));
        if (filters.endDate) events = events.filter(e => new Date(e.timestamp) <= new Date(filters.endDate!));
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const logEvent = async (
    action: string,
    details: string,
    type: SystemEventType,
    entityId?: string,
    entityType?: string
): Promise<void> => {
    const currentUser = await authService.getCurrentUser();

    // STRANGLER PATTERN: Write to real API
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.SYSTEM) {
        try {
            // Fire and forget to not block UI, or await if critical
            apiClient.post('/system/events', {
                action,
                details,
                type,
                entityId,
                entityType,
                userId: currentUser?.id // Server should verify token, but we send context
            }).catch(e => console.error("Audit Log API Error", e));
            
            // We also update local mock for immediate UI feedback in hybrid mode
        } catch (error) {
             console.error("Failed to log to real API", error);
        }
    }
    
    // Update Local State (Mock)
    const newEvent: SystemEvent = {
        id: generateId('evt'),
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Система',
        type,
        action,
        details,
        entityId,
        entityType
    };
    
    mockSystemEvents.unshift(newEvent);
    console.log(`[AUDIT LOG] ${action}: ${details}`);
};

export const systemService = {
    getSystemEvents,
    logEvent
};
