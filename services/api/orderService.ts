// services/api/orderService.ts
import { Order, OrderItem, OrderStatus, Contact, WarehouseItem, WarehouseItemHistoryEntry, ProductionOrder } from '../../types';
import { mockOrders } from '../mockData/orders';
import { mockContacts } from '../mockData/contacts';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockTransactions } from '../mockData/transactions';
import { mockProductionOrders } from '../mockData/productionOrders';
import { MOCK_USERS } from '../mockData/users';
import { authService } from '../authService';
import { delay, deepCopy, sortData, eventManager } from './utils';
import { generateId } from '../../utils/idGenerators';
import { checkProductionOrderMaterialShortage } from './productionService';
import { PRIORITY_SORT_MAP } from '../../constants';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

type SortConfig<T> = { key: keyof T, direction: 'asc' | 'desc' } | null;

const getOrders = (filters: { searchTerm?: string; statusFilter?: OrderStatus | 'Все'; paymentFilter?: 'all' | 'paid' | 'unpaid', viewMode?: 'active' | 'archived' | 'all', sortConfig?: SortConfig<Order> }): Promise<Order[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.get<Order[]>('/sales/orders', {
            search: filters.searchTerm,
            status: filters.statusFilter !== 'Все' ? filters.statusFilter : undefined,
            paymentStatus: filters.paymentFilter === 'all' ? undefined : filters.paymentFilter,
            viewMode: filters.viewMode
        }).then(orders => {
             // Apply client-side sorting if API doesn't support complex sorting yet, or rely on API.
             // For now, we assume API returns basic list and we sort here or API handles it via params not yet implemented in client
             return sortData(orders, filters.sortConfig || { key: 'date', direction: 'desc' });
        });
    }

    return new Promise((resolve) => {
      delay(400).then(() => {
        let filteredOrders = deepCopy(mockOrders);
        if (filters.viewMode === 'archived') {
            filteredOrders = filteredOrders.filter(o => o.isArchived);
        } else if (filters.viewMode === 'active' || !filters.viewMode) { // Default to active
            filteredOrders = filteredOrders.filter(o => !o.isArchived);
        }
        // if viewMode is 'all', no filter is applied

        if (filters.statusFilter && filters.statusFilter !== 'Все') {
            filteredOrders = filteredOrders.filter(o => o.status === filters.statusFilter);
        }
        
        if (filters.paymentFilter === 'paid') {
            filteredOrders = filteredOrders.filter(o => o.isPaid);
        } else if (filters.paymentFilter === 'unpaid') {
            filteredOrders = filteredOrders.filter(o => !o.isPaid);
        }


        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          filteredOrders = filteredOrders.filter(order =>
            order.id.toLowerCase().includes(term) ||
            order.customerName.toLowerCase().includes(term) ||
            order.items.some(item => item.productName.toLowerCase().includes(term))
          );
        }
        
         const ordersWithMargin = filteredOrders.map(order => {
            const po = order.productionOrderId ? mockProductionOrders.find(p => p.id === order.productionOrderId) : null;
            if (po && po.totalCalculatedCost !== undefined) {
              return {
                ...order,
                productionCost: po.totalCalculatedCost,
                margin: order.amount - po.totalCalculatedCost,
              };
            }
            return order;
          });

        resolve(sortData(ordersWithMargin, filters.sortConfig || { key: 'date', direction: 'desc' }));
      });
    });
};

const getOrderById = (orderId: string): Promise<Order | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.get<Order>(`/sales/orders/${orderId}`);
    }

    return new Promise((resolve) => {
      delay(200).then(() => {
        const order = mockOrders.find(o => o.id === orderId);
        resolve(order ? deepCopy(order) : null);
      });
    });
};
  
const addOrder = (orderData: Omit<Order, 'id' | 'isArchived' | 'archivedAt' | 'amount' | 'customerName' | 'customerPriority' | 'date' | 'productionOrderStatus' | 'updatedAt' | 'history'>): Promise<Order> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.post<Order>('/sales/orders', orderData);
    }

    return new Promise((resolve, reject) => {
        delay(500).then(() => {
            const contact = mockContacts.find(c => c.id === orderData.contactId);
            if (!contact) {
                reject(new Error("Contact not found for this order."));
                return;
            }
            const newOrder: Order = {
                id: `order${Date.now()}`,
                ...orderData,
                isArchived: false,
                date: new Date().toISOString(),
                customerName: contact.name,
                customerPriority: contact.priority,
                amount: orderData.items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0),
                history: [],
            };
            mockOrders.push(newOrder);
            resolve(deepCopy(newOrder));
        });
    });
};

