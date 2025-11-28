
// services/api/warehouseService.ts
import { WarehouseItem, WarehouseItemHistoryEntry, WarehouseItemIncident, FileAttachment, DiscussionTopic } from '../../types';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockStorageLocations } from '../mockData/storageLocations';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { mockDiscussions } from '../mockData/discussions';
import { MOCK_USERS } from '../mockData/users';
import { delay, deepCopy, eventManager } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getWarehouseItems = async (filters: { searchTerm?: string; viewMode?: 'active' | 'archived' | 'all' }): Promise<WarehouseItem[]> => {
    // STRANGLER PATTERN: Check Real API
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        try {
            // Backend is expected to return items with joined locationName and incident counts
            return await apiClient.get<WarehouseItem[]>('/warehouse/items', {
                search: filters.searchTerm,
                archived: filters.viewMode === 'archived',
                // 'all' viewMode logic might need specific backend handling or multiple requests if API is strict
            });
        } catch (error) {
            console.error("Failed to fetch warehouse items from API", error);
            // Fallback to mock if allowed or throw
        }
    }

    await delay(300);
    let items = deepCopy(mockWarehouseItems);
    if (filters.viewMode === 'archived') {
      items = items.filter(i => i.isArchived);
    } else if (filters.viewMode === 'active' || !filters.viewMode) {
      items = items.filter(i => !i.isArchived);
    }
    // if viewMode is 'all', no filtering is applied
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term));
    }
    return items.map(item => ({
        ...item,
        locationName: mockStorageLocations.find(l => l.id === item.location)?.name || item.location,
        openIncidentsCount: mockWarehouseIncidents.filter(inc => inc.warehouseItemId === item.id && !inc.isResolved).length
    }));
};

const getWarehouseItemById = async (id: string): Promise<WarehouseItem | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        try {
            return await apiClient.get<WarehouseItem>(`/warehouse/items/${id}`);
        } catch (error) {
            console.error(`Failed to fetch warehouse item ${id}`, error);
        }
    }

    await delay(100);
    const item = mockWarehouseItems.find(i => i.id === id);
    if (!item) return null;
    
    const fullItem = deepCopy(item);
    fullItem.history = fullItem.history?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
    fullItem.openIncidentsCount = mockWarehouseIncidents.filter(inc => inc.warehouseItemId === item.id && !inc.isResolved).length;

    return fullItem;
};

const addWarehouseItem = async (itemData: Omit<WarehouseItem, 'id' | 'isArchived' | 'lastUpdated'| 'archivedAt' | 'history' | 'openIncidentsCount'>): Promise<WarehouseItem> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         return await apiClient.post<WarehouseItem>('/warehouse/items', itemData);
    }

    await delay(400);
    const newItem: WarehouseItem = {
        id: generateId('wh'),
        ...itemData,
        isArchived: false,
        lastUpdated: new Date().toISOString(),
        history: [{
            id: generateId('whh'),
            timestamp: new Date().toISOString(),
            userId: 'system',
            changeType: 'initial',
            quantityChange: itemData.quantity,
            newQuantity: itemData.quantity,
            reason: 'Создание товара',
        }],
        openIncidentsCount: 0,
    };
    mockWarehouseItems.push(newItem);
    return deepCopy(newItem);
};

const updateWarehouseItem = async (itemData: WarehouseItem): Promise<WarehouseItem> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         const response = await apiClient.patch<WarehouseItem>(`/warehouse/items/${itemData.id}`, itemData);
         // We might need to re-dispatch the low stock event here based on response, 
         // or assume the backend handles notifications (which is cleaner).
         // For hybrid compatibility, we check response:
         if (response.lowStockThreshold !== undefined && response.quantity <= response.lowStockThreshold) {
             eventManager.dispatch('stock.below_threshold', { item: response, itemType: 'warehouse' });
         }
         return response;
    }

    await delay(400);
    const index = mockWarehouseItems.findIndex(i => i.id === itemData.id);
    if (index === -1) throw new Error("Item not found");
    const updatedItem = { ...mockWarehouseItems[index], ...itemData, lastUpdated: new Date().toISOString() };
    mockWarehouseItems[index] = updatedItem;
    
    // Dispatch event if stock is low (Task 1.1 Trigger)
    if (updatedItem.lowStockThreshold !== undefined && updatedItem.quantity <= updatedItem.lowStockThreshold) {
        eventManager.dispatch('stock.below_threshold', { item: updatedItem, itemType: 'warehouse' });
    }
    
    return deepCopy(updatedItem);
};

