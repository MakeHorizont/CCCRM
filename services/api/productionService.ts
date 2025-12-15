
// services/api/productionService.ts
import { ProductionOrder, ProductionOrderStatus, TechnologyCard, ProductionRunStep, HouseholdItem, ShiftHandover } from '../../types';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockTechnologyCards } from '../mockData/technologyCards';
import { mockHouseholdItems } from '../mockData/householdItems';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockTransactions } from '../mockData/transactions';
import { mockOrders } from '../mockData/orders';
import { MOCK_USERS } from '../mockData/users';
import { mockBonuses } from './utils';
import { authService } from '../authService';
import { delay, deepCopy, eventManager, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { systemService } from './systemService'; // Import Audit Log service
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

// In-memory storage for mock handovers
let mockShiftHandovers: ShiftHandover[] = [];

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


const getProductionOrders = async (filters: { searchTerm?: string; statusFilter?: ProductionOrderStatus | 'Все'; viewMode?: 'active' | 'archived' | 'all' }): Promise<ProductionOrder[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        try {
            return await apiClient.get<ProductionOrder[]>('/production/orders', {
                search: filters.searchTerm,
                status: filters.statusFilter !== 'Все' ? filters.statusFilter : undefined,
                archived: filters.viewMode === 'archived'
            });
        } catch (error) {
            console.error("Failed to fetch production orders from API", error);
        }
    }

    await delay(400);
    let orders = deepCopy(mockProductionOrders);
    if (filters.viewMode === 'archived') {
        orders = orders.filter(o => o.isArchived);
    } else if (filters.viewMode === 'active') {
        orders = orders.filter(o => !o.isArchived);
    }
    if (filters.statusFilter && filters.statusFilter !== 'Все') {
        orders = orders.filter(o => o.status === filters.statusFilter);
    }
    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        orders = orders.filter(o =>
            o.id.toLowerCase().includes(term) ||
            o.name.toLowerCase().includes(term) ||
            (o.assigneeName && o.assigneeName.toLowerCase().includes(term)) ||
            o.orderItems.some(item => item.productName.toLowerCase().includes(term))
        );
    }
    return orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const addProductionOrder = async (orderData: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt' | 'assigneeName' | 'needsReviewAfterSalesOrderUpdate' | 'financialTransactionsPosted' | 'brigadeBonus' | 'calculatedLaborCost'|'calculatedRawMaterialCost'|'allocatedOverheadCost'|'totalCalculatedCost'>): Promise<ProductionOrder> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.post<ProductionOrder>('/production/orders', orderData);
    }

    await delay(400);
    
    // --- PHYSICS ENGINE CHECK ---
    const systemMode = localStorage.getItem('systemMode');
    const assignee = MOCK_USERS.find(u => u.id === orderData.assignedToId);
    
    const newOrder: ProductionOrder = {
        ...orderData,
        id: generateId('po'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        assigneeName: assignee?.name || assignee?.email,
        financialTransactionsPosted: false,
    };
    const hasShortage = checkProductionOrderMaterialShortage(newOrder);
    newOrder.hasMaterialShortage = hasShortage;
    
    // STRICT BLOCKING IN MOBILIZATION MODE
    if (systemMode === 'mobilization' && hasShortage) {
         throw new Error("РЕЖИМ МОБИЛИЗАЦИИ: Создание задания запрещено из-за дефицита сырья. Пополните склад.");
    }

    if (hasShortage && newOrder.status === 'Планируется') {
        newOrder.status = 'Ожидает сырья';
        eventManager.dispatch('production.awaiting_materials', { productionOrder: newOrder });
    }
    mockProductionOrders.push(newOrder);
    
    // Audit Log
    await systemService.logEvent(
        'Создание ПЗ',
        `Создано производственное задание "${newOrder.name}". Статус: ${newOrder.status}`,
        'production',
        newOrder.id,
        'ProductionOrder'
    );

    return deepCopy(newOrder);
};