const updateOrder = (orderData: Order): Promise<Order> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.patch<Order>(`/sales/orders/${orderData.id}`, orderData);
    }

    return new Promise((resolve, reject) => {
        delay(500).then(async () => {
            const index = mockOrders.findIndex(o => o.id === orderData.id);
            if (index === -1) {
                reject(new Error('Order not found'));
                return;
            }

            const originalOrder = mockOrders[index];
            const contact = mockContacts.find(c => c.id === orderData.contactId);
            if (!contact) {
                reject(new Error("Contact not found."));
                return;
            }
            const updatedOrderData = { 
                ...originalOrder,
                ...orderData, 
                customerName: contact.name,
                customerPriority: contact.priority,
                amount: orderData.items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0),
            };

            // --- Payment & Invoice Date Logic ---
            if (updatedOrderData.isPaid && !originalOrder.isPaid) {
                updatedOrderData.paidAt = new Date().toISOString();
            } else if (!updatedOrderData.isPaid && originalOrder.isPaid) {
                updatedOrderData.paidAt = undefined;
            }

            if (updatedOrderData.isInvoiceSent && !originalOrder.isInvoiceSent) {
                updatedOrderData.invoiceSentAt = new Date().toISOString();
            } else if (!updatedOrderData.isInvoiceSent && originalOrder.isInvoiceSent) {
                updatedOrderData.invoiceSentAt = undefined;
            }
            
            // --- Sent Date Logic ---
            if (updatedOrderData.status === 'Отправлен' && originalOrder.status !== 'Отправлен') {
                updatedOrderData.sentAt = new Date().toISOString();
            } else if (updatedOrderData.status !== 'Отправлен' && originalOrder.status === 'Отправлен') {
                updatedOrderData.sentAt = undefined;
            }

            // If status is intended to be 'Собран', check availability first.
            if (updatedOrderData.status === 'Собран' && originalOrder.status !== 'Собран') {
                const { allAvailable } = await checkOrderAvailability(updatedOrderData.items);
                if (!allAvailable) {
                    updatedOrderData.status = 'Не может быть собран'; // Correct status and proceed without stock deduction.
                } else {
                    // Stock is available, proceed with deduction logic
                    const user = await authService.getCurrentUser();
                    updatedOrderData.items.forEach(orderItem => {
                        const whIndex = mockWarehouseItems.findIndex(wh => wh.id === orderItem.productId);
                        if (whIndex !== -1) {
                            const whItem = mockWarehouseItems[whIndex];
                            const newQuantity = whItem.quantity - orderItem.quantity;
                            
                            whItem.quantity = newQuantity;
                            whItem.lastUpdated = new Date().toISOString();
                            const historyEntry: WarehouseItemHistoryEntry = {
                                id: generateId('whh'),
                                timestamp: new Date().toISOString(),
                                userId: user?.id || 'system',
                                userName: user?.name,
                                changeType: 'order_fulfillment',
                                quantityChange: -orderItem.quantity,
                                newQuantity: newQuantity,
                                reason: `Сборка заказа #${updatedOrderData.id}`,
                                relatedOrderId: updatedOrderData.id,
                            };
                            if (!whItem.history) whItem.history = [];
                            whItem.history.push(historyEntry);
                            
                            if (whItem.lowStockThreshold !== undefined && newQuantity <= whItem.lowStockThreshold) {
                                eventManager.dispatch('stock.below_threshold', { item: whItem, itemType: 'warehouse' });
                            }
                        }
                    });
                }
            }
            
            mockOrders[index] = updatedOrderData;
            resolve(deepCopy(updatedOrderData));
        });
    });
};
  
const archiveOrder = (orderId: string, archive: boolean): Promise<{success: true}> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.post<{success: true}>(`/sales/orders/${orderId}/archive`, { archive });
    }

     return new Promise((resolve, reject) => {
        delay(300).then(() => {
            const index = mockOrders.findIndex(c => c.id === orderId);
            if (index !== -1) {
                mockOrders[index].isArchived = archive;
                mockOrders[index].archivedAt = archive ? new Date().toISOString() : undefined;
                resolve({ success: true });
            } else {
                reject(new Error('Order not found'));
            }
        });
     });
};

