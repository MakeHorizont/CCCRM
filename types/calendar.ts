
export type CalendarEventType = 'production' | 'sales' | 'maintenance' | 'task' | 'rotation' | 'meeting';

export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO date YYYY-MM-DD
    type: CalendarEventType;
    link: string;
    description?: string;
    status?: string; // e.g., 'pending', 'done', 'urgent'
    assigneeName?: string;
}
