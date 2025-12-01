// types/production.ts
import { HouseholdItemUsage } from './warehouse';
import { FileAttachment } from './common';

export type TechStepType = 'ingredient' | 'action' | 'process' | 'safety';

export interface TechnologyStep {
  id: string;
  order: number;
  type: TechStepType;
  name: string;
  description?: string;
  componentId?: string;
  componentName?: string;
  plannedQuantity?: number;
  unit?: string;
  requiredEquipmentId?: string;
  requiredEquipmentName?: string;
  durationMinutes?: number;
  powerUsagePercentage?: number;
}

export interface TechnologyCard {
  id: string;
  warehouseItemId: string;
  name: string;
  steps: TechnologyStep[];
  version?: number;
  updatedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export type ProductionOrderStatus =
  | 'Планируется'
  | 'Ожидает сырья'
  | 'Готово к запуску'
  | 'В производстве'
  | 'Контроль качества'
  | 'Приостановлено'
  | 'Завершено'
  | 'Отменено';

export interface ProductionRunStep {
  stepId: string;
  originalStep: TechnologyStep;
  completed: boolean;
  completedAt?: string;
  completedBy?: { userId: string; userName?: string };
  actualQuantity?: number;
  wasteQuantity?: number;
  notes?: string;
  usedEquipmentId?: string;
}

export interface ProductionOrderItem {
  id: string; 
  warehouseItemId: string; 
  productName: string; 
  plannedQuantity: number;
  producedQuantity?: number; 
  unit: string; 
  billOfMaterialsSnapshot?: HouseholdItemUsage[]; 
  productionRun?: ProductionRunStep[];
}

export interface ProductionOrder {
  id: string;
  name: string; 
  orderItems: ProductionOrderItem[]; 
  status: ProductionOrderStatus;
  plannedStartDate?: string; 
  plannedEndDate?: string; 
  actualStartDate?: string; 
  actualEndDate?: string; 
  assignedToId?: string | null;
  assigneeName?: string | null; 
  brigadeMembers?: string[];
  relatedSalesOrderId?: string | null; 
  isPlannedOrder?: boolean; 
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
  needsReviewAfterSalesOrderUpdate?: boolean;
  hasMaterialShortage?: boolean;
  actualLaborHours?: number;
  calculatedRawMaterialCost?: number;
  calculatedLaborCost?: number;
  allocatedOverheadCost?: number;
  totalCalculatedCost?: number;
  financialTransactionsPosted?: boolean;
  brigadeBonus?: number;
}
export type SortableProductionOrderKeys = 'name' | 'status' | 'assigneeName' | 'createdAt';

export interface PurchaseRequestItem {
  id: string;
  householdItemId: string;
  householdItemName: string;
  quantityNeeded: number;
  unit: string;
  quantityReceived?: number;
}

export type PurchaseRequestStatus = 'Черновик' | 'Требует утверждения' | 'Утверждено' | 'Заказано' | 'Частично получено' | 'Получено' | 'Отклонено';

export interface PurchaseRequest {
  id: string;
  name: string;
  createdAt: string;
  createdBy: {
    userId: string;
    userName?: string;
  };
  relatedProductionOrderId?: string | null;
  items: PurchaseRequestItem[];
  status: PurchaseRequestStatus;
  supplierContactId?: string | null;
  notes?: string;
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
}
export type SortablePurchaseRequestKeys = 'name' | 'status' | 'createdAt';

export interface ShiftHandover {
  id: string;
  timestamp: string;
  outgoingUserId: string;
  outgoingUserName: string;
  notes: string;
  issuesFlagged: boolean;
  cleanlinessChecked: boolean;
  equipmentChecked: boolean;
  acceptedByUserId?: string;
  acceptedAt?: string;
}