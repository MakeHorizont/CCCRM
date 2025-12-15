
// types/warehouse.ts
import { FileAttachment } from './common';

export interface WarehouseItemHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  changeType: 'initial' | 'increment' | 'decrement' | 'correction' | 'order_fulfillment' | 'order_return' | 'order_cancellation' | 'production_consumption' | 'production_output';
  quantityChange: number;
  newQuantity: number;
  reason?: string;
  relatedOrderId?: string;
  relatedProductionRunId?: string; 
}

export interface HouseholdItemUsage {
  householdItemId: string;
  householdItemName: string;
  quantityPerUnit: number;
  unit: string;
}

export interface WarehouseItemIncident {
  id: string;
  warehouseItemId: string;
  timestamp: string;
  userId: string;
  userName?: string;
  type: 'damage' | 'shortage' | 'defect' | 'other';
  description: string;
  attachments?: FileAttachment[];
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: { userId: string; userName?: string; };
  resolverNotes?: string;
  relatedDiscussionId?: string | null;
}

export interface WarehouseItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  location: string;
  description?: string;
  lastUpdated: string;
  isArchived: boolean;
  archivedAt?: string;
  history: WarehouseItemHistoryEntry[];
  billOfMaterials?: HouseholdItemUsage[];
  openIncidentsCount?: number;
  locationName?: string;
  lowStockThreshold?: number;
  shippingWeightGrams?: number;
}
export type SortableWarehouseKeys = 'name' | 'sku' | 'quantity' | 'price' | 'locationName' | 'lastUpdated';

export type HouseholdCategory = 'Упаковка' | 'Сырьё' | 'Хозы' | 'Сантехника' | 'Электрика' | 'Специи' | 'Масла';

export interface HouseholdItem {
  id: string;
  name: string;
  category: HouseholdCategory;
  quantity: number;
  unit: string;
  price: number;
  lastUpdated: string;
  notes?: string;
  isArchived: boolean;
  archivedAt?: string;
  lowStockThreshold?: number;
}
export type SortableHouseholdItemKeys = 'name' | 'category' | 'quantity' | 'price' | 'lastUpdated';

export interface StorageTag {
  id: string;
  name: string;
  color?: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  description?: string;
  tags: StorageTag[];
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  equipmentId?: string;
}

export type InventoryCheckStatus = 'in_progress' | 'completed' | 'cancelled';

export interface InventoryCheckItem {
  warehouseItemId: string;
  warehouseItemName: string;
  expectedQuantity: number;
  actualQuantity?: number;
  difference?: number;
}

export interface InventoryCheck {
  id: string;
  date: string;
  status: InventoryCheckStatus;
  items: InventoryCheckItem[];
  conductedByUserId: string;
  conductedByUserName: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  blindMode?: boolean;
}
