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
  relatedEquipmentId?: string | null; // Added for maintenance costs
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
}
export type SortableTransactionKeys = 'date' | 'description' | 'category' | 'amount';

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
  technician: string;
  nextScheduledDate?: string;
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
  knowledgeBaseLink?: string;
  amortization: EquipmentAmortization;
  attachments?: FileAttachment[];
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  status?: EquipmentStatus;
  currentProductionOrderId?: string | null;
  isStorageLocation?: boolean;
  
  // Lean Production / Maintenance
  maintenanceIntervalDays?: number; // Frequency of routine checkups in days
  nextMaintenanceDate?: string;
  maintenanceHistory?: MaintenanceRecord[];
}
export type SortableEquipmentKeys = 'name' | 'category' | 'cost' | 'amortizationPercentage' | 'status';

export interface PayslipLineItem {
  type: 'base' | 'remote' | 'trip_bonus' | 'task_bonus' | 'achievement_bonus' | 'deduction' | 'fund_contribution' | 'suggestion_bonus' | 'brigade_bonus';
  description: string;
  amount: number;
}

export interface PayslipData {
  year: number;
  month: number;
  lineItems: PayslipLineItem[];
  total: number;
}