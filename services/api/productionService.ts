
// services/api/productionService.ts
import { ProductionOrder, ProductionOrderStatus, TechnologyCard, ProductionRunStep, HouseholdItem, ShiftHandover } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockTechnologyCards } from '../mockData/technologyCards';
import { mockHouseholdItems } from '../mockData/householdItems';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockTransactions } from '../mockData/transactions';
import { MOCK_USERS } from '../mockData/users';
import { delay, deepCopy, eventManager, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';
import { systemService } from './systemService';

/**
 * Added checkProductionOrderMaterialShortage and exported it to fix orderService error
 */
export const checkProductionOrderMaterialShortage = (po: ProductionOrder): boolean => {
    let hasShortage = false;
    const requiredMaterials = new Map<string, { needed: number }>();
    
    po.orderItems.forEach(item => {
        (item.billOfMaterialsSnapshot || []).forEach(bomItem => {
            const totalNeeded = bomItem.quantityPerUnit * item.plannedQuantity;
            const current = requiredMaterials.get(bomItem.householdItemId) || { needed: 0 };
            requiredMaterials.set(bomItem.householdItemId, { needed: current.needed + totalNeeded });
        });
    });

    requiredMaterials.forEach((data, hhItemId) => {
        const stockItem = mockHouseholdItems.find(i => i.id === hhItemId);
        const inStock = stockItem ? stockItem.quantity : 0;
        if (inStock < data.needed) {
            hasShortage = true;
        }
    });

    return hasShortage;
};

const reserveResourcesForPO = async (po: ProductionOrder) => {
    po.orderItems.forEach(item => {
        const bom = item.billOfMaterialsSnapshot || [];
        bom.forEach(bomItem => {
            const needed = bomItem.quantityPerUnit * item.plannedQuantity;
            const hhItem = mockHouseholdItems.find(h => h.id === bomItem.householdItemId);
            if (hhItem) {
                hhItem.reservedQuantity = (hhItem.reservedQuantity || 0) + needed;
                hhItem.lastUpdated = new Date().toISOString();
            }
        });
    });
};

const releaseResourcesForPO = async (po: ProductionOrder, consumed = false) => {
    po.orderItems.forEach(item => {
        const bom = item.billOfMaterialsSnapshot || [];
        bom.forEach(bomItem => {
            const reserved = bomItem.quantityPerUnit * item.plannedQuantity;
            const hhItem = mockHouseholdItems.find(h => h.id === bomItem.householdItemId);
            if (hhItem) {
                hhItem.reservedQuantity = Math.max(0, (hhItem.reservedQuantity || 0) - reserved);
                if (consumed) {
                    hhItem.quantity = Math.max(0, hhItem.quantity - reserved);
                }
                hhItem.lastUpdated = new Date().toISOString();
            }
        });
    });
};

const updateProductionOrder = async (orderData: ProductionOrder): Promise<ProductionOrder> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.patch<ProductionOrder>(`/production/orders/${orderData.id}`, orderData);
    }
    await delay(400);
    const index = mockProductionOrders.findIndex(po => po.id === orderData.id);
    if (index === -1) throw new Error("Production Order not found");
    
    const oldOrder = mockProductionOrders[index];
    const newOrder = { ...oldOrder, ...orderData, updatedAt: new Date().toISOString() };

    // RESERVATION LOGIC: 
    // From 'Planned'/'Awaiting' -> 'Ready to launch' = Reserve
    if ((oldOrder.status === 'Планируется' || oldOrder.status === 'Ожидает сырья') && 
        (newOrder.status === 'Готово к запуску' || newOrder.status === 'В производстве')) {
        await reserveResourcesForPO(newOrder);
        await systemService.logEvent('Резервирование сырья', `Зарезервировано сырье под ПЗ #${newOrder.id}`, 'production', newOrder.id, 'ProductionOrder');
    }

    // Completion or Cancellation = Release
    if (oldOrder.status !== 'Завершено' && newOrder.status === 'Завершено') {
        await releaseResourcesForPO(newOrder, true); // Release and deduct
        newOrder.actualEndDate = new Date().toISOString();
    } else if (oldOrder.status !== 'Отменено' && newOrder.status === 'Отменено') {
        if (oldOrder.status === 'Готово к запуску' || oldOrder.status === 'В производстве') {
            await releaseResourcesForPO(newOrder, false); // Just release
        }
    }

    mockProductionOrders[index] = newOrder;
    return deepCopy(newOrder);
};

export const productionService = {
    getProductionOrders: async (filters: any) => { await delay(400); return deepCopy(mockProductionOrders); },
    addProductionOrder: async (data: any) => { await delay(400); const n = {...data, id: generateId('po')}; mockProductionOrders.push(n); return n; },
    updateProductionOrder,
    rescheduleProductionOrder: async (id: string, s: string, e: string) => { return {} as any; },
    archiveProductionOrder: async (id: string, a: boolean) => { return {success:true}; },
    deleteProductionOrder: async (id: string) => { return {success:true}; },
    getTechnologyCards: async (f: any) => { return deepCopy(mockTechnologyCards); },
    getTechnologyCardByWarehouseItemId: async (id: string) => { return mockTechnologyCards.find(c => c.warehouseItemId === id) || null; },
    addTechnologyCard: async (c: any) => { const n = {...c, id: generateId('tech')}; mockTechnologyCards.push(n); return n; },
    updateTechnologyCard: async (c: any) => { return c; },
    archiveTechnologyCard: async (id: string, a: boolean) => { return {success:true}; },
    deleteTechnologyCard: async (id: string) => { return {success:true}; },
    updateProductionRunStep: async (oid: string, itemid: string, sid: string, u: any) => { return {} as any; },
    createShiftHandover: async (d: any) => { const n = {...d, id: generateId('ho')}; return n; },
    getLastShiftHandover: async () => { return null; },
    getShiftHandovers: async () => { return []; },
};