const updateProductionOrder = async (orderData: ProductionOrder): Promise<ProductionOrder> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.patch<ProductionOrder>(`/production/orders/${orderData.id}`, orderData);
    }

    await delay(400);
    const index = mockProductionOrders.findIndex(po => po.id === orderData.id);
    if (index === -1) throw new Error("Production Order not found");
    
    const systemMode = localStorage.getItem('systemMode');
    const originalOrder = mockProductionOrders[index];
    const user = await authService.getCurrentUser();
    const updatedOrder = { ...originalOrder, ...orderData, updatedAt: new Date().toISOString() };
    
    // Recalculate shortage on update
    const hasShortage = checkProductionOrderMaterialShortage(updatedOrder);
    updatedOrder.hasMaterialShortage = hasShortage;

    // STRICT BLOCKING IN MOBILIZATION MODE IF STARTING PRODUCTION
    // Checking if we are transitioning INTO a running state
    const isStarting = ['В производстве', 'Готово к запуску'].includes(updatedOrder.status) && 
                       !['В производстве', 'Готово к запуску'].includes(originalOrder.status);

    if (isStarting && hasShortage) {
        if (systemMode === 'mobilization') {
             throw new Error("⛔ РЕЖИМ МОБИЛИЗАЦИИ: Запуск задания физически заблокирован! Недостаточно сырья на складе. Пополните запасы.");
        } else {
            // Development mode warning (via system event, but allow proceed)
            await systemService.logEvent(
                'Запуск с дефицитом',
                `ПЗ #${updatedOrder.id} запущено с дефицитом сырья (Режим Развития).`,
                'production',
                updatedOrder.id,
                'ProductionOrder'
            );
        }
    }

    // --- MATERIAL CONSTRAINTS CHECK (PHYSICS ENGINE) ---
    if (updatedOrder.status === 'Завершено' && originalOrder.status !== 'Завершено') {
        // 1. Validate Material Availability BEFORE processing
        const insufficientMaterials: string[] = [];
        
        updatedOrder.orderItems.forEach(item => {
             // Use snapshot if available, otherwise try to find current card (fallback)
             const bom = item.billOfMaterialsSnapshot || []; 
             
             bom.forEach(bomItem => {
                 const quantityNeeded = bomItem.quantityPerUnit * (item.producedQuantity || item.plannedQuantity);
                 const hhItem = mockHouseholdItems.find(hi => hi.id === bomItem.householdItemId);
                 
                 if (!hhItem || hhItem.quantity < quantityNeeded) {
                     insufficientMaterials.push(`${bomItem.householdItemName} (Нужно: ${quantityNeeded}, Есть: ${hhItem?.quantity || 0})`);
                 }
             });
        });

        if (insufficientMaterials.length > 0) {
            throw new Error(`ОШИБКА МАТЕРИАЛЬНОГО БАЛАНСА: Невозможно завершить производство. Недостаточно сырья на складе:\n${insufficientMaterials.join('\n')}`);
        }

        // 2. Proceed with deduction and costing
        let totalMaterialCost = 0;
        let totalLaborCost = 0;

        updatedOrder.orderItems.forEach(item => {
            // Deduct materials based on actual usage in steps
            item.productionRun?.forEach(step => {
                if (step.originalStep.type === 'ingredient' && step.actualQuantity) {
                    const hhItem = mockHouseholdItems.find(hi => hi.id === step.originalStep.componentId);
                    if (hhItem) {
                        totalMaterialCost += hhItem.price * step.actualQuantity;
                        const hhIndex = mockHouseholdItems.findIndex(hi => hi.id === hhItem.id);
                        if (hhIndex > -1) {
                            mockHouseholdItems[hhIndex].quantity -= (step.actualQuantity + (step.wasteQuantity || 0));
                            // Audit log for material deduction? Too spammy, maybe. 
                            // Let's rely on the PO completion log.
                        }
                    }
                }
            });
            
            // Add finished goods
            if(item.producedQuantity && item.producedQuantity > 0) {
                 const whIndex = mockWarehouseItems.findIndex(wh => wh.id === item.warehouseItemId);
                 if (whIndex > -1) {
                     const whItem = mockWarehouseItems[whIndex];
                     const newQuantity = whItem.quantity + item.producedQuantity;
                     whItem.quantity = newQuantity;
                     whItem.lastUpdated = new Date().toISOString();
                     if(!whItem.history) whItem.history = [];
                     whItem.history.unshift({
                         id: generateId('whh'),
                         timestamp: new Date().toISOString(),
                         userId: user?.id || 'system',
                         userName: user?.name,
                         changeType: 'production_output',
                         quantityChange: item.producedQuantity,
                         newQuantity: newQuantity,
                         reason: `Производство по ПЗ #${updatedOrder.id}`,
                         relatedProductionRunId: updatedOrder.id,
                     });
                 }
            }
        });
        
        if (updatedOrder.actualLaborHours && updatedOrder.assignedToId) {
            const assignee = MOCK_USERS.find(u => u.id === updatedOrder.assignedToId);
            if (assignee?.dailyRate) {
                const hourlyRate = assignee.dailyRate / 8; // Assuming 8-hour day
                totalLaborCost = hourlyRate * updatedOrder.actualLaborHours;
            }
        }
        
        updatedOrder.calculatedRawMaterialCost = totalMaterialCost;
        updatedOrder.calculatedLaborCost = totalLaborCost;
        updatedOrder.totalCalculatedCost = totalMaterialCost + totalLaborCost;
        updatedOrder.actualEndDate = new Date().toISOString();

        // ... (Brigade bonus logic remains same) ...
        if (updatedOrder.relatedSalesOrderId) {
            const salesOrder = mockOrders.find(so => so.id === updatedOrder.relatedSalesOrderId);
            if (salesOrder) {
                const margin = salesOrder.amount - (updatedOrder.totalCalculatedCost || 0);
                if (margin > 0 && updatedOrder.brigadeMembers && updatedOrder.brigadeMembers.length > 0) {
                    const brigadeBonusTotal = margin * 0.20; // 20% of margin
                    const bonusPerMember = brigadeBonusTotal / updatedOrder.brigadeMembers.length;
                    updatedOrder.brigadeBonus = brigadeBonusTotal;
        
                    updatedOrder.brigadeMembers.forEach(memberId => {
                        const newBonus = {
                            id: generateId('bonus'),
                            userId: memberId,
                            type: 'brigade' as const,
                            amount: bonusPerMember,
                            date: new Date().toISOString().split('T')[0],
                            description: `Бригадная премия за ПЗ: "${updatedOrder.name}"`,
                            relatedEntityId: updatedOrder.id,
                            createdAt: new Date().toISOString(),
                        };
                        mockBonuses.push(newBonus);
        
                        const notification = createSystemNotification(
                            memberId,
                            'bonus',
                            `Вы получили бригадную премию за успешное завершение ПЗ "${updatedOrder.name}": ${bonusPerMember.toLocaleString('ru-RU')} ₽`,
                            `/production?orderId=${updatedOrder.id}`,
                            { type: 'bonus', id: newBonus.id }
                        );
                    });
                }
            }
        }
        
        if (!updatedOrder.financialTransactionsPosted) {
            // ... (Transactions logic remains same) ...
            if (totalMaterialCost > 0) {
                mockTransactions.unshift({
                    id: generateId('txn'), date: new Date().toISOString().split('T')[0], type: 'expense', amount: totalMaterialCost,
                    description: `Списание сырья для ПЗ #${updatedOrder.id}`, category: 'Закупка сырья', isTaxDeductible: true,
                    relatedProductionOrderId: updatedOrder.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isArchived: false,
                });
            }

            if (totalLaborCost > 0) {
                 mockTransactions.unshift({
                    id: generateId('txn'), date: new Date().toISOString().split('T')[0], type: 'expense', amount: totalLaborCost,
                    description: `Трудозатраты по ПЗ #${updatedOrder.id}`, category: 'Зарплата', isTaxDeductible: true,
                    relatedProductionOrderId: updatedOrder.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isArchived: false,
                });
            }
            updatedOrder.financialTransactionsPosted = true;
        }

        // --- AUDIT LOG: PRODUCTION COMPLETED ---
        await systemService.logEvent(
            'Производство завершено',
            `ПЗ #${updatedOrder.id} закрыто. Произведено продукции на сумму себестоимости: ${updatedOrder.totalCalculatedCost?.toFixed(2)} ₽. Списано сырья со склада.`,
            'production',
            updatedOrder.id,
            'ProductionOrder'
        );
    } else if (updatedOrder.status !== originalOrder.status) {
        // Log status change
         await systemService.logEvent(
            'Изменение статуса ПЗ',
            `ПЗ #${updatedOrder.id}: ${originalOrder.status} -> ${updatedOrder.status}`,
            'production',
            updatedOrder.id,
            'ProductionOrder'
        );
    }

    mockProductionOrders[index] = updatedOrder;
    return deepCopy(updatedOrder);
};

