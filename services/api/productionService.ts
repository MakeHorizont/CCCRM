// services/api/productionService.ts
import { ProductionOrder, ProductionOrderStatus, TechnologyCard, ProductionRunStep, HouseholdItem } from '../../types';
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
    await delay(400);
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
    if (hasShortage && newOrder.status === 'Планируется') {
        newOrder.status = 'Ожидает сырья';
        eventManager.dispatch('production.awaiting_materials', { productionOrder: newOrder });
    }
    mockProductionOrders.push(newOrder);
    return deepCopy(newOrder);
};

const updateProductionOrder = async (orderData: ProductionOrder): Promise<ProductionOrder> => {
    await delay(400);
    const index = mockProductionOrders.findIndex(po => po.id === orderData.id);
    if (index === -1) throw new Error("Production Order not found");

    const originalOrder = mockProductionOrders[index];
    const user = await authService.getCurrentUser();
    const updatedOrder = { ...originalOrder, ...orderData, updatedAt: new Date().toISOString() };

    if (updatedOrder.status === 'Завершено' && originalOrder.status !== 'Завершено') {
        let totalMaterialCost = 0;
        let totalLaborCost = 0;

        updatedOrder.orderItems.forEach(item => {
            item.productionRun?.forEach(step => {
                if (step.originalStep.type === 'ingredient' && step.actualQuantity) {
                    const hhItem = mockHouseholdItems.find(hi => hi.id === step.originalStep.componentId);
                    if (hhItem) {
                        totalMaterialCost += hhItem.price * step.actualQuantity;
                        const hhIndex = mockHouseholdItems.findIndex(hi => hi.id === hhItem.id);
                        if (hhIndex > -1) {
                            mockHouseholdItems[hhIndex].quantity -= (step.actualQuantity + (step.wasteQuantity || 0));
                        }
                    }
                }
            });
            
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
    }

    mockProductionOrders[index] = updatedOrder;
    return deepCopy(updatedOrder);
};

const archiveProductionOrder = async (id: string, archive: boolean): Promise<{success:true}> => {
    await delay(300);
    const index = mockProductionOrders.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Production Order not found");
    mockProductionOrders[index].isArchived = archive;
    mockProductionOrders[index].archivedAt = archive ? new Date().toISOString() : undefined;
    return {success:true};
};

const deleteProductionOrder = async(id: string): Promise<{success:true}> => {
    await delay(500);
    const index = mockProductionOrders.findIndex(p => p.id === id);
    if (index > -1 && mockProductionOrders[index].isArchived) {
        mockProductionOrders.splice(index, 1);
        return {success:true};
    }
    if (index === -1) throw new Error("Production Order not found");
    throw new Error("Production Order must be archived before deletion");
};

const getTechnologyCards = async(filters?: { viewMode: 'active' | 'archived' | 'all' }): Promise<TechnologyCard[]> => {
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
    await delay(200);
    const card = mockTechnologyCards.find(c => c.warehouseItemId === id);
    return card ? deepCopy(card) : null;
};

const addTechnologyCard = async (card: Omit<TechnologyCard, 'id' | 'version' | 'updatedAt'>): Promise<TechnologyCard> => {
    await delay(400);
    const newCard: TechnologyCard = {
        ...card,
        id: generateId('tech'),
        version: 1,
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockTechnologyCards.push(newCard);
    return deepCopy(newCard);
};

const updateTechnologyCard = async (card: TechnologyCard): Promise<TechnologyCard> => {
    await delay(400);
    const index = mockTechnologyCards.findIndex(c => c.id === card.id);
    if (index === -1) throw new Error("Tech card not found");
    mockTechnologyCards[index] = { ...card, version: (card.version || 1) + 1, updatedAt: new Date().toISOString() };
    return deepCopy(mockTechnologyCards[index]);
};

const archiveTechnologyCard = async (id: string, archive: boolean): Promise<{ success: true }> => {
    await delay(300);
    const index = mockTechnologyCards.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Tech card not found");
    mockTechnologyCards[index].isArchived = archive;
    mockTechnologyCards[index].archivedAt = archive ? new Date().toISOString() : undefined;
    return { success: true };
};

const deleteTechnologyCard = async (id: string): Promise<{ success: true }> => {
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

export const productionService = {
    getProductionOrders,
    addProductionOrder,
    updateProductionOrder,
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
};