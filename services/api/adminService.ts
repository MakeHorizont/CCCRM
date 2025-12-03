
import { mockContacts } from '../mockData/contacts';
import { mockOrders } from '../mockData/orders';
import { mockWarehouseItems } from '../mockData/warehouseItems';
import { mockHouseholdItems } from '../mockData/householdItems';
import { mockStorageLocations } from '../mockData/storageLocations';
import { mockStorageTags } from '../mockData/storageTags';
import { mockKanbanBoards } from '../mockData/kanbanBoards';
import { mockKanbanTasks } from '../mockData/kanbanTasks';
import { mockStrategicPlans } from '../mockData/strategicPlans';
import { mockProductionOrders } from '../mockData/productionOrders';
import { mockTechnologyCards } from '../mockData/technologyCards';
import { mockEquipment } from '../mockData/equipment';
import { mockPurchaseRequests } from '../mockData/purchaseRequests';
import { mockTransactions } from '../mockData/transactions';
import { mockMonthlyExpenses } from '../mockData/monthlyExpenses';
import { mockDiscussions } from '../mockData/discussions';
import { mockSocialInitiatives } from '../mockData/socialInitiatives';
import { mockCollectiveFund } from '../mockData/collectiveFund';
import { mockDocuments } from '../mockData/documents';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { mockSystemEvents } from '../mockData/systemEvents';
import { mockInventoryChecks } from '../mockData/inventoryChecks'; // Added
import { mockQualityChecks } from '../mockData/qualityChecks'; // Added
import { MOCK_USERS } from '../mockData/users';
import { mockBonuses, delay } from './utils';
import { API_CONFIG } from './config';

// Define the shape of the backup object
interface SystemState {
    timestamp: string;
    version: string;
    data: {
        users: any[];
        contacts: any[];
        orders: any[];
        warehouseItems: any[];
        householdItems: any[];
        storageLocations: any[];
        storageTags: any[];
        kanbanBoards: any[];
        kanbanTasks: any[];
        strategicPlans: any[];
        productionOrders: any[];
        technologyCards: any[];
        equipment: any[];
        purchaseRequests: any[];
        transactions: any[];
        monthlyExpenses: any[];
        discussions: any[];
        socialInitiatives: any[];
        collectiveFund: any;
        documents: any[];
        warehouseIncidents: any[];
        systemEvents: any[];
        bonuses: any[];
        inventoryChecks: any[]; // Added
        qualityChecks: any[]; // Added
    }
}

const exportSystemState = async (): Promise<Blob> => {
    await delay(500);
    
    const state: SystemState = {
        timestamp: new Date().toISOString(),
        version: '1.9.4',
        data: {
            users: MOCK_USERS,
            contacts: mockContacts,
            orders: mockOrders,
            warehouseItems: mockWarehouseItems,
            householdItems: mockHouseholdItems,
            storageLocations: mockStorageLocations,
            storageTags: mockStorageTags,
            kanbanBoards: mockKanbanBoards,
            kanbanTasks: mockKanbanTasks,
            strategicPlans: mockStrategicPlans,
            productionOrders: mockProductionOrders,
            technologyCards: mockTechnologyCards,
            equipment: mockEquipment,
            purchaseRequests: mockPurchaseRequests,
            transactions: mockTransactions,
            monthlyExpenses: mockMonthlyExpenses,
            discussions: mockDiscussions,
            socialInitiatives: mockSocialInitiatives,
            collectiveFund: mockCollectiveFund,
            documents: mockDocuments,
            warehouseIncidents: mockWarehouseIncidents,
            systemEvents: mockSystemEvents,
            bonuses: mockBonuses,
            inventoryChecks: mockInventoryChecks, // Added
            qualityChecks: mockQualityChecks, // Added
        }
    };

    const jsonString = JSON.stringify(state, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
};

const importSystemState = async (file: File): Promise<{ success: true; message: string }> => {
    await delay(1000);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const state = JSON.parse(json) as SystemState;
                
                if (!state.data) {
                    throw new Error("Invalid backup file format: missing 'data' field.");
                }
                
                // Helper to replace array content in-place
                const replaceArray = (target: any[], source: any[]) => {
                    if (!source) return;
                    target.length = 0;
                    target.push(...source);
                };

                // Restore all collections
                replaceArray(MOCK_USERS, state.data.users);
                replaceArray(mockContacts, state.data.contacts);
                replaceArray(mockOrders, state.data.orders);
                replaceArray(mockWarehouseItems, state.data.warehouseItems);
                replaceArray(mockHouseholdItems, state.data.householdItems);
                replaceArray(mockStorageLocations, state.data.storageLocations);
                replaceArray(mockStorageTags, state.data.storageTags);
                replaceArray(mockKanbanBoards, state.data.kanbanBoards);
                replaceArray(mockKanbanTasks, state.data.kanbanTasks);
                replaceArray(mockStrategicPlans, state.data.strategicPlans);
                replaceArray(mockProductionOrders, state.data.productionOrders);
                replaceArray(mockTechnologyCards, state.data.technologyCards);
                replaceArray(mockEquipment, state.data.equipment);
                replaceArray(mockPurchaseRequests, state.data.purchaseRequests);
                replaceArray(mockTransactions, state.data.transactions);
                replaceArray(mockMonthlyExpenses, state.data.monthlyExpenses);
                replaceArray(mockDiscussions, state.data.discussions);
                replaceArray(mockSocialInitiatives, state.data.socialInitiatives);
                replaceArray(mockDocuments, state.data.documents);
                replaceArray(mockWarehouseIncidents, state.data.warehouseIncidents);
                replaceArray(mockSystemEvents, state.data.systemEvents);
                replaceArray(mockBonuses, state.data.bonuses);
                replaceArray(mockInventoryChecks, state.data.inventoryChecks); // Added
                replaceArray(mockQualityChecks, state.data.qualityChecks); // Added

                // Collective Fund is an object, update properties
                if (state.data.collectiveFund) {
                    mockCollectiveFund.balance = state.data.collectiveFund.balance;
                    mockCollectiveFund.contributionPercentage = state.data.collectiveFund.contributionPercentage;
                    replaceArray(mockCollectiveFund.history, state.data.collectiveFund.history);
                }

                resolve({ success: true, message: `Система успешно восстановлена из бэкапа от ${new Date(state.timestamp).toLocaleString()}` });
                
            } catch (e) {
                reject(new Error(`Ошибка при чтении файла: ${(e as Error).message}`));
            }
        };
        reader.onerror = () => reject(new Error("Ошибка чтения файла."));
        reader.readAsText(file);
    });
};

const hardReset = async (): Promise<void> => {
    await delay(2000);
    const emptyArray = (arr: any[]) => { arr.length = 0; };
    
    emptyArray(mockOrders);
    emptyArray(mockWarehouseItems);
    emptyArray(mockProductionOrders);
    emptyArray(mockKanbanTasks);
    // ... keep users for login ability
    
    window.location.reload();
};

export const adminService = {
    exportSystemState,
    importSystemState,
    hardReset
};