
import { WarehouseItem, TechnologyCard, EquipmentItem, HouseholdItem } from '../../types';
import { mockWarehouseItems } from './warehouseItems';
import { mockTechnologyCards } from './technologyCards';
import { mockEquipment } from './equipment';
import { mockHouseholdItems } from './householdItems';

// --- CCCRM TEMPEH PRODUCTION BACKUP ---
// Этот файл содержит снимок данных о производстве темпе.
// Используйте его для восстановления логики, если она будет утеряна в ходе реформ.

export const TEMPEH_BACKUP = {
    description: "Полный цикл производства темпе: от сырья до оборудования и готовой продукции.",
    timestamp: new Date().toISOString(),
    
    // 1. Готовая продукция (Склад)
    warehouseItems: [
        ...mockWarehouseItems.filter(i => i.sku.includes('TMP') || i.sku.includes('CHIP'))
    ] as WarehouseItem[],

    // 2. Технологические карты (Рецептуры)
    technologyCards: [
        ...mockTechnologyCards
    ] as TechnologyCard[],

    // 3. Оборудование
    equipment: [
        ...mockEquipment
    ] as EquipmentItem[],

    // 4. Сырье и материалы (Хоз. учет)
    rawMaterials: [
        ...mockHouseholdItems
    ] as HouseholdItem[]
};

console.log("Tempeh Production Data backed up successfully.");