const archiveWarehouseItem = async (id: string, archive: boolean): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         await apiClient.post(`/warehouse/items/${id}/archive`, { archive });
         return { success: true };
    }

    await delay(300);
    const index = mockWarehouseItems.findIndex(i => i.id === id);
    if (index === -1) throw new Error("Item not found");
    mockWarehouseItems[index].isArchived = archive;
    mockWarehouseItems[index].archivedAt = archive ? new Date().toISOString() : undefined;
    mockWarehouseItems[index].lastUpdated = new Date().toISOString();
    return { success: true };
};

const deleteWarehouseItem = async (id: string): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         await apiClient.delete(`/warehouse/items/${id}`);
         return { success: true };
    }

    await delay(500);
    const index = mockWarehouseItems.findIndex(i => i.id === id);
    if (index !== -1 && mockWarehouseItems[index].isArchived) {
        mockWarehouseItems.splice(index, 1);
        return { success: true };
    }
    if (index === -1) throw new Error("Item not found");
    throw new Error("Item must be archived before deletion");
};
    
const updateWarehouseItemQuantity = async (itemId: string, quantityChange: number, userId: string, reason: string): Promise<WarehouseItem> => {
    // This is a specialized operation, might map to a specific endpoint or generic update
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         // Option A: Use PATCH with business logic on backend (preferred)
         // Option B: Dedicated endpoint POST /warehouse/items/:id/adjust-stock
         const response = await apiClient.post<WarehouseItem>(`/warehouse/items/${itemId}/adjust-stock`, { quantityChange, reason, userId });
         
         if (response.lowStockThreshold !== undefined && response.quantity <= response.lowStockThreshold) {
            eventManager.dispatch('stock.below_threshold', { item: response, itemType: 'warehouse' });
         }
         return response;
    }

    await delay(400);
    const index = mockWarehouseItems.findIndex(i => i.id === itemId);
    if (index === -1) throw new Error("Item not found");

    const item = mockWarehouseItems[index];
    const newQuantity = item.quantity + quantityChange;
    const user = MOCK_USERS.find(u => u.id === userId);

    const historyEntry: WarehouseItemHistoryEntry = {
        id: generateId('whh'),
        timestamp: new Date().toISOString(),
        userId,
        userName: user?.name,
        changeType: quantityChange > 0 ? 'increment' : 'decrement',
        quantityChange,
        newQuantity,
        reason
    };
    
    item.quantity = newQuantity;
    item.lastUpdated = new Date().toISOString();
    if (!item.history) item.history = [];
    item.history.push(historyEntry);
    
    // Dispatch event if stock is low (Task 1.1 Trigger)
    if (item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
        eventManager.dispatch('stock.below_threshold', { item, itemType: 'warehouse' });
    }
    
    return deepCopy(item);
};

const getIncidentsForItem = async(itemId: string): Promise<WarehouseItemIncident[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        return await apiClient.get<WarehouseItemIncident[]>(`/warehouse/items/${itemId}/incidents`);
    }

    await delay(200);
    return deepCopy(mockWarehouseIncidents.filter(inc => inc.warehouseItemId === itemId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
};
    
const addIncident = async(incidentData: Omit<WarehouseItemIncident, 'id'|'timestamp'|'isResolved'|'userName'>, files?: File[]): Promise<WarehouseItemIncident> => {
     if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        // File upload would likely be multipart/form-data, handled separately or via pre-signed URLs.
        // For simplicity here, we assume file metadata is handled or ignored in MVP.
        return await apiClient.post<WarehouseItemIncident>('/warehouse/incidents', incidentData);
    }

    await delay(400);
    const user = MOCK_USERS.find(u => u.id === incidentData.userId);
     const attachments: FileAttachment[] = (files || []).map(file => ({
        id: generateId('file'),
        name: file.name,
        url: `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(file.name)}`, // Mock URL
        type: file.type,
        size: file.size,
        timestamp: new Date().toISOString(),
    }));
    const newIncident: WarehouseItemIncident = {
        ...incidentData,
        id: generateId('inc'),
        timestamp: new Date().toISOString(),
        userName: user?.name,
        isResolved: false,
        attachments,
    };
    mockWarehouseIncidents.push(newIncident);

    const itemIndex = mockWarehouseItems.findIndex(i => i.id === incidentData.warehouseItemId);
    if(itemIndex > -1) {
        mockWarehouseItems[itemIndex].openIncidentsCount = (mockWarehouseItems[itemIndex].openIncidentsCount || 0) + 1;
    }

    return deepCopy(newIncident);
};

