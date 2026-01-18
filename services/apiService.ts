
import { contactApi } from './api/contactService';
import { orderService } from './api/orderService';
import { warehouseService } from './api/warehouseService';
import { householdService } from './api/householdService';
import { storageService } from './api/storageService';
import { kanbanService } from './api/kanbanService';
import { strategyService } from './api/strategyService';
import { productionService } from './api/productionService';
import { purchasingService } from './api/purchasingService';
import { knowledgeBaseService } from './api/knowledgeBaseService';
import { financeService } from './api/financeService';
import { equipmentService } from './api/equipmentService';
import { discussionService } from './api/discussionService';
import { notificationService } from './api/notificationService';
import { documentService } from './api/documentService';
import { userService } from './api/userService';
import { dashboardService } from './api/dashboardService';
import { developmentService } from './api/developmentService';
import { collectiveFundService } from './api/collectiveFundService';
import { aiAssistantService } from './api/aiAssistantService';
import { charterService } from './api/charterService';
import { rotationService } from './api/rotationService';
import { systemService } from './api/systemService';
import { councilService } from './api/councilService';
import { analyticsService } from './api/analyticsService';
import { qualityService } from './api/qualityService';
import { searchService } from './api/searchService';
import { adminService } from './api/adminService';
import { inventoryService } from './api/inventoryService';
import { calendarService } from './api/calendarService';
import { leanService } from './api/leanService'; // New import

export const apiService = {
    ...contactApi,
    ...orderService,
    ...warehouseService,
    ...householdService,
    ...storageService,
    ...kanbanService,
    ...strategyService,
    ...productionService,
    ...purchasingService,
    ...knowledgeBaseService,
    ...financeService,
    ...equipmentService,
    ...discussionService,
    ...notificationService,
    ...documentService,
    ...userService,
    ...dashboardService,
    ...developmentService,
    ...collectiveFundService,
    ...aiAssistantService,
    ...charterService,
    ...rotationService,
    ...systemService,
    ...councilService,
    ...analyticsService,
    ...qualityService,
    ...searchService,
    ...adminService,
    ...inventoryService,
    ...calendarService,
    ...leanService,
};