const rescheduleProductionOrder = async (id: string, newStartDate: string, newEndDate: string): Promise<ProductionOrder> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.patch<ProductionOrder>(`/production/orders/${id}/reschedule`, { plannedStartDate: newStartDate, plannedEndDate: newEndDate });
    }

    await delay(300);
    const index = mockProductionOrders.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Production Order not found");
    
    const original = mockProductionOrders[index];
    const oldDates = `${original.plannedStartDate} - ${original.plannedEndDate}`;
    
    mockProductionOrders[index] = {
        ...original,
        plannedStartDate: newStartDate,
        plannedEndDate: newEndDate,
        updatedAt: new Date().toISOString()
    };
    
    await systemService.logEvent(
        'Перенос сроков ПЗ',
        `Сроки задания "${original.name}" изменены. Было: ${oldDates}, Стало: ${newStartDate} - ${newEndDate}.`,
        'production',
        id,
        'ProductionOrder'
    );

    return deepCopy(mockProductionOrders[index]);
};

const archiveProductionOrder = async (id: string, archive: boolean): Promise<{success:true}> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        await apiClient.post(`/production/orders/${id}/archive`, { archive });
        return { success: true };
    }

    await delay(300);
    const index = mockProductionOrders.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Production Order not found");
    mockProductionOrders[index].isArchived = archive;
    mockProductionOrders[index].archivedAt = archive ? new Date().toISOString() : undefined;
    
    await systemService.logEvent(
        archive ? 'Архивация ПЗ' : 'Восстановление ПЗ',
        `Производственное задание #${id} ${archive ? 'перемещено в архив' : 'восстановлено'}.`,
        'production',
        id,
        'ProductionOrder'
    );
    
    return {success:true};
};

