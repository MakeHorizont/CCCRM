// services/api/purchasingService.ts
import { PurchaseRequest, PurchaseRequestItem, PurchaseRequestStatus, ProductionOrder, HouseholdItem, MaterialRequirement } from '../../types';
import { mockPurchaseRequests } from '../mockData/purchaseRequests';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockHouseholdItems } from '../mockData/householdItems';
import { MOCK_USERS } from '../mockData/users';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';

const getPurchaseRequests = async (filters: { searchTerm?: string; statusFilter?: PurchaseRequestStatus | 'Все'; viewMode?: 'active' | 'archived' | 'all' }): Promise<PurchaseRequest[]> => {
    await delay(300);
    let requests = deepCopy(mockPurchaseRequests);
    if (filters.viewMode === 'archived') {
      requests = requests.filter(r => r.isArchived);
    } else if (filters.viewMode === 'active') {
      requests = requests.filter(r => !r.isArchived);
    }
    // if viewMode is 'all', no filtering on isArchived
    
    if (filters.statusFilter && filters.statusFilter !== 'Все') {
      requests = requests.filter(r => r.status === filters.statusFilter);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      requests = requests.filter(r => r.name.toLowerCase().includes(term) || r.id.toLowerCase().includes(term));
    }
    return requests.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const addPurchaseRequest = async(data: Omit<PurchaseRequest, 'id'|'createdAt'|'updatedAt'|'isArchived'|'archivedAt'>): Promise<PurchaseRequest> => {
    await delay(400);
    const newReq: PurchaseRequest = {
        ...data,
        id: generateId('pr'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockPurchaseRequests.push(newReq);
    return deepCopy(newReq);
};

const updatePurchaseRequest = async(data: PurchaseRequest): Promise<PurchaseRequest> => {
    await delay(400);
    const index = mockPurchaseRequests.findIndex(r => r.id === data.id);
    if (index === -1) throw new Error("Purchase request not found");
    mockPurchaseRequests[index] = {...mockPurchaseRequests[index], ...data, updatedAt: new Date().toISOString()};
    return deepCopy(mockPurchaseRequests[index]);
};

const archivePurchaseRequest = async(id: string, archive: boolean): Promise<{success:true}> => {
    await delay(300);
    const index = mockPurchaseRequests.findIndex(r => r.id === id);
    if(index === -1) throw new Error("Purchase request not found");
    mockPurchaseRequests[index].isArchived = archive;
    mockPurchaseRequests[index].archivedAt = archive ? new Date().toISOString() : undefined;
    return {success: true};
};

const deletePurchaseRequest = async(id: string): Promise<{success:true}> => {
    await delay(500);
    const index = mockPurchaseRequests.findIndex(r => r.id === id);
    if(index > -1 && mockPurchaseRequests[index].isArchived) {
        mockPurchaseRequests.splice(index, 1);
        return {success:true};
    }
    if(index === -1) throw new Error("Purchase request not found");
    throw new Error("Purchase request must be archived before deletion");
};

const createPurchaseRequestFromShortage = async(poId: string, userId: string): Promise<PurchaseRequest> => {
    await delay(500);
    const po = mockProductionOrders.find(p => p.id === poId);
    if(!po) throw new Error("Production order not found");

    const requiredMaterials = new Map<string, { needed: number; unit: string; name: string }>();
    po.orderItems.forEach(item => {
        (item.billOfMaterialsSnapshot || []).forEach(bomItem => {
            const totalNeeded = bomItem.quantityPerUnit * item.plannedQuantity;
            const current = requiredMaterials.get(bomItem.householdItemId) || { needed: 0, unit: bomItem.unit, name: bomItem.householdItemName };
            requiredMaterials.set(bomItem.householdItemId, { ...current, needed: current.needed + totalNeeded });
        });
    });

    const deficitItems: PurchaseRequestItem[] = [];
    requiredMaterials.forEach((data, hhItemId) => {
        const stockItem = mockHouseholdItems.find(i => i.id === hhItemId);
        const inStock = stockItem ? stockItem.quantity : 0;
        const deficit = data.needed - inStock;
        if (deficit > 0) {
            deficitItems.push({
                id: generateId('pri'),
                householdItemId: hhItemId,
                householdItemName: data.name,
                quantityNeeded: deficit,
                unit: data.unit,
                quantityReceived: 0,
            });
        }
    });

    if (deficitItems.length === 0) {
        throw new Error("No material shortage found for this production order.");
    }

    const user = MOCK_USERS.find(u => u.id === userId);
    const newPR: PurchaseRequest = {
        id: generateId('pr'),
        name: `Закупка под ПЗ #${po.id}`,
        createdAt: new Date().toISOString(),
        createdBy: { userId, userName: user?.name },
        relatedProductionOrderId: po.id,
        items: deficitItems,
        status: 'Черновик',
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockPurchaseRequests.push(newPR);
    return deepCopy(newPR);
};

const createPurchaseRequestFromShortages = async (deficitItems: Omit<PurchaseRequestItem, 'id'|'quantityReceived'>[], userId: string, userName?: string): Promise<PurchaseRequest> => {
    await delay(500);
    if (deficitItems.length === 0) throw new Error("No deficit items provided");

    const newPR: PurchaseRequest = {
        id: generateId('pr'),
        name: `Сводная заявка от ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        createdBy: { userId, userName },
        relatedProductionOrderId: null,
        items: deficitItems.map(item => ({...item, id: generateId('pri'), quantityReceived: 0})),
        status: 'Черновик',
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockPurchaseRequests.push(newPR);
    return deepCopy(newPR);
};

const receivePurchaseRequestDelivery = async (requestId: string, items: { itemId: string; newReceivedQty: number }[]): Promise<PurchaseRequest> => {
    await delay(600);
    const prIndex = mockPurchaseRequests.findIndex(pr => pr.id === requestId);
    if (prIndex === -1) throw new Error("Purchase request not found");
    
    const pr = mockPurchaseRequests[prIndex];
    let allReceived = true;
    
    items.forEach(deliveryItem => {
        const itemIndex = pr.items.findIndex(i => i.id === deliveryItem.itemId);
        if (itemIndex > -1) {
            const prItem = pr.items[itemIndex];
            const receivedSoFar = prItem.quantityReceived || 0;
            const quantityJustReceived = deliveryItem.newReceivedQty - receivedSoFar;

            if (quantityJustReceived > 0) {
                const hhItemIndex = mockHouseholdItems.findIndex(hh => hh.id === prItem.householdItemId);
                if (hhItemIndex > -1) {
                    mockHouseholdItems[hhItemIndex].quantity += quantityJustReceived;
                    mockHouseholdItems[hhItemIndex].lastUpdated = new Date().toISOString();
                }
            }
            prItem.quantityReceived = deliveryItem.newReceivedQty;
        }
    });

    pr.items.forEach(item => {
        if ((item.quantityReceived || 0) < item.quantityNeeded) {
            allReceived = false;
        }
    });

    pr.status = allReceived ? 'Получено' : 'Частично получено';
    pr.updatedAt = new Date().toISOString();

    return deepCopy(pr);
};

const getMaterialRequirements = async (): Promise<MaterialRequirement[]> => {
    await delay(400);

    const activePOs = mockProductionOrders.filter(po => 
        !po.isArchived && 
        ['Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве', 'Контроль качества', 'Приостановлено'].includes(po.status)
    );

    const requirementsMap = new Map<string, MaterialRequirement>();

    for (const po of activePOs) {
        for (const item of po.orderItems) {
            if (!item.billOfMaterialsSnapshot) continue;
            for (const bomItem of item.billOfMaterialsSnapshot) {
                const totalRequiredForThisPO = bomItem.quantityPerUnit * item.plannedQuantity;
                
                let req = requirementsMap.get(bomItem.householdItemId);

                if (!req) {
                    const stockItem = mockHouseholdItems.find(i => i.id === bomItem.householdItemId);
                    req = {
                        householdItemId: bomItem.householdItemId,
                        householdItemName: bomItem.householdItemName,
                        unit: bomItem.unit,
                        totalRequired: 0,
                        inStock: stockItem ? stockItem.quantity : 0,
                        deficit: 0,
                        relatedPOs: [],
                    };
                }

                req.totalRequired += totalRequiredForThisPO;
                
                const existingPOEntry = req.relatedPOs.find(rpo => rpo.id === po.id);
                if (existingPOEntry) {
                    existingPOEntry.qty += totalRequiredForThisPO;
                } else {
                    req.relatedPOs.push({ id: po.id, name: po.name, qty: totalRequiredForThisPO });
                }

                requirementsMap.set(bomItem.householdItemId, req);
            }
        }
    }

    const finalRequirements = Array.from(requirementsMap.values());
    finalRequirements.forEach(req => {
        req.deficit = Math.max(0, req.totalRequired - req.inStock);
    });

    return finalRequirements.sort((a, b) => b.deficit - a.deficit);
};

export const purchasingService = {
    getPurchaseRequests,
    addPurchaseRequest,
    updatePurchaseRequest,
    archivePurchaseRequest,
    deletePurchaseRequest,
    createPurchaseRequestFromShortage,
    createPurchaseRequestFromShortages,
    receivePurchaseRequestDelivery,
    getMaterialRequirements,
};