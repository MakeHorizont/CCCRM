import { Order, WarehouseItem, KanbanTask, KanbanTaskStatus, StrategicPlan, Contact, User, StrategicSubTask, OrderItem, OrderStatus, WarehouseItemHistoryEntry, HouseholdItem, HouseholdCategory, KanbanSubTask, HouseholdItemUsage, UserStatus, TaskStage, StageEntry, FileAttachment, TaskDifficulty, UserDisciplinaryAction, UserAchievement, GroupMembershipEntry, AttendanceEntry, StorageLocation, StorageTag, KanbanBoard, KnowledgeBaseItem, KnowledgeBaseFolder, KnowledgeBaseFile, TechnologyCard, ProductionOrder, ProductionOrderStatus, ProductionRunStep, ProductionOrderItem, PurchaseRequest, PurchaseRequestItem, WarehouseItemIncident, MonthlyExpense, KanbanChecklistItem, PurchaseRequestStatus, EquipmentItem, DiscussionTopic, DiscussionPost, Vote, Notification, Transaction, TransactionCategory, SortableTransactionKeys, Document, CompanyRequisites, LowStockItem, DevelopmentPlanItem, TrainingApplication, TrainingCourse, DocumentType, PerformanceReview, MaterialRequirement, EquipmentStatus, PersonalDashboardSummary, PayslipData, PayslipLineItem, SocialInitiative, CollectiveFund, FundTransaction } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { MOCK_USERS } from './mockData/users';
import { mockContacts } from './mockData/contacts';
import { mockOrders } from './mockData/orders';
import { mockWarehouseItems } from './mockData/warehouseItems';
import { mockKanbanTasks } from './mockData/kanbanTasks';
import { mockStrategicPlans } from './mockData/strategicPlans';
import { mockHouseholdItems } from './mockData/householdItems';
import { mockStorageLocations } from './mockData/storageLocations';
import { mockStorageTags } from './mockData/storageTags';
import { mockKanbanBoards } from './mockData/kanbanBoards';
import { mockKnowledgeBaseItems } from './mockData/knowledgeBaseItems';
import { mockTechnologyCards } from './mockData/technologyCards';
import { mockProductionOrders } from './mockData/productionOrders';
import { mockWarehouseIncidents } from './mockData/warehouseIncidents';
import { mockPurchaseRequests } from './mockData/purchaseRequests';
import { mockMonthlyExpenses } from './mockData/monthlyExpenses';
import { mockEquipment } from './mockData/equipment';
import { mockDiscussions } from './mockData/discussions';
import { mockNotifications } from './mockData/notifications'; // New import
import { mockTransactions } from './mockData/transactions';
import { mockDocuments } from './mockData/documents'; // New import
import { mockTrainingCourses } from './mockData/trainingCourses'; // New import
import { mockSocialInitiatives } from './mockData/socialInitiatives';
import { generateId, generateOrderItemId, generateProductionOrderItemId } from '../utils/idGenerators';
import { authService } from './authService';
import { getKanbanProgressPercentage, BONUS_PER_COEFFICIENT_POINT, ROUTE_PATHS, calculateTaskCoefficient } from '../constants';

