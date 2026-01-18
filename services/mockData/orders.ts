
import { Order } from '../../types';
import { generateOrderItemId } from '../../utils/idGenerators';

export let mockOrders: Order[] = [
  { 
    id: 'order-101', 
    contactId: 'contact1', 
    customerName: 'Иван Петров', 
    customerPriority: '1', 
    items: [
      { id: generateOrderItemId(), productId: 'TMP001', productName: 'Темпе Классический Соевый 250гр', quantity: 20, pricePerUnit: 250, isAssembled: false }, 
    ], 
    status: 'Может быть собран', 
    date: '2024-12-05', 
    amount: 5000, 
    isPaid: true, 
    paidAt: '2024-12-06T12:00:00Z',
    isInvoiceSent: true, 
    invoiceSentAt: '2024-12-05T10:00:00Z',
    isArchived: false, 
    productionOrderId: 'PO-100',
    deliveryType: 'delivery',
    history: [],
  },
  { 
    id: 'order-102', 
    contactId: 'contact2', 
    customerName: 'Мария Сидорова', 
    customerPriority: '2', 
    items: [
      { id: generateOrderItemId(), productId: 'TMP003', productName: 'Темпе Классический Гречневый 250гр', quantity: 15, pricePerUnit: 260, isAssembled: true }
    ], 
    status: 'Доставлен', 
    date: '2024-12-10', 
    amount: 3900, 
    isPaid: true, 
    paidAt: '2024-12-11T12:00:00Z',
    isInvoiceSent: true, // FIX: Added missing isInvoiceSent property
    sentAt: '2024-12-12T15:00:00Z',
    isArchived: false, 
    deliveryType: 'delivery',
    history: [],
  },
  { 
    id: 'order-103', 
    contactId: 'contact1', 
    customerName: 'Иван Петров', 
    customerPriority: '3', 
    items: [
      { id: generateOrderItemId(), productId: 'TMP004', productName: 'Темпе Классический Нутовый 250гр', quantity: 50, pricePerUnit: 270, isAssembled: false }
    ], 
    status: 'В обработке', 
    date: '2024-12-15', 
    amount: 13500, 
    isPaid: false, 
    isInvoiceSent: true, 
    invoiceSentAt: '2024-12-16T10:00:00Z',
    isArchived: false, 
    deliveryType: 'pickup',
    history: [],
  },
  { 
    id: 'order-104', 
    contactId: 'contact2', 
    customerName: 'Мария Сидорова', 
    customerPriority: '1', 
    items: [
      { id: generateOrderItemId(), productId: 'CHIP001', productName: 'Темпе-Чипсы Классические 100гр', quantity: 100, pricePerUnit: 180, isAssembled: false }
    ], 
    status: 'Новый', 
    date: '2024-12-20', 
    amount: 18000, 
    isPaid: false, 
    isInvoiceSent: false,
    isArchived: false, 
    deliveryType: 'delivery',
    history: [],
  }
];
