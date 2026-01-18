
// types/warehouse.ts
import { FileAttachment } from './common';

export interface WarehouseItemHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  changeType: 'initial' | 'increment' | 'decrement' | 'correction' | 'order_fulfillment' | 'order_return' | 'order_cancellation' | 'production_consumption' | 'production_output' | 'reservation' | 'release';
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
  reservedQuantity?: number; // New: Stock reserved for active orders
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

export type HouseholdCategory = 'Упаковка' | 'Сырьё' | 'Хозы' | 'Сантехника' | 'Электрика' | 'Специи' | 'Масла';

export interface HouseholdItem {
  id: string;
  name: string;
  category: HouseholdCategory;
  quantity: number;
  reservedQuantity?: number; // New: Raw materials reserved for active production
  unit: string;
  price: number;
  lastUpdated: string;
  notes?: string;
  isArchived: boolean;
  archivedAt?: string;
  lowStockThreshold?: number;
}

/**
 * Added StorageTag type
 */
export interface StorageTag {
  id: string;
  name: string;
  color?: string;
}

/**
 * Added StorageLocation type
 */
export interface StorageLocation {
  id: string;
  name: string;
  description?: string;
  tags: StorageTag[];
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  equipmentId?: string; // Link to equipment if applicable
}

/**
 * Added InventoryCheckItem type
 */
export interface InventoryCheckItem {
    warehouseItemId: string;
    warehouseItemName: string;
    expectedQuantity: number;
    actualQuantity?: number;
    difference?: number;
}

/**
 * Added InventoryCheck type
 */
export interface InventoryCheck {
    id: string;
    date: string;
    status: 'in_progress' | 'completed';
    items: InventoryCheckItem[];
    conductedByUserId: string;
    conductedByUserName: string;
    createdAt: string;
    completedAt?: string;
    notes?: string;
    blindMode?: boolean;
}