const deleteProductionOrder = async(id: string): Promise<{success:true}> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        await apiClient.delete(`/production/orders/${id}`);
        return { success: true };
    }

    await delay(500);
    const index = mockProductionOrders.findIndex(p => p.id === id);
    if (index > -1 && mockProductionOrders[index].isArchived) {
        const name = mockProductionOrders[index].name;
        mockProductionOrders.splice(index, 1);
        
        await systemService.logEvent(
            'Удаление ПЗ',
            `Производственное задание "${name}" (#${id}) удалено навсегда.`,
            'production',
            id,
            'ProductionOrder'
        );

        return {success:true};
    }
    if (index === -1) throw new Error("Production Order not found");
    throw new Error("Production Order must be archived before deletion");
};

const getTechnologyCards = async(filters?: { viewMode: 'active' | 'archived' | 'all' }): Promise<TechnologyCard[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.get<TechnologyCard[]>('/production/technologies', filters);
    }

    await delay(200);
    let cards = deepCopy(mockTechnologyCards);
    if (filters?.viewMode === 'archived') {
        return cards.filter(c => c.isArchived);
    }
    if (filters?.viewMode === 'active') {
        return cards.filter(c => !c.isArchived);
    }
    return cards;
};

const getTechnologyCardByWarehouseItemId = async (id: string): Promise<TechnologyCard | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        try {
            return await apiClient.get<TechnologyCard>(`/production/technologies/by-item/${id}`);
        } catch {
            return null;
        }
    }

    await delay(200);
    const card = mockTechnologyCards.find(c => c.warehouseItemId === id);
    return card ? deepCopy(card) : null;
};

