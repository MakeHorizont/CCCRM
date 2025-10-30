// This file is now a barrel that re-exports the aggregated apiService object.
// The actual logic has been moved to the services/api/ directory.

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
import { rotationService } from './api/rotationService'; // Новый импорт

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
};
