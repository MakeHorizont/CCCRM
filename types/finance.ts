
// types/finance.ts
import { FileAttachment } from './common';

export type TransactionCategory =
  | 'Продажа товара'
  | 'Закупка сырья'
  | 'Закупка хоз.товаров'
  | 'Аренда'
  | 'Коммунальные услуги'
  | 'Зарплата'
  | 'Ремонт и обслуживание'
  | 'Маркетинг и реклама'
  | 'Налоги'
  | 'Премия'
  | 'Отчисления в фонды'
  | 'Прочее';

// FIX: Added exported SortableTransactionKeys type
export type SortableTransactionKeys = 'date' | 'description' | 'category' | 'amount';

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: TransactionCategory;
  isTaxDeductible?: boolean;
  relatedOrderId?: string | null;
  relatedContactId?: string | null;
  relatedPurchaseRequestId?: string | null;
  relatedProductionOrderId?: string | null;
  relatedEquipmentId?: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
}

export interface MonthlyExpense {
  id: string;
  year: number;
  month: number;
  totalIncome?: number;
  rent: number;
  depreciation: number;
  supplies: number;
  cleaning: number;
  repairs: number;
  updatedAt: string;
  electricityPricePerKwh?: number;
  waterAndOtherUtilities?: number;
  electricityCost?: number;
  isClosed?: boolean;
}

export type EquipmentCategory = 'Подготовка сырья' | 'Термообработка' | 'Смешивание и охлаждение' | 'Упаковка' | 'Хранение' | 'Вспомогательное' | 'Освещение' | 'Другое';
export type EquipmentUsageType = 'on_demand' | 'continuous_24_7' | 'working_hours';

// FIX: Added exported SortableEquipmentKeys type
export type SortableEquipmentKeys = 'name' | 'category' | 'status' | 'cost' | 'amortizationPercentage';

export interface EquipmentAmortization {
  method: 'percentage_of_income';
  cost: number;
  purchaseDate: string;
  amortizationPercentage: number;
}

export type EquipmentStatus = 'operational' | 'in_use' | 'maintenance' | 'broken';

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  cost: number;
  technician: string; // Internal or External name
  technicianContactId?: string; // Link to Contacts for external repairmen
  externalTechnicianInfo?: {
      phone?: string;
      socialLink?: string;
      company?: string;
  };
  partsReplaced?: string[];
  nextScheduledDate?: string;
  isResolved?: boolean;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  description?: string;
  photoUrl?: string;
  powerKw?: number;
  usageType?: EquipmentUsageType;
  vendorLink?: string;
  vendorContact?: string;
  sparePartsLink?: string;
  knowledgeBaseLink?: string; // Links to KB manual
  amortization: EquipmentAmortization;
  attachments?: FileAttachment[];
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  status?: EquipmentStatus;
  currentProductionOrderId?: string | null;
  isStorageLocation?: boolean;
  maintenanceIntervalDays?: number;
  nextMaintenanceDate?: string;
  maintenanceHistory?: MaintenanceRecord[];
}