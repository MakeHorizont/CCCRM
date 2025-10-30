// services/api/storageService.ts
import { StorageLocation, StorageTag } from '../../types';
import { mockStorageLocations } from '../mockData/storageLocations';
import { mockStorageTags } from '../mockData/storageTags';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';

const getStorageLocations = async (filters: { searchTerm?: string; viewMode: 'active' | 'archived' | 'all' }): Promise<StorageLocation[]> => {
    await delay(200);
    let locations = deepCopy(mockStorageLocations);
    if(filters.viewMode === 'archived') {
        locations = locations.filter(loc => loc.isArchived);
    } else if (filters.viewMode === 'active') {
        locations = locations.filter(loc => !loc.isArchived);
    }

    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        locations = locations.filter(loc =>
            loc.name.toLowerCase().includes(term) ||
            (loc.description && loc.description.toLowerCase().includes(term)) ||
            loc.tags.some(tag => tag.name.toLowerCase().includes(term))
        );
    }

    return locations;
};

const addStorageLocation = async(locationData: Omit<StorageLocation, 'id'|'isArchived'|'archivedAt'|'createdAt'|'updatedAt'>): Promise<StorageLocation> => {
    await delay(300);
    const newLocation: StorageLocation = {
        ...locationData,
        id: generateId('loc'),
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    mockStorageLocations.push(newLocation);
    return deepCopy(newLocation);
};

const updateStorageLocation = async(locationData: StorageLocation): Promise<StorageLocation> => {
    await delay(300);
    const index = mockStorageLocations.findIndex(l => l.id === locationData.id);
    if(index === -1) throw new Error("Storage Location not found");
    mockStorageLocations[index] = {...mockStorageLocations[index], ...locationData, updatedAt: new Date().toISOString()};
    return deepCopy(mockStorageLocations[index]);
};

const archiveStorageLocation = async(id: string, archive: boolean): Promise<{success: true}> => {
    await delay(300);
    const index = mockStorageLocations.findIndex(l => l.id === id);
    if(index === -1) throw new Error("Storage Location not found");
    mockStorageLocations[index].isArchived = archive;
    mockStorageLocations[index].archivedAt = archive ? new Date().toISOString() : undefined;
    mockStorageLocations[index].updatedAt = new Date().toISOString();
    return {success: true};
};

const deleteStorageLocation = async(id: string): Promise<{success: true}> => {
    await delay(400);
    const index = mockStorageLocations.findIndex(l => l.id === id);
    if (index !== -1 && mockStorageLocations[index].isArchived) {
        mockStorageLocations.splice(index, 1);
        return {success: true};
    }
    if (index === -1) throw new Error("Storage Location not found");
    throw new Error("Storage Location must be archived before deletion");
};

const getAvailableStorageTags = async(): Promise<StorageTag[]> => {
    await delay(100);
    return deepCopy(mockStorageTags);
};

export const storageService = {
    getStorageLocations,
    addStorageLocation,
    updateStorageLocation,
    archiveStorageLocation,
    deleteStorageLocation,
    getAvailableStorageTags
};