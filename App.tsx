
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthPage from './components/Auth/AuthPage';
import DashboardPage from './components/Dashboard/DashboardPage';
import MyProfileDashboardPage from './components/Profile/MyProfileDashboardPage';
import ContactsPage, { ContactEditorPage } from './components/Contacts/ContactsPage';
import WarehousePage from './components/Warehouse/WarehousePage';
import WarehouseItemEditorPage from './components/Warehouse/WarehouseItemEditorPage';
import OrdersPage from './components/Orders/OrdersPage';
import OrderEditorPage from './components/Orders/OrderEditorPage'; 
import ProductionPage from './components/Production/ProductionPage'; 
import ProductionKioskPage from './components/Production/ProductionKioskPage'; 
import ProductionOrderEditorPage from './components/Production/ProductionOrderEditorPage';
import TechnologiesPage from './components/Technologies/TechnologiesPage';
import TechnologyEditorPage from './components/Technologies/TechnologyEditorPage'; 
import PurchasingPage from './components/Purchasing/PurchasingPage';
import PurchaseRequestEditorPage from './components/Purchasing/PurchaseRequestEditorPage'; 
import DocumentsPage from './components/Documents/DocumentsPage';
import PrintableDocumentPage from './components/Documents/PrintableDocumentPage';
import FinancialAccountingPage from './components/FinancialAccounting/FinancialAccountingPage';
import TransactionsPage, { TransactionEditorPage } from './components/FinancialAccounting/TransactionsPage';
import DiscussionsPage from './components/Discussions/DiscussionsPage';
import NotificationsPage from './components/Notifications/NotificationsPage';
import ProfilePage from './components/Profile/ProfilePage';
import CollectiveFundRouter from './components/CollectiveFund/CollectiveFundRouter';
import CharterRouter from './components/Charter/CharterRouter';
import RotationPage from './components/Rotation/RotationPage'; 

import KanbanRouter from './components/Kanban/KanbanRouter'; 

import StrategyPage from './components/Strategy/StrategyPage';
import StrategicPlanDetailPage from './components/Strategy/StrategicPlanDetailPage';
import SettingsPage from './components/Settings/SettingsPage';
import HierarchyPage from './components/HierarchyManagement/HierarchyPage';
import HouseholdAccountingPage from './components/HouseholdAccounting/HouseholdAccountingPage';
import HouseholdItemEditorPage from './components/HouseholdAccounting/HouseholdItemEditorPage';
import StoragesPage from './components/Storages/StoragesPage';
import StorageEditorPage from './components/Storages/StorageEditorPage';
import KnowledgeBasePage from './components/KnowledgeBase/KnowledgeBasePage';
import MailPage from './components/Mail/MailPage';
import EquipmentListPage from './components/Equipment/EquipmentListPage';
import EquipmentEditorPage from './components/Equipment/EquipmentEditorPage';
import MaintenancePage from './components/Maintenance/MaintenancePage'; 
import AuditLogPage from './components/System/AuditLogPage'; 
import CouncilPage from './components/Council/CouncilPage';
import AnalyticsPage from './components/Analytics/AnalyticsPage'; 
import QualityControlPage from './components/Quality/QualityControlPage'; 
import CalendarPage from './components/Calendar/CalendarPage'; 
import LeanPage from './components/Lean/LeanPage'; // New Import

import { useAuth } from './hooks/useAuth';
import { ROUTE_PATHS } from './constants';
import { User } from './types';
import { useView } from './hooks/useView';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: User['role'];
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, requiredPermission }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-background">
        <p className="text-brand-text-primary">Загрузка...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
     return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }

  if (requiredPermission && (!user.permissions || !user.permissions.includes(requiredPermission))) {
     return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }


  return <>{children}</>;
};