const addTechnologyCard = async (card: Omit<TechnologyCard, 'id' | 'version' | 'updatedAt'>): Promise<TechnologyCard> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.post<TechnologyCard>('/production/technologies', card);
    }

    await delay(400);
    const newCard: TechnologyCard = {
        ...card,
        id: generateId('tech'),
        version: 1,
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockTechnologyCards.push(newCard);
    
    await systemService.logEvent(
        'Создание Тех. Карты',
        `Создана новая технологическая карта для товара ID ${newCard.warehouseItemId}.`,
        'production',
        newCard.id,
        'TechnologyCard'
    );

    return deepCopy(newCard);
};

const updateTechnologyCard = async (card: TechnologyCard): Promise<TechnologyCard> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.patch<TechnologyCard>(`/production/technologies/${card.id}`, card);
    }

    await delay(400);
    const index = mockTechnologyCards.findIndex(c => c.id === card.id);
    if (index === -1) throw new Error("Tech card not found");
    const newVersion = (card.version || 1) + 1;
    mockTechnologyCards[index] = { ...card, version: newVersion, updatedAt: new Date().toISOString() };
    
    await systemService.logEvent(
        'Обновление Тех. Карты',
        `Обновлена технологическая карта "${card.name}". Новая версия: ${newVersion}.`,
        'production',
        card.id,
        'TechnologyCard'
    );

    return deepCopy(mockTechnologyCards[index]);
};

const archiveTechnologyCard = async (id: string, archive: boolean): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        await apiClient.post(`/production/technologies/${id}/archive`, { archive });
        return { success: true };
    }

    await delay(300);
    const index = mockTechnologyCards.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Tech card not found");
    mockTechnologyCards[index].isArchived = archive;
    mockTechnologyCards[index].archivedAt = archive ? new Date().toISOString() : undefined;
    return { success: true };
};

const deleteTechnologyCard = async (id: string): Promise<{ success: true }> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        await apiClient.delete(`/production/technologies/${id}`);
        return { success: true };
    }

    await delay(500);
    const index = mockTechnologyCards.findIndex(c => c.id === id);
    if (index > -1 && mockTechnologyCards[index].isArchived) {
        mockTechnologyCards.splice(index, 1);
        return { success: true };
    }
    if (index === -1) throw new Error("Tech card not found");
    throw new Error("Tech card must be archived before deletion");
};


