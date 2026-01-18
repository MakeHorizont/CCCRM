
import { ProductionOrder, ProductionOrderItem } from '../../types';
import { generateProductionOrderItemId } from '../../utils/idGenerators';

const today = new Date();
const formatDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
};

const baseProductionOrdersData = [
  {
    id: 'PO-100',
    name: 'Смена #100: Темпе Классик (Завершено)',
    orderItemsRaw: [
      { warehouseItemId: 'TMP001', productName: 'Темпе Классический Соевый 250гр', plannedQuantity: 100, producedQuantity: 105, unit: 'шт' }
    ],
    status: 'Завершено' as ProductionOrder['status'],
    plannedStartDate: formatDate(5),
    plannedEndDate: formatDate(4),
    actualStartDate: formatDate(5),
    actualEndDate: formatDate(4),
    assignedToId: 'user1',
    assigneeName: 'Левченко Роман',
    brigadeMembers: ['user1', 'user3'],
    isPlannedOrder: true,
    createdAt: formatDate(6),
    updatedAt: formatDate(4),
    isArchived: false,
    totalCalculatedCost: 12500,
  },
  {
    id: 'PO-099',
    name: 'Смена #099: Темпе Нут (Завершено)',
    orderItemsRaw: [
      { warehouseItemId: 'TMP004', productName: 'Темпе Классический Нутовый 250гр', plannedQuantity: 50, producedQuantity: 48, unit: 'шт' }
    ],
    status: 'Завершено' as ProductionOrder['status'],
    plannedStartDate: formatDate(10),
    plannedEndDate: formatDate(9),
    actualStartDate: formatDate(10),
    actualEndDate: formatDate(9),
    assignedToId: 'user2',
    assigneeName: 'Кораблева Ульяна',
    brigadeMembers: ['user2'],
    isPlannedOrder: true,
    createdAt: formatDate(11),
    updatedAt: formatDate(9),
    isArchived: false,
    totalCalculatedCost: 8200,
  },
  {
    id: 'PO-001',
    name: 'Активная партия: Темпе Классический #101',
    orderItemsRaw: [
      { warehouseItemId: 'TMP001', productName: 'Темпе Классический Соевый 250гр', plannedQuantity: 100, producedQuantity: 0, unit: 'шт' }
    ],
    status: 'В производстве' as ProductionOrder['status'],
    plannedStartDate: formatDate(1),
    plannedEndDate: formatDate(-2),
    assignedToId: 'user2', 
    assigneeName: 'Кораблева Ульяна',
    brigadeMembers: ['user2', 'user3'],
    isPlannedOrder: false,
    createdAt: formatDate(2),
    updatedAt: formatDate(0),
    isArchived: false,
    needsReviewAfterSalesOrderUpdate: false,
  },
  {
    id: 'PO-002',
    name: 'Срочно: Темпе-Чипсы #55',
    orderItemsRaw: [
      { warehouseItemId: 'CHIP002', productName: 'Темпе-Чипсы Копченые Соевые 100гр', plannedQuantity: 500, producedQuantity: 0, unit: 'шт' }
    ],
    status: 'Ожидает сырья' as ProductionOrder['status'],
    plannedStartDate: formatDate(-2),
    plannedEndDate: formatDate(-5),
    assignedToId: 'user3', 
    assigneeName: 'Сергей Смирнов', 
    brigadeMembers: ['user3'],
    isPlannedOrder: true,
    createdAt: formatDate(1),
    updatedAt: formatDate(0),
    isArchived: false,
    hasMaterialShortage: true,
  },
];

export let mockProductionOrders: ProductionOrder[] = baseProductionOrdersData.map(po => ({
  ...po,
  orderItems: po.orderItemsRaw.map(item => ({
    ...item,
    id: generateProductionOrderItemId(),
    billOfMaterialsSnapshot: [],
  })),
}));
