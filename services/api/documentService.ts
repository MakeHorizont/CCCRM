// services/api/documentService.ts
import { Document, DocumentType } from '../../types';
import { mockDocuments } from '../mockData/documents';
import { mockOrders } from '../mockData/orders';
import { mockContacts } from '../mockData/contacts';
import { mockCompanyRequisites } from '../mockData/companyRequisites';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';

type DocumentWithCustomer = Document & { customerName: string };

const getDocuments = async (filters: { searchTerm?: string; typeFilter?: DocumentType }): Promise<DocumentWithCustomer[]> => {
    await delay(300);
    let docs = deepCopy(mockDocuments);

    if (filters.typeFilter) {
        docs = docs.filter(d => d.type === filters.typeFilter);
    }
    
    const docsWithCustomer = docs.map(doc => {
        const order = mockOrders.find(o => o.id === doc.orderId);
        const customer = order ? mockContacts.find(c => c.id === order.contactId) : undefined;
        return { ...doc, customerName: customer?.name || 'Неизвестный клиент' };
    });

    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return docsWithCustomer.filter(d =>
            d.number.toLowerCase().includes(term) ||
            d.customerName.toLowerCase().includes(term)
        );
    }

    return docsWithCustomer;
};

const getDocumentById = async (id: string): Promise<Document | null> => {
    await delay(200);
    const doc = mockDocuments.find(d => d.id === id);
    return doc ? deepCopy(doc) : null;
};

const generateInvoiceFromOrder = async (orderId: string): Promise<Document> => {
    await delay(500);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Заказ не найден");
    const customer = mockContacts.find(c => c.id === order.contactId);
    if (!customer?.requisites) throw new Error("Реквизиты клиента не найдены");

    const documentCount = mockDocuments.filter(d => d.type === 'invoice').length;
    const newDocument: Document = {
        id: generateId('invoice'),
        type: 'invoice',
        number: `СЧ-${String(documentCount + 1).padStart(5, '0')}`,
        date: new Date().toISOString(),
        orderId: order.id,
        ourRequisites: deepCopy(mockCompanyRequisites),
        customerRequisites: deepCopy(customer.requisites),
        items: deepCopy(order.items),
        totalAmount: order.amount,
        createdAt: new Date().toISOString(),
    };
    mockDocuments.push(newDocument);
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      mockOrders[orderIndex].isInvoiceSent = true;
      mockOrders[orderIndex].invoiceSentAt = new Date().toISOString();
    }
    return deepCopy(newDocument);
};

const generateWaybillFromOrder = async (orderId: string): Promise<Document> => {
    await delay(500);
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Заказ не найден");
    const customer = mockContacts.find(c => c.id === order.contactId);
    if (!customer?.requisites) throw new Error("Реквизиты клиента не найдены");

    const documentCount = mockDocuments.filter(d => d.type === 'waybill').length;
    const newDocument: Document = {
        id: generateId('waybill'),
        type: 'waybill',
        number: `ТН-${String(documentCount + 1).padStart(5, '0')}`,
        date: new Date().toISOString(),
        orderId: order.id,
        ourRequisites: deepCopy(mockCompanyRequisites),
        customerRequisites: deepCopy(customer.requisites),
        items: deepCopy(order.items),
        totalAmount: order.amount,
        createdAt: new Date().toISOString(),
    };
    mockDocuments.push(newDocument);
    return deepCopy(newDocument);
};

export const documentService = {
    getDocuments,
    getDocumentById,
    generateInvoiceFromOrder,
    generateWaybillFromOrder,
};