const updateProductionRunStep = async (orderId: string, orderItemId: string, stepId: string, updates: Partial<ProductionRunStep> & { userId: string }): Promise<ProductionOrder> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.patch<ProductionOrder>(`/production/orders/${orderId}/items/${orderItemId}/steps/${stepId}`, updates);
    }

    await delay(300);
    const poIndex = mockProductionOrders.findIndex(p => p.id === orderId);
    if(poIndex === -1) throw new Error("Production Order not found");
    
    const orderItem = mockProductionOrders[poIndex].orderItems.find(i => i.id === orderItemId);
    if(!orderItem) throw new Error("Production Order Item not found");
    
    // Initialize productionRun if it doesn't exist
    if (!orderItem.productionRun || orderItem.productionRun.length === 0) {
        const techCard = mockTechnologyCards.find(tc => tc.warehouseItemId === orderItem.warehouseItemId);
        if (!techCard) throw new Error("Tech card not found for initialization");
        
        orderItem.productionRun = techCard.steps
            .sort((a, b) => a.order - b.order)
            .map(step => ({
                stepId: step.id,
                originalStep: { ...step },
                completed: false,
            }));
    }

    const productionRun = orderItem.productionRun;
    const stepIndex = productionRun.findIndex(s => s.stepId === stepId);

    if (stepIndex === -1) {
        throw new Error(`Step with id ${stepId} not found in initialized production run.`);
    }

    const step = productionRun[stepIndex];
    step.completed = updates.completed ?? step.completed;
    step.actualQuantity = updates.actualQuantity ?? step.actualQuantity;
    step.wasteQuantity = updates.wasteQuantity ?? step.wasteQuantity;
    step.notes = updates.notes ?? step.notes;

    if (updates.completed) {
        step.completedAt = new Date().toISOString();
        step.completedBy = { userId: updates.userId, userName: MOCK_USERS.find(u=>u.id === updates.userId)?.name };
    } else if (updates.completed === false) {
         step.completedAt = undefined;
         step.completedBy = undefined;
    }
    
    // Check if ALL items in the PO are fully completed
    const allItemsCompleted = mockProductionOrders[poIndex].orderItems.every(item => {
        const card = mockTechnologyCards.find(tc => tc.warehouseItemId === item.warehouseItemId);
        if (!card) return true; // if no card, can't check, assume ok
        const runSteps = item.productionRun || [];
        return runSteps.length === card.steps.length && runSteps.every(s => s.completed);
    });

    if (allItemsCompleted && mockProductionOrders[poIndex].status !== 'Завершено') {
      mockProductionOrders[poIndex].status = 'Контроль качества';
    } else if (mockProductionOrders[poIndex].status === 'Планируется' || mockProductionOrders[poIndex].status === 'Готово к запуску' || mockProductionOrders[poIndex].status === 'Ожидает сырья') {
      mockProductionOrders[poIndex].status = 'В производстве';
    }

    return deepCopy(mockProductionOrders[poIndex]);
};

const createShiftHandover = async (data: Omit<ShiftHandover, 'id' | 'timestamp' | 'acceptedByUserId' | 'acceptedAt'>): Promise<ShiftHandover> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.post<ShiftHandover>('/production/handovers', data);
    }
    
    await delay(400);
    const newHandover: ShiftHandover = {
        ...data,
        id: generateId('ho'),
        timestamp: new Date().toISOString()
    };
    mockShiftHandovers.unshift(newHandover); // Add to beginning
    return deepCopy(newHandover);
};

const getLastShiftHandover = async (): Promise<ShiftHandover | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.get<ShiftHandover>('/production/handovers/last');
    }

    await delay(200);
    if (mockShiftHandovers.length === 0) return null;
    // Return the most recent one
    return deepCopy(mockShiftHandovers[0]);
};

const getShiftHandovers = async (): Promise<ShiftHandover[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.PRODUCTION) {
        return await apiClient.get<ShiftHandover[]>('/production/handovers');
    }

    await delay(300);
    return deepCopy(mockShiftHandovers);
};

export const productionService = {
    getProductionOrders,
    addProductionOrder,
    updateProductionOrder,
    rescheduleProductionOrder, // Exported new method
    archiveProductionOrder,
    deleteProductionOrder,
    getTechnologyCards,
    getTechnologyCardByWarehouseItemId,
    addTechnologyCard,
    updateTechnologyCard,
    archiveTechnologyCard,
    deleteTechnologyCard,
    updateProductionRunStep,
    checkProductionOrderMaterialShortage,
    createShiftHandover,
    getLastShiftHandover,
    getShiftHandovers,
};
