
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';
import { delay } from './utils';
import { mockContacts } from '../mockData/contacts';
import { mockOrders } from '../mockData/orders';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { mockKnowledgeBaseItems } from '../mockData/knowledgeBaseItems';
import { ROUTE_PATHS } from '../../constants';

export interface SearchResult {
    id: string;
    type: 'contact' | 'order' | 'product' | 'task' | 'wiki';
    title: string;
    subtitle?: string;
    link: string;
}

const globalSearch = async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];

    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.SYSTEM) {
        return apiClient.get<SearchResult[]>('/search', { q: query });
    }

    await delay(300); // Simulate network latency
    const term = query.toLowerCase();
    const results: SearchResult[] = [];
    const LIMIT = 15;

    // 1. Search Contacts
    mockContacts.forEach(c => {
        if (c.name.toLowerCase().includes(term) || c.companyName?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term)) {
            results.push({
                id: c.id,
                type: 'contact',
                title: c.name,
                subtitle: c.companyName || c.email,
                link: `${ROUTE_PATHS.CONTACTS}/${c.id}`
            });
        }
    });

    // 2. Search Orders
    mockOrders.forEach(o => {
        if (o.id.toLowerCase().includes(term) || o.customerName.toLowerCase().includes(term)) {
            results.push({
                id: o.id,
                type: 'order',
                title: `Заказ #${o.id}`,
                subtitle: `${o.customerName} | ${o.status}`,
                link: `${ROUTE_PATHS.ORDERS}/${o.id}`
            });
        }
    });

    // 3. Search Warehouse
    mockWarehouseItems.forEach(w => {
        if (w.name.toLowerCase().includes(term) || w.sku.toLowerCase().includes(term)) {
            results.push({
                id: w.id,
                type: 'product',
                title: w.name,
                subtitle: `SKU: ${w.sku} | Остаток: ${w.quantity}`,
                link: `${ROUTE_PATHS.WAREHOUSE}/${w.id}`
            });
        }
    });

    // 4. Search Tasks
    mockKanbanTasks.forEach(t => {
        if (t.title.toLowerCase().includes(term)) {
            results.push({
                id: t.id,
                type: 'task',
                title: t.title,
                subtitle: t.status,
                link: `${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${t.id}`
            });
        }
    });
    
    // 5. Search Knowledge Base
    mockKnowledgeBaseItems.forEach(k => {
        if (k.name.toLowerCase().includes(term) || k.tags?.some(tag => tag.toLowerCase().includes(term))) {
             // If it's a file, we might need to find its folder structure, but for now link to KB root or specific logic
             // Since KB page doesn't support deep linking to file easily without folder context in URL in current impl,
             // we will just point to KB page. Ideally, KB page should handle ?fileId=...
             results.push({
                id: k.id,
                type: 'wiki',
                title: k.name,
                subtitle: k.itemType === 'folder' ? 'Папка' : 'Файл',
                link: `${ROUTE_PATHS.KNOWLEDGE_BASE}`, // Limitation of current router for KB
             });
        }
    });

    return results.slice(0, LIMIT);
};

export const searchService = {
    globalSearch,
};