const resolveIncident = async(incidentId: string, userId: string, notes?: string): Promise<WarehouseItemIncident> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        return await apiClient.post<WarehouseItemIncident>(`/warehouse/incidents/${incidentId}/resolve`, { userId, notes });
    }

    await delay(400);
    const index = mockWarehouseIncidents.findIndex(i => i.id === incidentId);
    if (index === -1) throw new Error("Incident not found");
    
    const user = MOCK_USERS.find(u => u.id === userId);
    mockWarehouseIncidents[index].isResolved = true;
    mockWarehouseIncidents[index].resolvedAt = new Date().toISOString();
    mockWarehouseIncidents[index].resolvedBy = { userId, userName: user?.name };
    mockWarehouseIncidents[index].resolverNotes = notes;

    const itemIndex = mockWarehouseItems.findIndex(i => i.id === mockWarehouseIncidents[index].warehouseItemId);
    if(itemIndex > -1) {
         mockWarehouseItems[itemIndex].openIncidentsCount = Math.max(0, (mockWarehouseItems[itemIndex].openIncidentsCount || 1) - 1);
    }

    return deepCopy(mockWarehouseIncidents[index]);
};

const createDiscussionFromWarehouseIncident = async (incident: WarehouseItemIncident, item: WarehouseItem): Promise<DiscussionTopic> => {
    // This logic sits between domains (Warehouse -> Discussion). 
    // It should likely be a Discussion Service call initiated by frontend, or a backend orchestration.
    // Since it creates a Discussion, it should ideally belong to discussionService or be a composite.
    // Keeping it here for now but using discussionService logic (via Strangler if discussion module is ready) or mock.
    
    // Assuming Discussion module is NOT yet real API.
    await delay(500);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    
    const title = `Инцидент: ${incident.type} - ${item.name} (SKU: ${item.sku})`;
    const description = `### Детали инцидента
**Товар:** ${item.name}
**ID Товара:** ${item.id}
**Тип инцидента:** ${incident.type}
**Дата:** ${new Date(incident.timestamp).toLocaleString()}
**Автор:** ${incident.userName}

**Описание проблемы:**
${incident.description}

### Предложение к обсуждению:
Предлагается коллективно проанализировать причины данного инцидента и разработать меры для предотвращения подобных ситуаций в будущем.`;
    
    const newTopic: DiscussionTopic = {
      id: generateId('topic'),
      type: 'general',
      title,
      description,
      authorId: user.id,
      authorName: user.name,
      status: 'open',
      tags: ['склад', 'инцидент', incident.type],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
      postCount: 0,
      posts: [],
      relatedEntity: {
        type: 'warehouse_item',
        itemId: item.id,
        itemName: item.name,
        incidentId: incident.id
      }
    };
    
    mockDiscussions.unshift(newTopic);
    
    const incidentIndex = mockWarehouseIncidents.findIndex(i => i.id === incident.id);
    if(incidentIndex > -1){
      mockWarehouseIncidents[incidentIndex].relatedDiscussionId = newTopic.id;
    }
    
    return deepCopy(newTopic);
};

export const warehouseService = {
    getWarehouseItems,
    getWarehouseItemById,
    addWarehouseItem,
    updateWarehouseItem,
    archiveWarehouseItem,
    deleteWarehouseItem,
    updateWarehouseItemQuantity,
    getIncidentsForItem,
    addIncident,
    resolveIncident,
    createDiscussionFromWarehouseIncident,
};
