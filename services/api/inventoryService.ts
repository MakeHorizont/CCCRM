import { InventoryCheck, InventoryCheckItem, WarehouseItem } from '../../types';
import { mockInventoryChecks } from '../mockData/inventoryChecks';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';
import { systemService } from './systemService';
import { warehouseService } from './warehouseService';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const createInventoryCheck = async (blindMode: boolean = false): Promise<InventoryCheck> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.INVENTORY) {
        return apiClient.post<InventoryCheck>('/warehouse/inventory', { blindMode });
    }

    await delay(400);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Snapshot current stock
    let itemsToAudit = mockWarehouseItems.filter(i => !i.isArchived);

    const checkItems: InventoryCheckItem[] = itemsToAudit.map(item => ({
        warehouseItemId: item.id,
        warehouseItemName: item.name,
        expectedQuantity: item.quantity,
        actualQuantity: undefined // To be filled
    }));

    const newCheck: InventoryCheck = {
        id: generateId('inv'),
        date: new Date().toISOString(),
        status: 'in_progress',
        items: checkItems,
        conductedByUserId: user.id,
        conductedByUserName: user.name || user.email,
        createdAt: new Date().toISOString(),
        blindMode: blindMode
    };
    
    mockInventoryChecks.unshift(newCheck);
    
    await systemService.logEvent(
        'Начало инвентаризации',
        `Начата инвентаризация #${newCheck.id} (Метод: ${blindMode ? 'Слепой' : 'Открытый'}). Позиций: ${checkItems.length}`,
        'production',
        newCheck.id,
        'InventoryCheck'
    );

    return deepCopy(newCheck);
};

const getActiveInventoryCheck = async (): Promise<InventoryCheck | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.INVENTORY) {
        return apiClient.get<InventoryCheck>('/warehouse/inventory/active');
    }

    await delay(200);
    const check = mockInventoryChecks.find(c => c.status === 'in_progress');
    return check ? deepCopy(check) : null;
};

const updateInventoryCheckItem = async (checkId: string, itemId: string, actualQty: number): Promise<InventoryCheck> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.INVENTORY) {
        return apiClient.patch<InventoryCheck>(`/warehouse/inventory/${checkId}/items/${itemId}`, { actualQuantity: actualQty });
    }

    await delay(100);
    const check = mockInventoryChecks.find(c => c.id === checkId);
    if (!check) throw new Error("Inventory check not found");
    
    const item = check.items.find(i => i.warehouseItemId === itemId);
    if (item) {
        item.actualQuantity = actualQty;
        item.difference = actualQty - item.expectedQuantity;
    }
    return deepCopy(check);
};

const completeInventoryCheck = async (checkId: string, notes?: string): Promise<InventoryCheck> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.INVENTORY) {
        return apiClient.post<InventoryCheck>(`/warehouse/inventory/${checkId}/complete`, { notes });
    }

    await delay(600);
    const checkIndex = mockInventoryChecks.findIndex(c => c.id === checkId);
    if (checkIndex === -1) throw new Error("Inventory check not found");
    
    const check = mockInventoryChecks[checkIndex];
    const user = await authService.getCurrentUser();
    
    let discrepanciesCount = 0;

    // Process discrepancies
    for (const item of check.items) {
        // If actual quantity was not entered, assume it matches expected (unless logic dictates otherwise)
        // Or treat undefined as 0? Let's treat undefined as "skipped/matches" or force user to enter.
        // Assuming user entered 0 if they meant 0.
        if (item.actualQuantity !== undefined && item.actualQuantity !== item.expectedQuantity) {
            const diff = item.actualQuantity - item.expectedQuantity;
            // Update stock
            await warehouseService.updateWarehouseItemQuantity(
                item.warehouseItemId, 
                diff, 
                user?.id || 'system', 
                `Инвентаризация #${check.id}: Коррекция`
            );
            discrepanciesCount++;
        }
    }

    check.status = 'completed';
    check.completedAt = new Date().toISOString();
    check.notes = notes;
    
    await systemService.logEvent(
        'Завершение инвентаризации',
        `Инвентаризация #${check.id} завершена. Расхождений выявлено: ${discrepanciesCount}.`,
        'production', 
        check.id,
        'InventoryCheck'
    );

    return deepCopy(check);
};

const cancelInventoryCheck = async (checkId: string): Promise<void> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.INVENTORY) {
        await apiClient.post(`/warehouse/inventory/${checkId}/cancel`, {});
        return;
    }

    await delay(300);
    const checkIndex = mockInventoryChecks.findIndex(c => c.id === checkId);
    if (checkIndex > -1) {
        mockInventoryChecks.splice(checkIndex, 1); // Or mark cancelled
    }
};

export const inventoryService = {
    createInventoryCheck,
    getActiveInventoryCheck,
    updateInventoryCheckItem,
    completeInventoryCheck,
    cancelInventoryCheck
};