const App: React.FC = () => {
  const { user, isLoading: authIsLoading } = useAuth();
  const { isLoading: viewIsLoading } = useView();

  if ((authIsLoading && !user) || viewIsLoading) {
     return (
      <div className="flex items-center justify-center h-screen bg-brand-background">
      </div>
    );
  }
  
  const DashboardComponent = user?.role === 'employee' ? MyProfileDashboardPage : DashboardPage;


  return (
    <Routes>
      <Route path={ROUTE_PATHS.LOGIN} element={user ? <Navigate to="/" /> : <Layout><AuthPage /></Layout>} />
      <Route 
        path={`${ROUTE_PATHS.PRINT_DOCUMENT}/:documentId`}
        element={
          <ProtectedRoute>
            <PrintableDocumentPage />
          </ProtectedRoute>
        } 
      />
      {/* Kiosk route is outside the main layout for full screen experience */}
      <Route 
        path={ROUTE_PATHS.PRODUCTION_KIOSK}
        element={
            <ProtectedRoute>
                <ProductionKioskPage />
            </ProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path={ROUTE_PATHS.DASHBOARD.substring(1)} element={<DashboardComponent />} />
                
                {/* Analytics Route */}
                <Route path={ROUTE_PATHS.ANALYTICS.substring(1)} element={<AnalyticsPage />} />
                
                {/* Calendar Route */}
                <Route path={ROUTE_PATHS.CALENDAR.substring(1)} element={<CalendarPage />} />

                {/* Quality Control Route */}
                <Route path={ROUTE_PATHS.QUALITY_CONTROL.substring(1)} element={<QualityControlPage />} />

                {/* Lean Production Route */}
                <Route path={ROUTE_PATHS.LEAN.substring(1)} element={<LeanPage />} />

                {/* Contacts Routes */}
                <Route path={ROUTE_PATHS.CONTACTS.substring(1)} element={<ContactsPage />} />
                <Route path={`${ROUTE_PATHS.CONTACTS.substring(1)}/new`} element={<ContactEditorPage />} />
                <Route path={`${ROUTE_PATHS.CONTACTS.substring(1)}/:contactId`} element={<ContactEditorPage />} />

                {/* Warehouse Routes */}
                <Route path={ROUTE_PATHS.WAREHOUSE.substring(1)} element={<WarehousePage />} />
                <Route path={`${ROUTE_PATHS.WAREHOUSE.substring(1)}/new`} element={<WarehouseItemEditorPage />} />
                <Route path={`${ROUTE_PATHS.WAREHOUSE.substring(1)}/:itemId`} element={<WarehouseItemEditorPage />} />

                {/* Household Accounting Routes */}
                <Route path={ROUTE_PATHS.HOUSEHOLD_ACCOUNTING.substring(1)} element={<HouseholdAccountingPage />} />
                <Route path={`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING.substring(1)}/new`} element={<HouseholdItemEditorPage />} />
                <Route path={`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING.substring(1)}/:itemId`} element={<HouseholdItemEditorPage />} />
                
                {/* Storages Routes */}
                <Route path={ROUTE_PATHS.STORAGES.substring(1)} element={<StoragesPage />} />
                <Route path={`${ROUTE_PATHS.STORAGES.substring(1)}/new`} element={<StorageEditorPage />} />
                <Route path={`${ROUTE_PATHS.STORAGES.substring(1)}/:storageId`} element={<StorageEditorPage />} />

                {/* Orders Routes */}
                <Route path={ROUTE_PATHS.ORDERS.substring(1)} element={<OrdersPage />} />
                <Route path={`${ROUTE_PATHS.ORDERS.substring(1)}/new`} element={<OrderEditorPage />} />
                <Route path={`${ROUTE_PATHS.ORDERS.substring(1)}/:orderId`} element={<OrderEditorPage />} />


                {/* Purchasing Routes */}
                <Route path={ROUTE_PATHS.PURCHASING.substring(1)} element={<PurchasingPage />} />
                <Route path={`${ROUTE_PATHS.PURCHASING.substring(1)}/new`} element={<PurchaseRequestEditorPage />} />
                <Route path={`${ROUTE_PATHS.PURCHASING.substring(1)}/:requestId`} element={<PurchaseRequestEditorPage />} />


                {/* Production Routes */}
                <Route path={ROUTE_PATHS.PRODUCTION.substring(1)} element={<ProductionPage />} />
                <Route path={`${ROUTE_PATHS.PRODUCTION.substring(1)}/new`} element={<ProductionOrderEditorPage />} />
                <Route path={`${ROUTE_PATHS.PRODUCTION.substring(1)}/:orderId`} element={<ProductionOrderEditorPage />} />
                
                {/* Technologies Routes */}
                <Route path={ROUTE_PATHS.TECHNOLOGIES.substring(1)} element={<TechnologiesPage />} />
                <Route path={`${ROUTE_PATHS.TECHNOLOGIES.substring(1)}/new`} element={<TechnologyEditorPage />} />
                <Route path={`${ROUTE_PATHS.TECHNOLOGIES.substring(1)}/:warehouseItemId`} element={<TechnologyEditorPage />} />


                {/* Equipment Routes */}
                <Route path={ROUTE_PATHS.EQUIPMENT.substring(1)} element={<EquipmentListPage />} />
                <Route path={`${ROUTE_PATHS.EQUIPMENT.substring(1)}/new`} element={<EquipmentEditorPage />} />
                <Route path={`${ROUTE_PATHS.EQUIPMENT.substring(1)}/:equipmentId`} element={<EquipmentEditorPage />} />
                <Route path={ROUTE_PATHS.MAINTENANCE.substring(1)} element={<MaintenancePage />} />

                {/* Financial Accounting Routes */}
                <Route path={ROUTE_PATHS.FINANCIAL_ACCOUNTING.substring(1)} element={<FinancialAccountingPage />} />
                <Route path={ROUTE_PATHS.TRANSACTIONS.substring(1)} element={<TransactionsPage />} />
                <Route path={`${ROUTE_PATHS.TRANSACTIONS.substring(1)}/new`} element={<TransactionEditorPage />} />
                <Route path={`${ROUTE_PATHS.TRANSACTIONS.substring(1)}/:transactionId`} element={<TransactionEditorPage />} />
                
                {/* Council Routes */}
                <Route path={ROUTE_PATHS.COUNCIL.substring(1)} element={<CouncilPage />} />

                <Route path={ROUTE_PATHS.DOCUMENTS.substring(1)} element={<DocumentsPage />} />
                
                {/* Discussions Routes */}
                <Route path={`${ROUTE_PATHS.DISCUSSIONS.substring(1)}`} element={<DiscussionsPage />} />
                <Route path={`${ROUTE_PATHS.DISCUSSIONS.substring(1)}/:topicId`} element={<DiscussionsPage />} />


                <Route path={`${ROUTE_PATHS.COLLECTIVE_FUND.substring(1)}/*`} element={<CollectiveFundRouter />} />
                <Route path={`${ROUTE_PATHS.CHARTER.substring(1)}/*`} element={<CharterRouter />} />
                <Route path={ROUTE_PATHS.ROTATION.substring(1)} element={<RotationPage />} />
                <Route path={ROUTE_PATHS.NOTIFICATIONS.substring(1)} element={<NotificationsPage />} />
                <Route path={ROUTE_PATHS.PROFILE.substring(1)} element={<ProfilePage />} />
                <Route path={`${ROUTE_PATHS.PROFILE.substring(1)}/:userId`} element={<ProfilePage />} />

                <Route path={`${ROUTE_PATHS.KANBAN_HOME.substring(1)}/*`} element={<KanbanRouter />} />

                {/* Strategy Routes */}
                <Route path={ROUTE_PATHS.STRATEGY.substring(1)} element={<StrategyPage />} />
                <Route path={`${ROUTE_PATHS.STRATEGY.substring(1)}/:planId`} element={<StrategicPlanDetailPage />} />


                <Route path={ROUTE_PATHS.KNOWLEDGE_BASE.substring(1)} element={<KnowledgeBasePage />} />
                <Route path={ROUTE_PATHS.MAIL.substring(1)} element={<MailPage />} />
                <Route
                    path={ROUTE_PATHS.HIERARCHY_MANAGEMENT.substring(1)}
                    element={
                        <ProtectedRoute requiredRole="ceo" requiredPermission="manage_user_hierarchy">
                            <HierarchyPage />
                        </ProtectedRoute>
                    }
                />
                
                {/* Audit Log Route */}
                <Route path={ROUTE_PATHS.AUDIT_LOG.substring(1)} element={<AuditLogPage />} />

                <Route path={ROUTE_PATHS.SETTINGS.substring(1)} element={<SettingsPage />} />
                <Route path="/" element={<DashboardComponent />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