const deleteOrder = (orderId: string): Promise<{success: true}> => {
      if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
          return apiClient.delete<{success: true}>(`/sales/orders/${orderId}`);
      }

      return new Promise((resolve, reject) => {
          delay(500).then(() => {
              const index = mockOrders.findIndex(o => o.id === orderId);
              if (index !== -1 && mockOrders[index].isArchived) {
                  mockOrders.splice(index, 1);
                  resolve({ success: true });
              } else if (index === -1) {
                  reject(new Error('Order not found'));
              } else {
                  reject(new Error('Order must be archived before deletion'));
              }
          });
      });
};
  
const checkOrderAvailability = (items: OrderItem[]): Promise<{ allAvailable: boolean, itemAvailability: Record<string, { available: number, needed: number }> }> => {
    // This is complex logic. If Real API is used, we probably call a specific endpoint like /sales/check-availability
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.post('/sales/orders/check-availability', { items });
    }

    return new Promise((resolve) => {
      delay(150).then(() => {
        let allAvailable = true;
        const itemAvailability: Record<string, { available: number, needed: number }> = {};

        items.forEach(item => {
          const warehouseItem = mockWarehouseItems.find(wh => wh.id === item.productId);
          const availableStock = warehouseItem ? warehouseItem.quantity : 0;
          if (availableStock < item.quantity) {
            allAvailable = false;
          }
          itemAvailability[item.productId] = { available: availableStock, needed: item.quantity };
        });

        resolve({ allAvailable, itemAvailability });
      });
    });
};

const createProductionOrderFromSalesOrder = (orderId: string): Promise<ProductionOrder> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.post<ProductionOrder>(`/production/orders/from-sales/${orderId}`, {});
    }

    return new Promise((resolve, reject) => {
        delay(500).then(() => {
            const salesOrder = mockOrders.find(o => o.id === orderId);
            if (!salesOrder) {
                reject(new Error('Sales Order not found.'));
                return;
            }
            if (salesOrder.productionOrderId) {
                const existingPO = mockProductionOrders.find(po => po.id === salesOrder.productionOrderId);
                if (existingPO) {
                    reject(new Error(`Производственное задание ${existingPO.id} уже существует для этого заказа.`));
                    return;
                }
            }

            const newPO: ProductionOrder = {
                id: `PO-${salesOrder.id}`,
                name: `Производство по заказу #${salesOrder.id} (${salesOrder.customerName})`,
                orderItems: salesOrder.items.map(item => ({
                    id: generateId('poi'),
                    warehouseItemId: item.productId,
                    productName: item.productName,
                    plannedQuantity: item.quantity,
                    unit: 'шт', // Simplified unit
                    billOfMaterialsSnapshot: mockWarehouseItems.find(wh => wh.id === item.productId)?.billOfMaterials || []
                })),
                status: 'Планируется',
                assignedToId: null,
                relatedSalesOrderId: salesOrder.id,
                isPlannedOrder: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isArchived: false,
                financialTransactionsPosted: false,
            };

            const hasShortage = checkProductionOrderMaterialShortage(newPO);
            newPO.hasMaterialShortage = hasShortage;
            if (hasShortage) {
                newPO.status = 'Ожидает сырья';
                eventManager.dispatch('production.awaiting_materials', { productionOrder: newPO });
            }

            mockProductionOrders.push(newPO);
            
            const salesOrderIndex = mockOrders.findIndex(o => o.id === orderId);
            mockOrders[salesOrderIndex].productionOrderId = newPO.id;
            mockOrders[salesOrderIndex].productionOrderStatus = newPO.status;

            resolve(deepCopy(newPO));
        });
    });
};

const updateOrderItemAssembledStatus = (orderId: string, itemId: string, isAssembled: boolean, userId: string): Promise<Order> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.patch<Order>(`/sales/orders/${orderId}/items/${itemId}/assembly`, { isAssembled });
    }

    return new Promise((resolve, reject) => {
        delay(200).then(() => {
            const orderIndex = mockOrders.findIndex(o => o.id === orderId);
            if (orderIndex === -1) {
                reject(new Error('Order not found.'));
                return;
            }
            const order = { ...mockOrders[orderIndex] };
            const itemIndex = order.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) {
                reject(new Error('Order item not found.'));
                return;
            }

            order.items[itemIndex].isAssembled = isAssembled;
            if (isAssembled) {
                const user = authService.getMockUsers().find(u => u.id === userId);
                order.items[itemIndex].assembledBy = { userId, userName: user?.name, timestamp: new Date().toISOString() };
            } else {
                order.items[itemIndex].assembledBy = undefined;
            }
            
            const allAssembled = order.items.every(i => i.isAssembled);
            if (allAssembled && order.status !== 'Собран') {
                order.status = 'Собран';
            } else if (!allAssembled && order.status === 'Собран') {
                order.status = 'В обработке'; 
            }
            
            mockOrders[orderIndex] = order;
            resolve(deepCopy(order));
        });
    });
};

