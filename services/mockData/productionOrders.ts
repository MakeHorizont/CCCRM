import { ProductionOrder, ProductionOrderItem } from '../../types';
import { generateProductionOrderItemId } from '../../utils/idGenerators';
import { mockWarehouseItems } from './warehouseItems'; // Ensure this is imported for BOM snapshot

// Define base structure for mock data, orderItem IDs will be added in the next step
const baseProductionOrdersData = [
  {
    id: 'PO-001',
    name: 'Партия Темпе Классического #101',
    orderItemsRaw: [ // Raw items without ID
      {
        warehouseItemId: 'TMP001',
        productName: 'Темпе Классический Соевый 250гр',
        plannedQuantity: 100,
        producedQuantity: 0,
        unit: 'шт',
        productionRun: [],
        billOfMaterialsSnapshot: [ 
          { householdItemId: 'HI001', householdItemName: 'Соевые бобы органические', quantityPerUnit: 0.15, unit: 'кг' },
          { householdItemId: 'HI005', householdItemName: 'Закваска Rhizopus Oligosporus', quantityPerUnit: 0.5, unit: 'гр' },
        ]
      }
    ],
    status: 'Планируется' as ProductionOrder['status'],
    plannedStartDate: '2024-07-30',
    plannedEndDate: '2024-08-02',
    assignedToId: 'user2', 
    assigneeName: 'Кораблева Ульяна',
    brigadeMembers: ['user2', 'user3'],
    isPlannedOrder: false,
    createdAt: '2024-07-25T10:00:00Z',
    updatedAt: '2024-07-25T10:00:00Z',
    isArchived: false,
    needsReviewAfterSalesOrderUpdate: true,
    notes: 'Клиент изменил количество в заказе, нужно проверить актуальность ПЗ.',
    actualStartDate: undefined,
    actualEndDate: undefined,
    archivedAt: undefined,
    relatedSalesOrderId: undefined,
    financialTransactionsPosted: false,
  },
  {
    id: 'PO-002',
    name: 'Партия Чипсов Копченых #55',
    orderItemsRaw: [ // Raw items without ID
      { 
        warehouseItemId: 'CHIP002',
        productName: 'Темпе-Чипсы Копченые Соевые (со специями) 100гр',
        plannedQuantity: 500,
        producedQuantity: 0,
        unit: 'шт',
        productionRun: [],
        billOfMaterialsSnapshot: mockWarehouseItems.find(item => item.id === 'CHIP002')?.billOfMaterials || [],
      }
    ],
    status: 'Ожидает сырья' as ProductionOrder['status'],
    plannedStartDate: '2024-08-05',
    plannedEndDate: '2024-08-07',
    assignedToId: 'user3', 
    assigneeName: 'Сергей Смирнов', 
    brigadeMembers: ['user3'],
    isPlannedOrder: true,
    createdAt: '2024-07-26T14:00:00Z',
    updatedAt: '2024-07-26T14:00:00Z',
    isArchived: false,
    notes: 'Срочно, под крупный заказ клиента X.',
    relatedSalesOrderId: 'order1', 
    needsReviewAfterSalesOrderUpdate: false,
    actualStartDate: undefined,
    actualEndDate: undefined,
    archivedAt: undefined,
    financialTransactionsPosted: false,
  },
];

// Now, map over the base structure to create the final mockProductionOrders array
// This ensures generateProductionOrderItemId is called after the base array structure is defined.
export let mockProductionOrders: ProductionOrder[] = baseProductionOrdersData.map(po => {
  const orderItemsWithIds: ProductionOrderItem[] = po.orderItemsRaw.map(itemRaw => ({
    ...itemRaw,
    id: generateProductionOrderItemId(), // ID generated here
  }));

  // Construct the full ProductionOrder object, ensuring all fields are present
  const fullProductionOrder: ProductionOrder = {
    id: po.id,
    name: po.name,
    orderItems: orderItemsWithIds,
    status: po.status,
    plannedStartDate: po.plannedStartDate,
    plannedEndDate: po.plannedEndDate,
    actualStartDate: po.actualStartDate,
    actualEndDate: po.actualEndDate,
    assignedToId: po.assignedToId,
    assigneeName: po.assigneeName,
    brigadeMembers: po.brigadeMembers,
    relatedSalesOrderId: po.relatedSalesOrderId,
    isPlannedOrder: po.isPlannedOrder,
    notes: po.notes,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    isArchived: po.isArchived,
    archivedAt: po.archivedAt,
    needsReviewAfterSalesOrderUpdate: po.needsReviewAfterSalesOrderUpdate,
    financialTransactionsPosted: po.financialTransactionsPosted,
  };
  return fullProductionOrder;
});