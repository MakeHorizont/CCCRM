// services/api/householdService.ts
import { HouseholdItem, HouseholdCategory } from '../../types';
import { mockHouseholdItems } from '../mockData/householdItems';
import { delay, deepCopy, eventManager } from './utils';
import { generateId } from '../../utils/idGenerators';

const getHouseholdItems = async (filters: { viewMode?: 'active' | 'archived' | 'all', searchTerm?: string, category?: HouseholdCategory }): Promise<HouseholdItem[]> => {
    await delay(300);
    let items = deepCopy(mockHouseholdItems);
    if (filters.viewMode === 'archived') {
        items = items.filter(i => i.isArchived);
    } else if (filters.viewMode === 'active' || !filters.viewMode) { // Default to active if undefined
        items = items.filter(i => !i.isArchived);
    }
    // if viewMode is 'all', we don't filter by isArchived

    if (filters.category) {
        items = items.filter(i => i.category === filters.category);
    }
    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(term) || i.notes?.toLowerCase().includes(term));
    }
    return items.sort((a,b) => a.name.localeCompare(b.name));
};

const addHouseholdItem = async(itemData: Omit<HouseholdItem, 'id' | 'isArchived' | 'archivedAt' | 'lastUpdated'>): Promise<HouseholdItem> => {
    await delay(400);
    const newItem: HouseholdItem = {
        ...itemData,
        id: generateId('hh'),
        isArchived: false,
        lastUpdated: new Date().toISOString()
    };
    mockHouseholdItems.push(newItem);
    return deepCopy(newItem);
};

const updateHouseholdItem = async(itemData: HouseholdItem): Promise<HouseholdItem> => {
    await delay(400);
    const index = mockHouseholdItems.findIndex(i => i.id === itemData.id);
    if(index === -1) throw new Error("Household item not found");
    mockHouseholdItems[index] = {...mockHouseholdItems[index], ...itemData, lastUpdated: new Date().toISOString()};
    const updatedItem = mockHouseholdItems[index];

    if (updatedItem.lowStockThreshold !== undefined && updatedItem.quantity <= updatedItem.lowStockThreshold) {
        eventManager.dispatch('stock.below_threshold', { item: updatedItem, itemType: 'household' });
    }
    
    return deepCopy(updatedItem);
};

const archiveHouseholdItem = async(id: string, archive: boolean): Promise<{success:true}> => {
    await delay(300);
    const index = mockHouseholdItems.findIndex(i => i.id === id);
    if(index === -1) throw new Error("Household item not found");
    mockHouseholdItems[index].isArchived = archive;
    mockHouseholdItems[index].archivedAt = archive ? new Date().toISOString() : undefined;
    mockHouseholdItems[index].lastUpdated = new Date().toISOString();
    return {success: true};
};

const deleteHouseholdItem = async(id: string): Promise<{success:true}> => {
    await delay(500);
    const index = mockHouseholdItems.findIndex(i => i.id === id);
    if(index > -1 && mockHouseholdItems[index].isArchived) {
        mockHouseholdItems.splice(index, 1);
        return {success: true};
    }
    if(index === -1) throw new Error("Household item not found");
    throw new Error("Household item must be archived before deletion");
};

export const householdService = {
    getHouseholdItems,
    addHouseholdItem,
    updateHouseholdItem,
    archiveHouseholdItem,
    deleteHouseholdItem,
};