const seizeStockForOrder = async (orderId: string, userId: string): Promise<Order> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.post<Order>(`/sales/orders/${orderId}/seize-stock`, {});
    }

    await delay(1000);
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error("Целевой заказ не найден");

    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) throw new Error("Пользователь не найден");

    const targetOrder = mockOrders[orderIndex];

    const deficitItems: { productId: string; needed: number }[] = [];
    for (const item of targetOrder.items) {
        const warehouseItem = mockWarehouseItems.find(wh => wh.id === item.productId);
        const stockQty = warehouseItem?.quantity || 0;
        const shortage = item.quantity - stockQty;
        if (shortage > 0) {
            deficitItems.push({ productId: item.productId, needed: shortage });
        }
    }

    if (deficitItems.length === 0) {
        return deepCopy(targetOrder);
    }

    // Source orders for seizure are ONLY those that are already assembled, as their stock is "reserved".
    const sourceOrders = mockOrders.filter(o =>
        o.id !== orderId &&
        !o.isArchived &&
        o.status === 'Собран'
    ).sort((a, b) => (PRIORITY_SORT_MAP[a.customerPriority || '3'] - PRIORITY_SORT_MAP[b.customerPriority || '3'] || new Date(a.date).getTime() - new Date(b.date).getTime()));
    
    const seizedFromLog: Map<string, {productName: string, quantity: number}[]> = new Map();

    for (const deficit of deficitItems) {
        let needed = deficit.needed;
        if (needed <= 0) continue;

        for (const sourceOrder of sourceOrders) {
            if (needed <= 0) break;
            
            const sourceItem = sourceOrder.items.find(i => i.productId === deficit.productId);
            if (sourceItem) {
                const whItem = mockWarehouseItems.find(wh => wh.id === deficit.productId);
                if (!whItem) continue;

                const seizedQty = Math.min(needed, sourceItem.quantity);
                
                // Add stock back to warehouse from the disassembled source order
                whItem.quantity += seizedQty;
                whItem.lastUpdated = new Date().toISOString();
                
                // Mark the source order as no longer assembled
                const sourceOrderLive = mockOrders.find(o => o.id === sourceOrder.id)!;
                sourceOrderLive.status = 'Не может быть собран';
                sourceOrderLive.updatedAt = new Date().toISOString();
                if (!sourceOrderLive.history) sourceOrderLive.history = [];
                sourceOrderLive.history.push({
                    id: generateId('ord-hist'),
                    timestamp: new Date().toISOString(),
                    userId: 'system',
                    userName: 'Система',
                    action: 'status_change',
                    details: `Товар "${sourceItem.productName}" в количестве ${seizedQty} ед. перехвачен для приоритетного заказа #${orderId}.`
                });

                needed -= seizedQty;
                
                if (!seizedFromLog.has(sourceOrder.id)) {
                    seizedFromLog.set(sourceOrder.id, []);
                }
                seizedFromLog.get(sourceOrder.id)!.push({ productName: sourceItem.productName, quantity: seizedQty });
            }
        }
    }
    
    const { allAvailable: targetAllAvailable } = await checkOrderAvailability(targetOrder.items);
    targetOrder.status = targetAllAvailable ? 'Может быть собран' : 'Не может быть собран';

    const logDetails = Array.from(seizedFromLog.entries()).map(([orderId, items]) => {
        const itemsStr = items.map(i => `${i.productName} (${i.quantity} ед.)`).join(', ');
        return `из заказа #${orderId} (${itemsStr})`;
    }).join('; ');
    
    if (!targetOrder.history) targetOrder.history = [];
    targetOrder.history.push({
        id: generateId('ord-hist'),
        timestamp: new Date().toISOString(),
        userId: userId,
        userName: user.name,
        action: 'priority_seizure',
        details: `Выполнен приоритетный перехват товаров ${logDetails || 'из доступных на складе'}.`
    });

    targetOrder.updatedAt = new Date().toISOString();
    return deepCopy(targetOrder);
};

