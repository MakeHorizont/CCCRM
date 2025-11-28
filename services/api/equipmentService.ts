
// services/api/equipmentService.ts
import { EquipmentItem, EquipmentStatus, StorageLocation } from '../../types';
import { mockEquipment } from '../mockData/equipment';
import { mockStorageLocations } from '../mockData/storageLocations'; // Import mock data directly
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getEquipmentItems = async (filters: { searchTerm?: string, viewMode?: 'active' | 'archived' | 'all' }): Promise<EquipmentItem[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) { // Assuming equipment is part of warehouse module context or has its own
         try {
            return await apiClient.get<EquipmentItem[]>('/equipment', {
                search: filters.searchTerm,
                viewMode: filters.viewMode
            });
         } catch (error) {
             console.error("Failed to fetch equipment from API", error);
         }
    }

    await delay(300);
    let items = deepCopy(mockEquipment);
    if (filters.viewMode === 'archived') {
        items = items.filter(e => e.isArchived);
    } else if (filters.viewMode === 'active') {
        items = items.filter(e => !e.isArchived);
    }
    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        items = items.filter(e => e.name.toLowerCase().includes(term) || e.category.toLowerCase().includes(term) || e.description?.toLowerCase().includes(term));
    }
    return items;
};

const addEquipmentItem = async (data: Omit<EquipmentItem, 'id' | 'isArchived' | 'createdAt' | 'updatedAt'>): Promise<EquipmentItem> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        return await apiClient.post<EquipmentItem>('/equipment', data);
    }

    await delay(400);
    const newItem: EquipmentItem = {
        ...data,
        id: generateId('equip'),
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'operational',
    };
    mockEquipment.push(newItem);

    if (newItem.isStorageLocation) {
        const newStorage: StorageLocation = {
            id: generateId('loc'),
            name: newItem.name,
            description: `Автоматически создано из оборудования: ${newItem.name}`,
            tags: [],
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            equipmentId: newItem.id,
        };
        mockStorageLocations.push(newStorage);
    }

    return deepCopy(newItem);
};

const updateEquipmentItem = async (data: EquipmentItem): Promise<EquipmentItem> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
        return await apiClient.patch<EquipmentItem>(`/equipment/${data.id}`, data);
    }

    await delay(400);
    const index = mockEquipment.findIndex(e => e.id === data.id);
    if (index === -1) throw new Error("Equipment not found");
    
    const originalItem = mockEquipment[index];
    const updatedItem = { ...originalItem, ...data, updatedAt: new Date().toISOString() };
    mockEquipment[index] = updatedItem;

    const existingStorageIndex = mockStorageLocations.findIndex(loc => loc.equipmentId === updatedItem.id);

    if (updatedItem.isStorageLocation) {
        if (existingStorageIndex !== -1) {
            // Update existing storage
            mockStorageLocations[existingStorageIndex].name = updatedItem.name;
            mockStorageLocations[existingStorageIndex].description = updatedItem.description || `Автоматически создано из оборудования: ${updatedItem.name}`;
            mockStorageLocations[existingStorageIndex].isArchived = updatedItem.isArchived;
            mockStorageLocations[existingStorageIndex].updatedAt = new Date().toISOString();
        } else {
            // Create new storage
            const newStorage: StorageLocation = {
                id: generateId('loc'),
                name: updatedItem.name,
                description: `Автоматически создано из оборудования: ${updatedItem.name}`,
                tags: [],
                isArchived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                equipmentId: updatedItem.id,
            };
            mockStorageLocations.push(newStorage);
        }
    } else {
        // If it's no longer a storage, archive the existing one
        if (existingStorageIndex !== -1) {
            mockStorageLocations[existingStorageIndex].isArchived = true;
            mockStorageLocations[existingStorageIndex].archivedAt = new Date().toISOString();
        }
    }

    return deepCopy(mockEquipment[index]);
};

const duplicateEquipmentItem = async (id: string): Promise<EquipmentItem> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         return await apiClient.post<EquipmentItem>(`/equipment/${id}/duplicate`, {});
    }

    await delay(400);
    const original = mockEquipment.find(e => e.id === id);
    if (!original) throw new Error("Equipment to duplicate not found");

    const newName = `${original.name} (Копия)`;
    const newItemData: Omit<EquipmentItem, 'id' | 'isArchived' | 'createdAt' | 'updatedAt'> = {
        ...deepCopy(original),
        name: newName,
        status: 'operational',
        currentProductionOrderId: null,
        isStorageLocation: false, // Duplicates are not storages by default
    };
    // The add function will handle creating a new ID and timestamps
    return addEquipmentItem(newItemData);
};

const archiveEquipmentItem = async (id: string, archive: boolean): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         await apiClient.post(`/equipment/${id}/archive`, { archive });
         return { success: true };
    }

    await delay(300);
    const index = mockEquipment.findIndex(e => e.id === id);
    if (index === -1) throw new Error("Equipment not found");
    mockEquipment[index].isArchived = archive;
    mockEquipment[index].archivedAt = archive ? new Date().toISOString() : undefined;
    
    // Also archive the corresponding storage location
    const storageIndex = mockStorageLocations.findIndex(loc => loc.equipmentId === id);
    if (storageIndex !== -1) {
        mockStorageLocations[storageIndex].isArchived = archive;
        mockStorageLocations[storageIndex].archivedAt = archive ? new Date().toISOString() : undefined;
    }

    return { success: true };
};

const deleteEquipmentItem = async (id: string): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.WAREHOUSE) {
         await apiClient.delete(`/equipment/${id}`);
         return { success: true };
    }

    await delay(500);
    const index = mockEquipment.findIndex(e => e.id === id);
    if (index > -1 && mockEquipment[index].isArchived) {
        mockEquipment.splice(index, 1);
        // Also delete the corresponding storage location
        const storageIndex = mockStorageLocations.findIndex(loc => loc.equipmentId === id);
        if (storageIndex > -1) {
            mockStorageLocations.splice(storageIndex, 1);
        }
        return { success: true };
    }
    if (index === -1) throw new Error("Equipment not found");
    throw new Error("Equipment must be archived before deletion");
};

export const equipmentService = {
    getEquipmentItems,
    addEquipmentItem,
    updateEquipmentItem,
    duplicateEquipmentItem,
    archiveEquipmentItem,
    deleteEquipmentItem,
};