// --- Event Manager (Task 1.2) ---
const eventManager = {
  subscribers: {} as Record<string, ((data: any) => void)[]>,
  subscribe(eventName: string, callback: (data: any) => void) {
    if (!this.subscribers[eventName]) {
      this.subscribers[eventName] = [];
    }
    this.subscribers[eventName].push(callback);
  },
  dispatch(eventName: string, data: any) {
    if (this.subscribers[eventName]) {
      this.subscribers[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in event handler for ${eventName}:`, e);
        }
      });
    }
  }
};
// --- End Event Manager ---

// --- Low Stock Notification Listener (Task 1.3) ---
eventManager.subscribe('stock.below_threshold', (data: { item: WarehouseItem | HouseholdItem, itemType: 'warehouse' | 'household' }) => {
    // This listener reacts to low stock events dispatched from various parts of the apiService.
    const managersAndCEO = MOCK_USERS.filter(u => u.role === 'ceo' || u.role === 'manager');
    const link = data.itemType === 'warehouse' ? ROUTE_PATHS.WAREHOUSE : ROUTE_PATHS.HOUSEHOLD_ACCOUNTING;
    
    managersAndCEO.forEach(manager => {
        // To prevent spamming, we only create a new notification if there isn't already an unread one for the same item for this user.
        const existingUnreadNotification = mockNotifications.find(n => 
            n.sourceEntity.type === 'stock' && 
            n.sourceEntity.id === data.item.id &&
            n.status === 'unread' &&
            n.userId === manager.id
        );

        if (!existingUnreadNotification) {
            const unit = 'unit' in data.item ? data.item.unit : 'шт.';
            const notification = createSystemNotification(
                manager.id,
                'warning',
                `Низкий остаток: "${data.item.name}" (осталось: ${data.item.quantity} ${unit})`,
                link,
                { type: 'stock', id: data.item.id }
            );
            mockNotifications.unshift(notification);
            // sendToTelegramGateway(notification); // This could be uncommented to enable Telegram notifications for low stock.
        }
    });
});


// Function to simulate a network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Simple deep copy for mock data to avoid mutation issues
const deepCopy = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

type SortConfig<T> = { key: keyof T, direction: 'asc' | 'desc' } | null;
type DocumentWithCustomer = Document & { customerName: string };

const createSystemNotification = (userId: string, type: Notification['type'], message: string, link: string, sourceEntity: Notification['sourceEntity']): Notification => {
    return {
        id: generateId('notif'),
        userId,
        type,
        status: 'unread',
        message,
        link,
        createdAt: new Date().toISOString(),
        sourceEntity
    };
};

// --- Telegram Gateway Simulation (Task 2.3) ---
const sendToTelegramGateway = async (notification: Notification): Promise<void> => {
    console.log(`[TELEGRAM GATEWAY] Forwarding notification:
  - UserID: ${notification.userId}
  - Type: ${notification.type}
  - Message: ${notification.message}`);
    // In a real application, this would be an API call to a backend service.
    // e.g., await fetch('/api/v1/telegram_gateway', { method: 'POST', body: JSON.stringify(notification), headers: {'Content-Type': 'application/json'} });
    await delay(100); // Simulate network latency
    return;
};


const sortData = <T,>(data: T[], sortConfig: SortConfig<T>): T[] => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    return [...data].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        
        return 0;
    });
};

const findTaskRecursive = (tasks: StrategicSubTask[], taskId: string): StrategicSubTask | null => {
  for (const task of tasks) {
    if (task.id === taskId) return task;
    if (task.subTasks) {
      const found = findTaskRecursive(task.subTasks, taskId);
      if (found) return found;
    }
  }
  return null;
};

const removeTaskRecursive = (
    tasks: StrategicSubTask[],
    taskIdToRemove: string
  ): { removedTask: StrategicSubTask | null; updatedTasks: StrategicSubTask[] } => {
    let taskInstance: StrategicSubTask | null = null;
    const filterAndRecurse = (currentTasks: StrategicSubTask[]): StrategicSubTask[] => {
        const result: StrategicSubTask[] = [];
        for (const task of currentTasks) {
            if (task.id === taskIdToRemove) {
                if (!taskInstance) { 
                    taskInstance = { ...task }; 
                }
            } else {
                let processedTask = { ...task };
                if (task.subTasks && task.subTasks.length > 0) {
                    const subResult = removeTaskRecursive(task.subTasks, taskIdToRemove);
                    if (subResult.removedTask && !taskInstance) {
                        taskInstance = subResult.removedTask;
                    }
                    processedTask.subTasks = subResult.updatedTasks;
                }
                result.push(processedTask);
            }
        }
        return result;
    };
    const finalTasks = filterAndRecurse(tasks);
    return { removedTask: taskInstance, updatedTasks: finalTasks };
  };

const addTaskRecursive = (tasks: StrategicSubTask[], taskToAdd: StrategicSubTask, parentId: string | null, newIndex?: number): StrategicSubTask[] => {
    if (parentId === null) {
        let newTasks = [...tasks];
        if (newIndex !== undefined && newIndex >= 0 && newIndex <= newTasks.length) {
            newTasks.splice(newIndex, 0, taskToAdd);
        } else {
            newTasks.push(taskToAdd);
        }
        return newTasks;
    }
    return tasks.map(task => {
        if (task.id === parentId) {
            let newSubTasks = [...(task.subTasks || [])];
             if (newIndex !== undefined && newIndex >= 0 && newIndex <= newSubTasks.length) {
                newSubTasks.splice(newIndex, 0, taskToAdd);
            } else {
                newSubTasks.push(taskToAdd);
            }
            return { ...task, subTasks: newSubTasks };
        }
        return { ...task, subTasks: task.subTasks ? addTaskRecursive(task.subTasks, taskToAdd, parentId, newIndex) : [] };
    });
}

const deleteTaskRecursive = (tasks: StrategicSubTask[], taskId: string): StrategicSubTask[] => {
    let newTasks = tasks.filter(task => task.id !== taskId);
    newTasks = newTasks.map(task => {
        if (task.subTasks) {
            return {...task, subTasks: deleteTaskRecursive(task.subTasks, taskId)};
        }
        return task;
    });
    return newTasks;
};

let mockCompanyRequisites: CompanyRequisites = {
    name: 'ООО "Грибная Радость"',
    legalAddress: '123456, г. Москва, ул. Ленина, д. 1, оф. 101',
    inn: '7712345678',
    ogrn: '1234567890123',
    bankAccount: '40702810000000001234',
    bankName: 'АО "СУПЕРБАНК"',
    bik: '044525123',
    city: 'г. Москва',
    correspondentAccount: '30101810000000000123',
    okpo: '12345678',
    oktmo: '45375000',
    phone: '+74951234567',
    email: 'info@fungfung.ru',
    website: 'https://fungfung.ru'
};

const checkProductionOrderMaterialShortage = (po: ProductionOrder): boolean => {
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

const generateDocument = async (orderId: string, type: DocumentType): Promise<Document> => {
    await delay(500);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    const customer = mockContacts.find(c => c.id === order.contactId);
    if (!customer?.requisites) throw new Error("Customer requisites not found");

    const documentCount = mockDocuments.filter(d => d.type === type).length;
    const newDocument: Document = {
        id: generateId(type),
        type: type,
        number: `${type === 'invoice' ? 'СЧ' : 'ТН'}-${String(documentCount + 1).padStart(5, '0')}`,
        date: new Date().toISOString(),
        orderId: order.id,
        ourRequisites: deepCopy(mockCompanyRequisites),
        customerRequisites: deepCopy(customer.requisites),
        items: deepCopy(order.items),
        totalAmount: order.amount,
        createdAt: new Date().toISOString(),
    };
    mockDocuments.push(newDocument);
    if (type === 'invoice') {
        const orderIndex = mockOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
          mockOrders[orderIndex].isInvoiceSent = true;
        }
    }
    return deepCopy(newDocument);
};


export const apiService = {
  // Contacts
  getContacts: (filters: { searchTerm?: string; viewMode?: 'active' | 'archived'; sortConfig?: SortConfig<Contact>; type?: 'all' | 'client' | 'supplier' }): Promise<Contact[]> => {
    return new Promise((resolve) => {
      delay(300).then(() => {
        let filteredContacts = deepCopy(mockContacts);
        if (filters.viewMode === 'archived') {
            filteredContacts = filteredContacts.filter(c => c.isArchived);
        } else {
            filteredContacts = filteredContacts.filter(c => !c.isArchived);
        }
        
        if (filters.type === 'client') {
            filteredContacts = filteredContacts.filter(c => c.isClient);
        } else if (filters.type === 'supplier') {
            filteredContacts = filteredContacts.filter(c => c.isSupplier);
        }

        if (filters.searchTerm) {
          const lowercasedFilter = filters.searchTerm.toLowerCase();
          filteredContacts = filteredContacts.filter(contact =>
            contact.name.toLowerCase().includes(lowercasedFilter) ||
            (contact.companyName && contact.companyName.toLowerCase().includes(lowercasedFilter)) ||
            (contact.email && contact.email.toLowerCase().includes(lowercasedFilter)) ||
            (contact.phone && contact.phone.includes(lowercasedFilter)) ||
            (contact.requisites?.inn && contact.requisites.inn.includes(lowercasedFilter))
          );
        }
        
        resolve(sortData(filteredContacts, filters.sortConfig || { key: 'name', direction: 'asc' }));
      });
    });
  },
  
  updateContact: (contactData: Contact): Promise<Contact> => {
      return new Promise((resolve, reject) => {
          delay(500).then(() => {
              const index = mockContacts.findIndex(c => c.id === contactData.id);
              if (index !== -1) {
                  mockContacts[index] = { ...mockContacts[index], ...contactData };
                  resolve(deepCopy(mockContacts[index]));
              } else {
                  reject(new Error('Contact not found'));
              }
          });
      });
  },

  addContact: (contactData: Omit<Contact, 'id' | 'isArchived' | 'archivedAt'>): Promise<Contact> => {
      return new Promise((resolve) => {
          delay(500).then(() => {
              const newContact: Contact = {
                  id: `contact${Date.now()}`,
                  isArchived: false,
                  ...contactData,
              };
              mockContacts.push(newContact);
              resolve(deepCopy(newContact));
          });
      });
  },

  archiveContact: (contactId: string, archive: boolean): Promise<{ success: true }> => {
      return new Promise((resolve, reject) => {
          delay(300).then(() => {
              const index = mockContacts.findIndex(c => c.id === contactId);
              if (index !== -1) {
                  mockContacts[index].isArchived = archive;
                  mockContacts[index].archivedAt = archive ? new Date().toISOString() : undefined;
                  resolve({ success: true });
              } else {
                  reject(new Error('Contact not found'));
              }
          });
      });
  },
  
   deleteContact: (contactId: string): Promise<{ success: true }> => {
        return new Promise((resolve, reject) => {
            delay(500).then(() => {
                const index = mockContacts.findIndex(c => c.id === contactId);
                if (index !== -1 && mockContacts[index].isArchived) {
                    mockContacts.splice(index, 1);
                    resolve({ success: true });
                } else if (index === -1) {
                    reject(new Error('Contact not found'));
                } else {
                    reject(new Error('Contact must be archived before deletion'));
                }
            });
        });
    },


  // Orders
  getOrders: (filters: { searchTerm?: string; statusFilter?: OrderStatus | 'Все'; viewMode?: 'active' | 'archived', sortConfig?: SortConfig<Order> }): Promise<Order[]> => {
    return new Promise((resolve) => {
      delay(400).then(() => {
        let filteredOrders = deepCopy(mockOrders);
        if (filters.viewMode === 'archived') {
            filteredOrders = filteredOrders.filter(o => o.isArchived);
        } else {
            filteredOrders = filteredOrders.filter(o => !o.isArchived);
        }

        if (filters.statusFilter && filters.statusFilter !== 'Все') {
            filteredOrders = filteredOrders.filter(o => o.status === filters.statusFilter);
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
            if (order.productionCost !== undefined && order.productionCost !== null) {
              return {
                ...order,
                margin: order.amount - order.productionCost,
              };
            }
            return order;
          });

        resolve(sortData(ordersWithMargin, filters.sortConfig || { key: 'date', direction: 'desc' }));
      });
    });
  },

  getOrderById: (orderId: string): Promise<Order | null> => {
    return new Promise((resolve) => {
      delay(200).then(() => {
        const order = mockOrders.find(o => o.id === orderId);
        resolve(order ? deepCopy(order) : null);
      });
    });
  },
  
  addOrder: (orderData: Omit<Order, 'id' | 'isArchived' | 'archivedAt' | 'amount' | 'customerName' | 'customerPriority' | 'date' | 'productionOrderStatus'>): Promise<Order> => {
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
            };
            mockOrders.push(newOrder);
            resolve(deepCopy(newOrder));
        });
    });
  },

  updateOrder: (orderData: Order): Promise<Order> => {
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
            const updatedOrder = { 
                ...originalOrder,
                ...orderData, 
                customerName: contact.name,
                customerPriority: contact.priority,
                amount: orderData.items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0),
            };

            // If status changes to "Собран", deduct stock
            if (updatedOrder.status === 'Собран' && originalOrder.status !== 'Собран') {
                const user = await authService.getCurrentUser();
                updatedOrder.items.forEach(orderItem => {
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
                            reason: `Сборка заказа #${updatedOrder.id}`,
                            relatedOrderId: updatedOrder.id,
                        };
                        if (!whItem.history) whItem.history = [];
                        whItem.history.push(historyEntry);
                        
                        // Active Trigger for low stock
                        if (whItem.lowStockThreshold !== undefined && newQuantity <= whItem.lowStockThreshold) {
                            eventManager.dispatch('stock.below_threshold', { item: whItem, itemType: 'warehouse' });
                        }
                    }
                });
            }

            // --- Payment Transaction Logic ---
            const wasPaid = originalOrder.isPaid;
            const isNowPaid = updatedOrder.isPaid;

            if (!wasPaid && isNowPaid) {
                // ... (transaction creation logic as before)
            } else if (wasPaid && !isNowPaid) {
                // ... (transaction archival logic as before)
            }
            
            mockOrders[index] = updatedOrder;
            resolve(deepCopy(updatedOrder));
        });
    });
  },
  
  archiveOrder: (orderId: string, archive: boolean): Promise<{success: true}> => {
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
  },

  deleteOrder: (orderId: string): Promise<{success: true}> => {
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
  },
  
   checkOrderAvailability: (items: OrderItem[]): Promise<{ allAvailable: boolean, itemAvailability: Record<string, { available: number, needed: number }> }> => {
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
  },
   createProductionOrderFromSalesOrder(orderId: string): Promise<ProductionOrder> {
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
                    id: generateProductionOrderItemId(),
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
  },

  updateOrderItemAssembledStatus(orderId: string, itemId: string, isAssembled: boolean, userId: string): Promise<Order> {
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
                const user = MOCK_USERS.find(u => u.id === userId);
                order.items[itemIndex].assembledBy = { userId, userName: user?.name, timestamp: new Date().toISOString() };
            } else {
                order.items[itemIndex].assembledBy = undefined;
            }
            
            const allAssembled = order.items.every(i => i.isAssembled);
            if (allAssembled && order.status !== 'Собран') {
                order.status = 'Собран';
            } else if (!allAssembled && order.status === 'Собран') {
                // If an item is unchecked, revert status.
                order.status = 'В обработке'; 
            }
            
            mockOrders[orderIndex] = order;
            resolve(deepCopy(order));
        });
    });
  },

  // Users / Hierarchy
  getUsersWithHierarchyDetails(): Promise<User[]> {
    return new Promise(resolve => {
        delay(300).then(() => resolve(deepCopy(authService.getMockUsers())));
    });
  },

  getUsersForAssignee(currentUserId: string): Promise<User[]> {
      return new Promise(resolve => {
          delay(100).then(() => {
              const users = authService.getMockUsers().filter(u => u.status !== 'fired');
              resolve(deepCopy(users));
          });
      });
  },

  getAvailableFunctionalRoles(): Promise<string[]> {
      return new Promise(resolve => {
          const roles = new Set<string>();
          authService.getMockUsers().forEach(user => {
              user.functionalRoles?.forEach(role => roles.add(role));
          });
          resolve(Array.from(roles).sort());
      });
  },
   getAvailableFunctionalRolesSync(): string[] {
      const roles = new Set<string>();
      authService.getMockUsers().forEach(user => {
          user.functionalRoles?.forEach(role => roles.add(role));
      });
      return Array.from(roles).sort();
  },

  updateUserProfile: async (userId: string, profileData: Partial<User>): Promise<User> => {
      await delay(400);
      const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
      if (userIndex === -1) {
          throw new Error('User not found');
      }
      
      const updatedUser = { ...MOCK_USERS[userIndex], ...profileData };
      
      authService.updateMockUser(updatedUser as User); // Use the central service to update
      
      const updatedUserFromService = authService.getMockUsers().find(u => u.id === userId);

      if(!updatedUserFromService) throw new Error("Update failed in mock service.");
      
      return deepCopy(updatedUserFromService as User);
  },
  
  async getMaterialRequirements(): Promise<MaterialRequirement[]> {
    await delay(400);

    const activePOs = mockProductionOrders.filter(po => 
        !po.isArchived && 
        ['Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве', 'Контроль качества', 'Приостановлено'].includes(po.status)
    );

    const requirementsMap = new Map<string, MaterialRequirement>();

    for (const po of activePOs) {
        for (const item of po.orderItems) {
            if (!item.billOfMaterialsSnapshot) continue;
            for (const bomItem of item.billOfMaterialsSnapshot) {
                const totalRequiredForThisPO = bomItem.quantityPerUnit * item.plannedQuantity;
                
                let req = requirementsMap.get(bomItem.householdItemId);

                if (!req) {
                    const stockItem = mockHouseholdItems.find(i => i.id === bomItem.householdItemId);
                    req = {
                        householdItemId: bomItem.householdItemId,
                        householdItemName: bomItem.householdItemName,
                        unit: bomItem.unit,
                        totalRequired: 0,
                        inStock: stockItem ? stockItem.quantity : 0,
                        deficit: 0, // will be calculated later
                        relatedPOs: [],
                    };
                }

                req.totalRequired += totalRequiredForThisPO;
                
                const existingPOEntry = req.relatedPOs.find(rpo => rpo.id === po.id);
                if (existingPOEntry) {
                    existingPOEntry.qty += totalRequiredForThisPO;
                } else {
                    req.relatedPOs.push({ id: po.id, name: po.name, qty: totalRequiredForThisPO });
                }

                requirementsMap.set(bomItem.householdItemId, req);
            }
        }
    }

    const finalRequirements = Array.from(requirementsMap.values());
    finalRequirements.forEach(req => {
        req.deficit = Math.max(0, req.totalRequired - req.inStock);
    });

    return finalRequirements.sort((a, b) => b.deficit - a.deficit);
  },

  // Dashboard
  getDashboardSummary(): Promise<{ newOrders: Order[]; outstandingInvoices: Order[]; productionOrdersNeedingReview: ProductionOrder[] }> {
    return new Promise(resolve => {
      delay(500).then(() => {
        const newOrders = mockOrders.filter(o => o.status === 'Новый' || o.status === 'В обработке' || o.status === 'Может быть собран' || o.status === 'Не может быть собран');
        const outstandingInvoices = mockOrders.filter(o => !o.isPaid && o.status !== 'Отменен');
        const productionOrdersNeedingReview = mockProductionOrders.filter(po => po.needsReviewAfterSalesOrderUpdate);
        resolve({ newOrders: deepCopy(newOrders), outstandingInvoices: deepCopy(outstandingInvoices), productionOrdersNeedingReview: deepCopy(productionOrdersNeedingReview) });
      });
    });
  },
  
  getDashboardKanbanSummary(): Promise<{ totalActiveTasks: number; tasksByStatus: Record<KanbanTaskStatus, number>; workloadByUser: { userId: string; userName: string; taskCount: number }[], overdueTasksCount: number }> {
    return new Promise(resolve => {
        delay(500).then(() => {
            const activeTasks = mockKanbanTasks.filter(t => !t.isArchived);
            const tasksByStatus = {
                [KanbanTaskStatus.TODO]: activeTasks.filter(t => t.status === KanbanTaskStatus.TODO).length,
                [KanbanTaskStatus.IN_PROGRESS]: activeTasks.filter(t => t.status === KanbanTaskStatus.IN_PROGRESS).length,
                [KanbanTaskStatus.DONE]: activeTasks.filter(t => t.status === KanbanTaskStatus.DONE).length,
            };
            
            const workloadMap: Record<string, { userName: string, taskCount: number }> = {};
            activeTasks.forEach(task => {
                if(task.assigneeId) {
                    if(!workloadMap[task.assigneeId]) {
                        const user = MOCK_USERS.find(u => u.id === task.assigneeId);
                        workloadMap[task.assigneeId] = { userName: user?.name || `User ${task.assigneeId}`, taskCount: 0};
                    }
                    workloadMap[task.assigneeId].taskCount++;
                }
            });
            const workloadByUser = Object.entries(workloadMap).map(([userId, data]) => ({
                userId, ...data
            })).sort((a,b) => b.taskCount - a.taskCount);

            const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== KanbanTaskStatus.DONE);
            overdueTasks.forEach(task => {
                eventManager.dispatch('task.overdue', { task });
            });
            const overdueTasksCount = overdueTasks.length;

            resolve({
                totalActiveTasks: activeTasks.length,
                tasksByStatus,
                workloadByUser,
                overdueTasksCount,
            });
        });
    });
  },

  getPersonalDashboardSummary: async (userId: string): Promise<PersonalDashboardSummary> => {
    await delay(500);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) {
        throw new Error("User not found for personal dashboard summary.");
    }

    const allUserTasks = mockKanbanTasks.filter(t => t.assigneeId === userId);
    const activeTasks = allUserTasks.filter(t => !t.isArchived);
    const overdueTasks = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== KanbanTaskStatus.DONE);

    // Sort by priority then due date to get top tasks
    const topTasks = activeTasks
        .filter(t => t.status !== KanbanTaskStatus.DONE)
        .sort((a, b) => {
            const priorityA = parseInt(a.priority || '4');
            const priorityB = parseInt(b.priority || '4');
            if (priorityA !== priorityB) return priorityA - priorityB;
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dateA - dateB;
        })
        .slice(0, 5);

    const inProgressGoals = (user.developmentPlan || []).filter(g => g.status === 'in_progress');

    const recentAchievements = (user.achievements || [])
        .sort((a, b) => new Date(b.dateAwarded).getTime() - new Date(a.dateAwarded).getTime())
        .slice(0, 3);
        
    const displayedBadge = user.displayedAchievementId
        ? (user.achievements || []).find(ach => ach.id === user.displayedAchievementId) || null
        : null;

    const summary: PersonalDashboardSummary = {
        tasks: {
            activeCount: activeTasks.filter(t => t.status !== KanbanTaskStatus.DONE).length,
            overdueCount: overdueTasks.length,
            topTasks: topTasks,
        },
        development: {
            inProgressGoals: inProgressGoals,
        },
        achievements: {
            recentAchievements: recentAchievements,
            displayedBadge: displayedBadge,
        },
        user: deepCopy(user), // Return a copy of the user object
    };
    return summary;
  },

  getLowStockItems: async (): Promise<LowStockItem[]> => {
    await delay(500);
    const lowStock: LowStockItem[] = [];

    mockWarehouseItems.forEach(item => {
        if (!item.isArchived && item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
            lowStock.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                lowStockThreshold: item.lowStockThreshold,
                unit: 'шт.',
                type: 'warehouse',
            });
        }
    });

    mockHouseholdItems.forEach(item => {
        if (!item.isArchived && item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
            lowStock.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                lowStockThreshold: item.lowStockThreshold,
                unit: item.unit,
                type: 'household',
            });
        }
    });

    return lowStock;
  },

  // Development and Training
  getTrainingCourses: async (): Promise<TrainingCourse[]> => {
    await delay(300);
    return deepCopy(mockTrainingCourses);
  },

  updateUserDevelopmentPlan: async (userId: string, plan: DevelopmentPlanItem[]): Promise<User> => {
    await delay(400);
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    const updatedUser = { ...MOCK_USERS[userIndex], developmentPlan: plan };
    authService.updateMockUser(updatedUser as User);
    return deepCopy(updatedUser as User);
  },

  submitTrainingApplication: async (applicationData: Omit<TrainingApplication, 'id'|'submittedAt'|'status'>): Promise<TrainingApplication> => {
    await delay(500);
    const user = MOCK_USERS.find(u => u.id === applicationData.userId);
    if (!user) throw new Error("User not found");
    
    // In a real app, this would be more complex, but for mock, we just add it to the user.
    const newApplication: TrainingApplication = {
      ...applicationData,
      id: generateId('ta'),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    if (!user.trainingApplications) {
      user.trainingApplications = [];
    }
    user.trainingApplications.push(newApplication);
    authService.updateMockUser(user);

    // Notify manager/ceo
    const manager = user.managerId ? MOCK_USERS.find(u => u.id === user.managerId) : MOCK_USERS.find(u => u.role === 'ceo');
    if (manager) {
      const notification = createSystemNotification(
        manager.id,
        'info',
        `Сотрудник ${user.name} подал заявку на курс: "${applicationData.courseTitle}"`,
        `/hierarchy`, // Link to hierarchy page to open profile
        { type: 'system', id: newApplication.id }
      );
      mockNotifications.unshift(notification);
    }

    return deepCopy(newApplication);
  },

  generatePerformanceReviewDraft: async (context: {
    userName: string;
    userRole: string;
    completedTasks: string; // Plain text list of tasks
    positiveFeedback: string; // Notes on positive feedback
    challenges: string; // Notes on challenges or areas for improvement
    collectiveGoals: string; // Company/team goals for the next period
  }): Promise<{ strengths: string; areasForImprovement: string; goalsForNextPeriod: string; }> => {
    if (!process.env.API_KEY) {
      console.error("API_KEY for Gemini is not configured.");
      await delay(1000);
      return {
        strengths: `* Mock: Вклад в задачи, связанные с "${context.collectiveGoals || 'общими целями'}".\n* Mock: Проявлена инициатива в "${context.positiveFeedback || 'различных ситуациях'}".`,
        areasForImprovement: `* Mock: Требуется больше внимания к "${context.challenges || 'сложным задачам'}".\n* Mock: Необходимо улучшить взаимодействие с командой для достижения общих целей.`,
        goalsForNextPeriod: `* Mock: Изучить новые технологии, связанные с "${context.collectiveGoals || 'будущими проектами'}".\n* Mock: Улучшить документирование процессов.`,
      };
    }
    const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

    const systemInstruction = `Ты - опытный и справедливый руководитель-марксист на социалистическом предприятии. Твоя задача - помочь составить конструктивный отзыв (performance review) для товарища.
    Твои ответы должны быть структурированными и соответствовать JSON-схеме.
    - В "сильных сторонах" отмечай вклад в общее дело, помощь товарищам, инициативность и качественное выполнение плановых задач.
    - В "зонах роста" делай акцент не на личных недостатках, а на тех областях, где коллектив может помочь товарищу вырасти, и где его рост принесет пользу общему делу. Критика должна быть товарищеской и конструктивной.
    - В "целях" формулируй конкретные, измеримые задачи, которые помогут товарищу развить свои навыки и внести больший вклад в достижение общих стратегических целей предприятия.`;
    
    const prompt = `Проанализируй следующие данные по товарищу ${context.userName} (роль: ${context.userRole}) и сгенерируй черновик отзыва.

- Выполненные задачи и достижения за период:
${context.completedTasks || 'Не указаны'}

- Положительная обратная связь и наблюдения:
${context.positiveFeedback || 'Не указаны'}

- Трудности и моменты, требующие внимания:
${context.challenges || 'Не указаны'}

- Общие цели коллектива на следующий период:
${context.collectiveGoals || 'Не указаны'}
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        strengths: {
          type: Type.STRING,
          description: "Анализ сильных сторон и положительного вклада товарища. Формат: Markdown, список.",
        },
        areasForImprovement: {
          type: Type.STRING,
          description: "Конструктивный анализ областей для роста и развития. Формат: Markdown, список.",
        },
        goalsForNextPeriod: {
          type: Type.STRING,
          description: "Предлагаемые цели для товарища на следующий период, согласованные с целями коллектива. Формат: Markdown, список.",
        },
      },
      required: ["strengths", "areasForImprovement", "goalsForNextPeriod"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  },
  getWarehouseItems: async (filters: { searchTerm?: string; viewMode?: 'active' | 'archived' }): Promise<WarehouseItem[]> => {
    await delay(300);
    let items = deepCopy(mockWarehouseItems);
    if (filters.viewMode === 'archived') {
      items = items.filter(i => i.isArchived);
    } else {
      items = items.filter(i => !i.isArchived);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term));
    }
    return items.map(item => ({
        ...item,
        locationName: mockStorageLocations.find(l => l.id === item.location)?.name || item.location,
        openIncidentsCount: mockWarehouseIncidents.filter(inc => inc.warehouseItemId === item.id && !inc.isResolved).length
    }));
  },

    getWarehouseItemById: async (id: string): Promise<WarehouseItem | null> => {
        await delay(100);
        const item = mockWarehouseItems.find(i => i.id === id);
        if (!item) return null;
        
        const fullItem = deepCopy(item);
        fullItem.history = fullItem.history?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
        fullItem.openIncidentsCount = mockWarehouseIncidents.filter(inc => inc.warehouseItemId === item.id && !inc.isResolved).length;

        return fullItem;
    },

    addWarehouseItem: async (itemData: Omit<WarehouseItem, 'id' | 'isArchived' | 'lastUpdated'| 'archivedAt' | 'history' | 'openIncidentsCount'>): Promise<WarehouseItem> => {
        await delay(400);
        const newItem: WarehouseItem = {
            id: generateId('wh'),
            ...itemData,
            isArchived: false,
            lastUpdated: new Date().toISOString(),
            history: [{
                id: generateId('whh'),
                timestamp: new Date().toISOString(),
                userId: 'system',
                changeType: 'initial',
                quantityChange: itemData.quantity,
                newQuantity: itemData.quantity,
                reason: 'Создание товара',
            }],
            openIncidentsCount: 0,
        };
        mockWarehouseItems.push(newItem);
        return deepCopy(newItem);
    },

    updateWarehouseItem: async (itemData: WarehouseItem): Promise<WarehouseItem> => {
        await delay(400);
        const index = mockWarehouseItems.findIndex(i => i.id === itemData.id);
        if (index === -1) throw new Error("Item not found");
        const updatedItem = { ...mockWarehouseItems[index], ...itemData, lastUpdated: new Date().toISOString() };
        mockWarehouseItems[index] = updatedItem;
        
        // Dispatch event if stock is low (Task 1.1 Trigger)
        if (updatedItem.lowStockThreshold !== undefined && updatedItem.quantity <= updatedItem.lowStockThreshold) {
            eventManager.dispatch('stock.below_threshold', { item: updatedItem, itemType: 'warehouse' });
        }
        
        return deepCopy(updatedItem);
    },

    archiveWarehouseItem: async (id: string, archive: boolean): Promise<{ success: true }> => {
        await delay(300);
        const index = mockWarehouseItems.findIndex(i => i.id === id);
        if (index === -1) throw new Error("Item not found");
        mockWarehouseItems[index].isArchived = archive;
        mockWarehouseItems[index].archivedAt = archive ? new Date().toISOString() : undefined;
        mockWarehouseItems[index].lastUpdated = new Date().toISOString();
        return { success: true };
    },

    deleteWarehouseItem: async (id: string): Promise<{ success: true }> => {
        await delay(500);
        const index = mockWarehouseItems.findIndex(i => i.id === id);
        if (index !== -1 && mockWarehouseItems[index].isArchived) {
            mockWarehouseItems.splice(index, 1);
            return { success: true };
        }
        if (index === -1) throw new Error("Item not found");
        throw new Error("Item must be archived before deletion");
    },
    
    updateWarehouseItemQuantity: async (itemId: string, quantityChange: number, userId: string, reason: string): Promise<WarehouseItem> => {
        await delay(400);
        const index = mockWarehouseItems.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error("Item not found");

        const item = mockWarehouseItems[index];
        const newQuantity = item.quantity + quantityChange;
        const user = MOCK_USERS.find(u => u.id === userId);

        const historyEntry: WarehouseItemHistoryEntry = {
            id: generateId('whh'),
            timestamp: new Date().toISOString(),
            userId,
            userName: user?.name,
            changeType: quantityChange > 0 ? 'increment' : 'decrement',
            quantityChange,
            newQuantity,
            reason
        };
        
        item.quantity = newQuantity;
        item.lastUpdated = new Date().toISOString();
        if (!item.history) item.history = [];
        item.history.push(historyEntry);
        
        // Dispatch event if stock is low (Task 1.1 Trigger)
        if (item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold) {
            eventManager.dispatch('stock.below_threshold', { item, itemType: 'warehouse' });
        }
        
        return deepCopy(item);
    },
    getIncidentsForItem: async(itemId: string): Promise<WarehouseItemIncident[]> => {
        await delay(200);
        return deepCopy(mockWarehouseIncidents.filter(inc => inc.warehouseItemId === itemId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    },
    
    addIncident: async(incidentData: Omit<WarehouseItemIncident, 'id'|'timestamp'|'isResolved'|'userName'>, files?: File[]): Promise<WarehouseItemIncident> => {
        await delay(400);
        const user = MOCK_USERS.find(u => u.id === incidentData.userId);
         const attachments: FileAttachment[] = (files || []).map(file => ({
            id: generateId('file'),
            name: file.name,
            url: `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(file.name)}`, // Mock URL
            type: file.type,
            size: file.size,
            timestamp: new Date().toISOString(),
        }));
        const newIncident: WarehouseItemIncident = {
            ...incidentData,
            id: generateId('inc'),
            timestamp: new Date().toISOString(),
            userName: user?.name,
            isResolved: false,
            attachments,
        };
        mockWarehouseIncidents.push(newIncident);

        const itemIndex = mockWarehouseItems.findIndex(i => i.id === incidentData.warehouseItemId);
        if(itemIndex > -1) {
            mockWarehouseItems[itemIndex].openIncidentsCount = (mockWarehouseItems[itemIndex].openIncidentsCount || 0) + 1;
        }

        return deepCopy(newIncident);
    },

    resolveIncident: async(incidentId: string, userId: string, notes?: string): Promise<WarehouseItemIncident> => {
        await delay(400);
        const index = mockWarehouseIncidents.findIndex(i => i.id === incidentId);
        if (index === -1) throw new Error("Incident not found");
        
        const user = MOCK_USERS.find(u => u.id === userId);
        mockWarehouseIncidents[index].isResolved = true;
        mockWarehouseIncidents[index].resolvedAt = new Date().toISOString();
        mockWarehouseIncidents[index].resolvedBy = { userId, userName: user?.name };
        mockWarehouseIncidents[index].resolverNotes = notes;

        const itemIndex = mockWarehouseItems.findIndex(i => i.id === mockWarehouseIncidents[index].warehouseItemId);
        if(itemIndex > -1) {
             mockWarehouseIncidents[itemIndex].openIncidentsCount = Math.max(0, (mockWarehouseIncidents[itemIndex].openIncidentsCount || 1) - 1);
        }

        return deepCopy(mockWarehouseIncidents[index]);
    },
     getStorageLocations: async (filters: { searchTerm?: string; viewMode: 'active' | 'archived' }): Promise<StorageLocation[]> => {
        await delay(200);
        let locations = deepCopy(mockStorageLocations);
        if(filters.viewMode === 'archived') {
            locations = locations.filter(loc => loc.isArchived);
        } else {
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
    },

    addStorageLocation: async(locationData: Omit<StorageLocation, 'id'|'isArchived'|'archivedAt'|'createdAt'|'updatedAt'>): Promise<StorageLocation> => {
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
    },
     updateStorageLocation: async(locationData: StorageLocation): Promise<StorageLocation> => {
        await delay(300);
        const index = mockStorageLocations.findIndex(l => l.id === locationData.id);
        if(index === -1) throw new Error("Storage Location not found");
        mockStorageLocations[index] = {...mockStorageLocations[index], ...locationData, updatedAt: new Date().toISOString()};
        return deepCopy(mockStorageLocations[index]);
    },

    archiveStorageLocation: async(id: string, archive: boolean): Promise<{success: true}> => {
        await delay(300);
        const index = mockStorageLocations.findIndex(l => l.id === id);
        if(index === -1) throw new Error("Storage Location not found");
        mockStorageLocations[index].isArchived = archive;
        mockStorageLocations[index].archivedAt = archive ? new Date().toISOString() : undefined;
        mockStorageLocations[index].updatedAt = new Date().toISOString();
        return {success: true};
    },

    deleteStorageLocation: async(id: string): Promise<{success: true}> => {
        await delay(400);
        const index = mockStorageLocations.findIndex(l => l.id === id);
        if (index !== -1 && mockStorageLocations[index].isArchived) {
            mockStorageLocations.splice(index, 1);
            return {success: true};
        }
        if (index === -1) throw new Error("Storage Location not found");
        throw new Error("Storage Location must be archived before deletion");
    },
    
    getAvailableStorageTags: async(): Promise<StorageTag[]> => {
        await delay(100);
        return deepCopy(mockStorageTags);
    },
    getHouseholdItems: async (filters: { viewMode?: 'active' | 'archived', searchTerm?: string, category?: HouseholdCategory }): Promise<HouseholdItem[]> => {
        await delay(300);
        let items = deepCopy(mockHouseholdItems);
        if(filters.viewMode === 'archived') items = items.filter(i => i.isArchived);
        else items = items.filter(i => !i.isArchived);

        if(filters.category) items = items.filter(i => i.category === filters.category);
        if(filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(term) || i.notes?.toLowerCase().includes(term));
        }
        return items.sort((a,b) => a.name.localeCompare(b.name));
    },

    addHouseholdItem: async(itemData: Omit<HouseholdItem, 'id' | 'isArchived' | 'archivedAt' | 'lastUpdated'>): Promise<HouseholdItem> => {
        await delay(400);
        const newItem: HouseholdItem = {
            ...itemData,
            id: generateId('hh'),
            isArchived: false,
            lastUpdated: new Date().toISOString()
        };
        mockHouseholdItems.push(newItem);
        return deepCopy(newItem);
    },

    updateHouseholdItem: async(itemData: HouseholdItem): Promise<HouseholdItem> => {
        await delay(400);
        const index = mockHouseholdItems.findIndex(i => i.id === itemData.id);
        if(index === -1) throw new Error("Household item not found");
        mockHouseholdItems[index] = {...mockHouseholdItems[index], ...itemData, lastUpdated: new Date().toISOString()};
        const updatedItem = mockHouseholdItems[index];

        // Dispatch event if stock is low (Task 1.1 Trigger)
        if (updatedItem.lowStockThreshold !== undefined && updatedItem.quantity <= updatedItem.lowStockThreshold) {
            eventManager.dispatch('stock.below_threshold', { item: updatedItem, itemType: 'household' });
        }
        
        return deepCopy(updatedItem);
    },
    
    archiveHouseholdItem: async(id: string, archive: boolean): Promise<{success: true}> => {
        await delay(300);
        const index = mockHouseholdItems.findIndex(i => i.id === id);
        if(index === -1) throw new Error("Household item not found");
        mockHouseholdItems[index].isArchived = archive;
        mockHouseholdItems[index].archivedAt = archive ? new Date().toISOString() : undefined;
        mockHouseholdItems[index].lastUpdated = new Date().toISOString();
        return {success: true};
    },

    deleteHouseholdItem: async(id: string): Promise<{success: true}> => {
        await delay(500);
        const index = mockHouseholdItems.findIndex(i => i.id === id);
        if(index > -1 && mockHouseholdItems[index].isArchived) {
            mockHouseholdItems.splice(index, 1);
            return {success: true};
        }
        if(index === -1) throw new Error("Household item not found");
        throw new Error("Household item must be archived before deletion");
    },
     getKanbanBoards: async (userId: string, functionalRoles: string[], includeArchived = false): Promise<KanbanBoard[]> => {
        await delay(200);
        let boards = deepCopy(mockKanbanBoards);
        if(!includeArchived) {
            boards = boards.filter(b => !b.isArchived);
        }
        const user = MOCK_USERS.find(u => u.id === userId);
        if(user?.role === 'ceo') return boards;

        return boards.filter(board => 
            board.accessRules.length === 0 || // Public board
            board.ownerId === userId ||
            board.accessRules.some(rule => 
                (rule.entityType === 'user' && rule.entityId === userId) ||
                (rule.entityType === 'role' && functionalRoles.includes(rule.entityId))
            )
        );
    },

    getKanbanBoardById: async (boardId: string): Promise<KanbanBoard | null> => {
        await delay(100);
        const board = mockKanbanBoards.find(b => b.id === boardId);
        return board ? deepCopy(board) : null;
    },

    addKanbanBoard: async (boardData: Omit<KanbanBoard, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt'>): Promise<KanbanBoard> => {
        await delay(400);
        const newBoard: KanbanBoard = {
            ...boardData,
            id: generateId('board'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isArchived: false,
        };
        mockKanbanBoards.push(newBoard);
        return deepCopy(newBoard);
    },

    updateKanbanBoard: async (boardData: KanbanBoard): Promise<KanbanBoard> => {
        await delay(400);
        const index = mockKanbanBoards.findIndex(b => b.id === boardData.id);
        if(index === -1) throw new Error("Board not found");
        mockKanbanBoards[index] = {...mockKanbanBoards[index], ...boardData, updatedAt: new Date().toISOString()};
        return deepCopy(mockKanbanBoards[index]);
    },

    archiveKanbanBoard: async (boardId: string, archive: boolean): Promise<{success: true}> => {
        await delay(300);
        const index = mockKanbanBoards.findIndex(b => b.id === boardId);
        if(index === -1) throw new Error("Board not found");
        mockKanbanBoards[index].isArchived = archive;
        mockKanbanBoards[index].archivedAt = archive ? new Date().toISOString() : undefined;
        mockKanbanBoards[index].updatedAt = new Date().toISOString();
        return {success: true};
    },

    deleteKanbanBoard: async (boardId: string): Promise<{success: true}> => {
        await delay(500);
        const index = mockKanbanBoards.findIndex(b => b.id === boardId);
        if(index > -1 && mockKanbanBoards[index].isArchived) {
            mockKanbanBoards.splice(index, 1);
            // Also remove this board from all tasks
            mockKanbanTasks.forEach(task => {
                task.boardIds = task.boardIds.filter(id => id !== boardId);
            });
            return {success: true};
        }
        if (index === -1) throw new Error("Board not found");
        throw new Error("Board must be archived before deletion");
    },
    getKanbanTasks: async (filters: { viewMode?: 'active' | 'archived' | 'all', boardId?: string, assigneeId?: string, status?: KanbanTaskStatus[], startDate?: string, endDate?: string, showInMyTasks?: boolean, selfAssigned?: boolean }): Promise<KanbanTask[]> => {
      await delay(400);
      let tasks = deepCopy(mockKanbanTasks);

      if (filters.viewMode === 'active') tasks = tasks.filter(t => !t.isArchived);
      else if (filters.viewMode === 'archived') tasks = tasks.filter(t => t.isArchived);

      if (filters.boardId) tasks = tasks.filter(t => t.boardIds.includes(filters.boardId));
      if (filters.assigneeId) tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
      if (filters.status) tasks = tasks.filter(t => filters.status?.includes(t.status));
      if (filters.showInMyTasks) tasks = tasks.filter(t => t.showInMyTasks);
      if (filters.selfAssigned) tasks = tasks.filter(t => t.selfAssigned);
      
      if(filters.startDate) tasks = tasks.filter(t => new Date(t.movedToDoneAt || t.createdAt) >= new Date(filters.startDate!));
      if(filters.endDate) tasks = tasks.filter(t => new Date(t.movedToDoneAt || t.createdAt) <= new Date(filters.endDate!));
      return tasks;
    },
    getKanbanTaskById: async (taskId: string): Promise<KanbanTask | null> => {
        await delay(200);
        const task = mockKanbanTasks.find(t => t.id === taskId);
        return task ? deepCopy(task) : null;
    },
    addKanbanTask: async (taskData: Omit<KanbanTask, 'id' | 'isArchived' | 'archivedAt' | 'archivedStatus' | 'createdAt' | 'updatedAt' | 'assignee' | 'movedToDoneAt' | 'subTasks' | 'activeTaskStage' | 'taskStagePotentialHistory' | 'taskStageContradictionsHistory' | 'taskStageSolutionHistory' | 'coefficient'>): Promise<KanbanTask> => {
        await delay(400);
        const newTask: KanbanTask = {
        ...taskData,
        id: generateId('task'),
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subTasks: [],
        taskStagePotentialHistory: [],
        taskStageContradictionsHistory: [],
        taskStageSolutionHistory: [],
        };
        mockKanbanTasks.push(newTask);

        if (newTask.assigneeId) {
            const currentUser = await authService.getCurrentUser();
            if (currentUser?.id !== newTask.assigneeId) {
                const notification = createSystemNotification(
                    newTask.assigneeId,
                    'info',
                    `${currentUser?.name || 'Кто-то'} создал(а) и назначил(а) вам задачу: '${newTask.title}'`,
                    `/kanban/task/${newTask.id}`,
                    { type: 'task', id: newTask.id }
                );
                mockNotifications.unshift(notification);
            }
        }

        return deepCopy(newTask);
    },
    updateKanbanTask: async (taskData: Partial<KanbanTask> & {id: string}): Promise<KanbanTask> => {
        await delay(300);
        const index = mockKanbanTasks.findIndex(t => t.id === taskData.id);
        if (index === -1) throw new Error("Task not found");
        const oldTask = { ...mockKanbanTasks[index] };
        const updatedTask = { ...oldTask, ...taskData, updatedAt: new Date().toISOString() };
        mockKanbanTasks[index] = updatedTask;

        if (taskData.assigneeId && taskData.assigneeId !== oldTask.assigneeId) {
            const currentUser = await authService.getCurrentUser();
            const newAssignee = MOCK_USERS.find(u => u.id === taskData.assigneeId);
            if (newAssignee && currentUser?.id !== newAssignee.id) {
                const notification = createSystemNotification(
                    newAssignee.id,
                    'info',
                    `${currentUser?.name || 'Кто-то'} назначил(а) вам задачу: '${updatedTask.title}'`,
                    `/kanban/task/${updatedTask.id}`,
                    { type: 'task', id: updatedTask.id }
                );
                mockNotifications.unshift(notification);
            }
        }
        return deepCopy(updatedTask);
    },
    addTaskStageEntry: async (taskId: string, stage: 'potential' | 'contradictions' | 'solution', text: string, files: File[]): Promise<KanbanTask> => {
        await delay(500);
        const taskIndex = mockKanbanTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) throw new Error("Task not found");
        const user = await authService.getCurrentUser();
        if (!user) throw new Error("User not authenticated");

        const newEntry: StageEntry = {
        id: generateId('stage-entry'),
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        text: text,
        attachments: files.map(f => ({
            id: generateId('file'), name: f.name, url: `/mock-files/${f.name}`, type: f.type, size: f.size, timestamp: new Date().toISOString()
        }))
        };
        
        const task = mockKanbanTasks[taskIndex];
        if (stage === 'potential') task.taskStagePotentialHistory.push(newEntry);
        else if (stage === 'contradictions') task.taskStageContradictionsHistory.push(newEntry);
        else if (stage === 'solution') task.taskStageSolutionHistory.push(newEntry);

        return deepCopy(task);
    },
      getStrategicPlans: async (filters: { viewMode: 'active' | 'archived' }): Promise<StrategicPlan[]> => {
        await delay(300);
        return deepCopy(mockStrategicPlans).filter(p => filters.viewMode === 'archived' ? p.isArchived : !p.isArchived);
      },
      getStrategicPlanById: async (planId: string): Promise<StrategicPlan | null> => {
        await delay(200);
        const plan = mockStrategicPlans.find(p => p.id === planId);
        return plan ? deepCopy(plan) : null;
      },
      addStrategicPlan: async (planData: Omit<StrategicPlan, 'id'|'subTasks'|'createdAt'|'updatedAt'|'isArchived'|'archivedAt'>): Promise<StrategicPlan> => {
        await delay(400);
        const newPlan: StrategicPlan = {
          ...planData,
          id: generateId('plan'),
          subTasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isArchived: false,
        };
        mockStrategicPlans.push(newPlan);
        return deepCopy(newPlan);
      },
      updateStrategicPlan: async (planData: StrategicPlan): Promise<StrategicPlan> => {
        await delay(400);
        const index = mockStrategicPlans.findIndex(p => p.id === planData.id);
        if (index === -1) throw new Error("Strategic Plan not found");
        mockStrategicPlans[index] = { ...mockStrategicPlans[index], ...planData, updatedAt: new Date().toISOString() };
        return deepCopy(mockStrategicPlans[index]);
      },
      archiveStrategicPlan: async (planId: string, archive: boolean): Promise<{success: true}> => {
        await delay(300);
        const index = mockStrategicPlans.findIndex(p => p.id === planId);
        if (index === -1) throw new Error("Strategic Plan not found");
        mockStrategicPlans[index].isArchived = archive;
        mockStrategicPlans[index].archivedAt = archive ? new Date().toISOString() : undefined;
        mockStrategicPlans[index].updatedAt = new Date().toISOString();
        return { success: true };
      },
      deleteStrategicPlan: async (planId: string): Promise<{success: true}> => {
        await delay(500);
        const index = mockStrategicPlans.findIndex(p => p.id === planId);
        if (index > -1 && mockStrategicPlans[index].isArchived) {
          mockStrategicPlans.splice(index, 1);
          return { success: true };
        }
        if (index === -1) throw new Error("Plan not found");
        throw new Error("Plan must be archived before deletion");
      },
      addStrategicSubTask: async (planId: string, subTaskData: Omit<StrategicSubTask, 'id'|'createdAt'|'updatedAt'|'assignee'|'kanbanTaskId'|'subTasks'>, newIndexInParent?: number): Promise<StrategicPlan> => {
        await delay(300);
        const planIndex = mockStrategicPlans.findIndex(p => p.id === planId);
        if (planIndex === -1) throw new Error("Plan not found");
        const newSubTask: StrategicSubTask = {
          ...subTaskData,
          id: generateId('subtask'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        };
        mockStrategicPlans[planIndex].subTasks = addTaskRecursive(mockStrategicPlans[planIndex].subTasks, newSubTask, subTaskData.parentId || null, newIndexInParent);
        return deepCopy(mockStrategicPlans[planIndex]);
      },
      updateStrategicSubTask: async (planId: string, subTaskData: StrategicSubTask, newIndexInParent?: number): Promise<StrategicPlan> => {
        await delay(300);
        const planIndex = mockStrategicPlans.findIndex(p => p.id === planId);
        if (planIndex === -1) throw new Error("Plan not found");
        const { removedTask } = removeTaskRecursive(mockStrategicPlans[planIndex].subTasks, subTaskData.id);
        if (!removedTask) throw new Error("Subtask to update not found");
    
        const taskToInsert = { ...removedTask, ...subTaskData, updatedAt: new Date().toISOString() };
        const tasksWithoutOld = deleteTaskRecursive(mockStrategicPlans[planIndex].subTasks, subTaskData.id);
        mockStrategicPlans[planIndex].subTasks = addTaskRecursive(tasksWithoutOld, taskToInsert, subTaskData.parentId || null, newIndexInParent);
        
        return deepCopy(mockStrategicPlans[planIndex]);
      },
      deleteStrategicSubTask: async (planId: string, subTaskId: string): Promise<StrategicPlan> => {
        await delay(400);
        const planIndex = mockStrategicPlans.findIndex(p => p.id === planId);
        if (planIndex === -1) throw new Error("Plan not found");
        mockStrategicPlans[planIndex].subTasks = deleteTaskRecursive(mockStrategicPlans[planIndex].subTasks, subTaskId);
        return deepCopy(mockStrategicPlans[planIndex]);
      },
      createKanbanTaskFromStrategicSubTask: async (planId: string, subTaskId: string): Promise<KanbanTask> => {
        await delay(500);
        const plan = mockStrategicPlans.find(p => p.id === planId);
        if (!plan) throw new Error("Plan not found");
        const subTask = findTaskRecursive(plan.subTasks, subTaskId);
        if (!subTask) throw new Error("Subtask not found");
    
        const newKanbanTask: KanbanTask = {
          id: generateId('task'),
          title: subTask.title,
          description: subTask.description || `Задача из стратегического плана: ${plan.title}`,
          status: KanbanTaskStatus.TODO,
          assigneeId: subTask.assigneeId,
          dueDate: subTask.dueDate,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
          checklist: [],
          boardIds: ['board-default'], // Or some other logic
          showInMyTasks: !!subTask.assigneeId,
          strategicSubTaskId: subTask.id,
          taskStagePotentialHistory: [],
          taskStageContradictionsHistory: [],
          taskStageSolutionHistory: [],
        };
        mockKanbanTasks.push(newKanbanTask);
        
        subTask.kanbanTaskId = newKanbanTask.id;
        apiService.updateStrategicPlan(plan);
    
        return deepCopy(newKanbanTask);
      },
      getKnowledgeBaseItems: async (parentId: string | null, userId: string, roles: string[], viewMode: 'active' | 'archived' = 'active'): Promise<KnowledgeBaseItem[]> => {
        await delay(300);
        return deepCopy(mockKnowledgeBaseItems).filter(item => 
            (item.itemType === 'folder' ? item.parentId === parentId : item.folderId === parentId) &&
            (viewMode === 'archived' ? item.isArchived : !item.isArchived)
        ).sort((a,b) => (a.itemType === b.itemType) ? a.name.localeCompare(b.name) : (a.itemType === 'folder' ? -1 : 1));
      },
      getKnowledgeBaseFileContent: async (fileId: string, userId: string, roles: string[]): Promise<KnowledgeBaseFile | null> => {
        await delay(200);
        const file = mockKnowledgeBaseItems.find(item => item.id === fileId && item.itemType === 'file');
        if (!file) {
            return null;
        }
        // Basic permission check - in real app would be more complex
        // For now, allow if no rules or user has a matching rule
        const hasAccess = !file.accessRules || file.accessRules.length === 0 || file.accessRules.some(rule => (rule.entityId === userId && rule.entityType === 'user') || (roles.includes(rule.entityId) && rule.entityType === 'role'));

        if (hasAccess) {
             return deepCopy(file as KnowledgeBaseFile);
        }
        return null;
    },
    createKnowledgeBaseFolder: async (folderData: Omit<KnowledgeBaseFolder, 'id' | 'createdAt' | 'updatedAt' | 'itemType' | 'isArchived' | 'archivedAt'>): Promise<KnowledgeBaseFolder> => {
        await delay(300);
        const newFolder: KnowledgeBaseFolder = {
            ...folderData,
            id: generateId('kb-folder'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            itemType: 'folder',
            isArchived: false,
        };
        mockKnowledgeBaseItems.push(newFolder);
        return deepCopy(newFolder);
    },
    createKnowledgeBaseFile: async (fileData: Omit<KnowledgeBaseFile, 'id' | 'createdAt' | 'updatedAt' | 'itemType' | 'isArchived' | 'archivedAt'>): Promise<KnowledgeBaseFile> => {
        await delay(300);
        const newFile: KnowledgeBaseFile = {
            ...fileData,
            id: generateId('kb-file'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            itemType: 'file',
            isArchived: false,
        };
        mockKnowledgeBaseItems.push(newFile);
        return deepCopy(newFile);
    },
    updateKnowledgeBaseItem: async (itemId: string, updates: Partial<KnowledgeBaseItem>): Promise<KnowledgeBaseItem> => {
        await delay(300);
        const index = mockKnowledgeBaseItems.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error("Knowledge Base Item not found");
        
        const originalItem = mockKnowledgeBaseItems[index];

        if (originalItem.itemType === 'folder') {
            const updatedFolder: KnowledgeBaseFolder = {
                ...originalItem,
                ...(updates as Partial<KnowledgeBaseFolder>),
                updatedAt: new Date().toISOString(),
            };
            mockKnowledgeBaseItems[index] = updatedFolder;
            return deepCopy(updatedFolder);
        } else { // 'file'
            const updatedFile: KnowledgeBaseFile = {
                ...originalItem,
                ...(updates as Partial<KnowledgeBaseFile>),
                updatedAt: new Date().toISOString(),
            };
            mockKnowledgeBaseItems[index] = updatedFile;
            return deepCopy(updatedFile);
        }
    },

    archiveKnowledgeBaseItem: async (itemId: string, archive: boolean): Promise<{ success: true }> => {
        await delay(300);
        const index = mockKnowledgeBaseItems.findIndex(i => i.id === itemId);
        if (index === -1) throw new Error("Knowledge Base Item not found");
        mockKnowledgeBaseItems[index].isArchived = archive;
        (mockKnowledgeBaseItems[index] as any).archivedAt = archive ? new Date().toISOString() : undefined;
        mockKnowledgeBaseItems[index].updatedAt = new Date().toISOString();
        return { success: true };
    },

    deleteKnowledgeBaseItem: async (itemId: string): Promise<{ success: true }> => {
        await delay(500);
        const index = mockKnowledgeBaseItems.findIndex(i => i.id === itemId);
        if (index > -1 && mockKnowledgeBaseItems[index].isArchived) {
            mockKnowledgeBaseItems.splice(index, 1);
            return { success: true };
        }
        if (index === -1) throw new Error("Item not found");
        throw new Error("Item must be archived before deletion");
    },
    
    // Production Orders
    getProductionOrders: async (filters: { searchTerm?: string; statusFilter?: ProductionOrderStatus | 'Все'; viewMode?: 'active' | 'archived' }): Promise<ProductionOrder[]> => {
        await delay(400);
        let orders = deepCopy(mockProductionOrders);
        if (filters.viewMode === 'archived') {
            orders = orders.filter(o => o.isArchived);
        } else {
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
        return orders.sort((a,b) => new Date(