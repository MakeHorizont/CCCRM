// types/order.ts
import { ProductionOrderStatus } from './production';
import { ContactPriority } from './contact';
import { OrderHistoryEntry } from './common';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: number;
  availableStock?: number; // New
  isAssembled: boolean;
  assembledBy?: { userId: string; userName?: string; timestamp: string };
  locationName?: string; // New
  lastUpdated?: string; // New
}

export type OrderStatus =
  | 'Новый'
  | 'Может быть собран'
  | 'Не может быть собран'
  | 'В обработке'
  | 'Собран'
  | 'Отправлен'
  | 'Доставлен'
  | 'Отменен'
  | 'Возврат'
  | 'Частичный возврат';

export type DeliveryType = 'pickup' | 'delivery'; // New

export interface Order {
  id: string;
  contactId: string;
  customerName: string;
  customerPriority?: ContactPriority | null;
  items: OrderItem[];
  status: OrderStatus;
  date: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string; // New
  isInvoiceSent: boolean;
  invoiceSentAt?: string; // New
  sentAt?: string; // New
  isArchived: boolean;
  archivedAt?: string;
  shippingAddress?: string;
  assembledOrderLocationId?: string | null;
  notes?: string;
  productionOrderId?: string | null; 
  productionOrderStatus?: ProductionOrderStatus | null;
  productionCost?: number;
  margin?: number;
  updatedAt?: string;
  // New fields
  deliveryType?: DeliveryType;
  thermalInsulation?: boolean;
  deliveryCost?: number | null;
  totalWeightGrams?: number;
  shippingWeightGrams?: number;
  history?: OrderHistoryEntry[];
  waybillAttachmentUrl?: string | null;
}

export type SortableOrderKeys = 'id' | 'customerName' | 'status' | 'date' | 'amount';