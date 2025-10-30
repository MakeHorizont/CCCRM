import { PurchaseRequest } from '../../types';

export let mockPurchaseRequests: PurchaseRequest[] = [
  {
    id: 'PR-001',
    name: 'Закупка сырья для ПЗ-002 (Чипсы)',
    createdAt: new Date().toISOString(),
    createdBy: { userId: 'user2', userName: 'Кораблева Ульяна' },
    relatedProductionOrderId: 'PO-002',
    items: [
      { id: 'PRI-1', householdItemId: 'HI010', householdItemName: 'Смесь специй "Для копченых чипсов"', quantityNeeded: 2.5, unit: 'кг', quantityReceived: 0 },
      { id: 'PRI-2', householdItemId: 'HI022', householdItemName: 'Масло подсолнечное рафинированное (для жарки)', quantityNeeded: 10, unit: 'л', quantityReceived: 0 },
    ],
    status: 'Требует утверждения',
    supplierContactId: null,
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
  {
    id: 'PR-002',
    name: 'Плановая закупка соевых бобов',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    createdBy: { userId: 'user1', userName: 'Левченко Роман' },
    relatedProductionOrderId: null,
    items: [
      { id: 'PRI-3', householdItemId: 'HI001', householdItemName: 'Соевые бобы органические', quantityNeeded: 200, unit: 'кг', quantityReceived: 200 },
    ],
    status: 'Получено',
    supplierContactId: 'contact1',
    notes: "Поставка от ООО Ромашка",
    updatedAt: new Date().toISOString(),
    isArchived: false,
  },
];