import { StorageLocation } from '../../types';
import { mockStorageTags } from './storageTags'; // Import if tags are predefined

export let mockStorageLocations: StorageLocation[] = [
    { id: 'loc1', name: 'Морозильный шкаф', description: 'Основной холодильник для готового темпе.', tags: [mockStorageTags[0]], isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), equipmentId: 'equip-7' },
    { id: 'loc2', name: 'Склад Сырья (Сухой)', description: 'Основное место хранения сухого сырья.', tags: [mockStorageTags[1]], isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    // Added for warehouse item data consistency
    { id: 'loc3', name: 'Склад Чипсов (Готовая продукция)', description: 'Место хранения готовых темпе-чипсов.', tags: [mockStorageTags[1]], isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'loc4', name: 'Резервный холодильник', description: 'Холодильник для излишков или спец. продукции.', tags: [mockStorageTags[0]], isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), equipmentId: 'equip-13' },
    { id: 'loc5', name: 'Морозильный ларь', description: 'Ларь для глубокой заморозки.', tags: [mockStorageTags[0]], isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), equipmentId: 'equip-8' },
];