const updateOrderAssembled = async (orderId: string, locationId: string | null, userId: string): Promise<Order> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        return apiClient.post<Order>(`/sales/orders/${orderId}/assemble`, { locationId });
    }

    await delay(600);
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error("Order not found");

    const order = mockOrders[orderIndex];
    if (order.status === 'Собран') {
        order.assembledOrderLocationId = locationId;
        order.updatedAt = new Date().toISOString();
        return deepCopy(order);
    }
    
    const { allAvailable } = await checkOrderAvailability(order.items);
    if (!allAvailable) throw new Error("Недостаточно товаров на складе для завершения сборки.");
    
    const user = MOCK_USERS.find(u => u.id === userId);

    order.items.forEach(item => {
        item.isAssembled = true;
        item.assembledBy = { userId, userName: user?.name, timestamp: new Date().toISOString() };

        const whIndex = mockWarehouseItems.findIndex(wh => wh.id === item.productId);
        if (whIndex !== -1) {
            const whItem = mockWarehouseItems[whIndex];
            const newQuantity = whItem.quantity - item.quantity;
            whItem.quantity = newQuantity;
            whItem.lastUpdated = new Date().toISOString();
            
            if (!whItem.history) whItem.history = [];
            whItem.history.unshift({
                id: generateId('whh'),
                timestamp: new Date().toISOString(),
                userId: userId,
                userName: user?.name,
                changeType: 'order_fulfillment',
                quantityChange: -item.quantity,
                newQuantity,
                reason: `Сборка заказа #${order.id}`,
                relatedOrderId: order.id
            });
            
            if (whItem.lowStockThreshold !== undefined && newQuantity <= whItem.lowStockThreshold) {
                eventManager.dispatch('stock.below_threshold', { item: whItem, itemType: 'warehouse' });
            }
        }
    });

    order.status = 'Собран';
    order.assembledOrderLocationId = locationId;
    order.updatedAt = new Date().toISOString();
    
    return deepCopy(order);
};

const markOrderAssembledAndDeductStock = async (orderId: string, userId: string): Promise<Order> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.ORDERS) {
        // Same endpoint as assemble, but maybe with specific params if backend distinguishes "fast assemble" vs "scan assemble"
        return apiClient.post<Order>(`/sales/orders/${orderId}/assemble`, { locationId: null }); 
    }

    await delay(600);
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) throw new Error("Заказ не найден.");

    const order = mockOrders[orderIndex];
    if (order.status === 'Собран' || order.status === 'Отправлен' || order.status === 'Доставлен') {
        return deepCopy(order);
    }
    
    const { allAvailable } = await checkOrderAvailability(order.items);
    if (!allAvailable) throw new Error("Недостаточно товаров на складе для сборки заказа.");
    
    const user = MOCK_USERS.find(u => u.id === userId);

    order.items.forEach(item => {
        item.isAssembled = true;
        item.assembledBy = { userId, userName: user?.name, timestamp: new Date().toISOString() };

        const whIndex = mockWarehouseItems.findIndex(wh => wh.id === item.productId);
        if (whIndex !== -1) {
            const whItem = mockWarehouseItems[whIndex];
            const newQuantity = whItem.quantity - item.quantity;
            whItem.quantity = newQuantity;
            whItem.lastUpdated = new Date().toISOString();
            
            if (!whItem.history) whItem.history = [];
            whItem.history.unshift({
                id: generateId('whh'),
                timestamp: new Date().toISOString(),
                userId: userId,
                userName: user?.name,
                changeType: 'order_fulfillment',
                quantityChange: -item.quantity,
                newQuantity,
                reason: `Сборка заказа #${order.id}`,
                relatedOrderId: order.id
            });
            
            if (whItem.lowStockThreshold !== undefined && newQuantity <= whItem.lowStockThreshold) {
                eventManager.dispatch('stock.below_threshold', { item: whItem, itemType: 'warehouse' });
            }
        }
    });

    order.status = 'Собран';
    order.assembledOrderLocationId = null; 
    order.updatedAt = new Date().toISOString();
    if (!order.history) order.history = [];
    order.history.push({
        id: generateId('ord-hist'),
        timestamp: new Date().toISOString(),
        userId: userId,
        userName: user?.name,
        action: 'status_change',
        details: `Статус изменен на "Собран" (быстрая сборка). Товары списаны со склада.`
    });
    
    mockOrders[orderIndex] = order;
    return deepCopy(order);
};


export const orderService = {
    getOrders,
    getOrderById,
    addOrder,
    updateOrder,
    archiveOrder,
    deleteOrder,
    checkOrderAvailability,
    createProductionOrderFromSalesOrder,
    updateOrderItemAssembledStatus,
    seizeStockForOrder,
    updateOrderAssembled,
    markOrderAssembledAndDeductStock,
};