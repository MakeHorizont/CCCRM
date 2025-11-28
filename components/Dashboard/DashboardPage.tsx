
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../UI/Card';
import { CurrencyDollarIcon, ExclamationTriangleIcon, ChevronUpIcon, ChevronDownIcon, CogIcon, CubeIcon } from '../UI/Icons';
import { apiService } from '../../services/apiService';
import { Order, OrderStatus, ProductionOrder, KanbanTaskStatus, LowStockItem, ProductionMetrics } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS, ORDER_STATUS_COLOR_MAP, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import KanbanSummaryWidget from './KanbanSummaryWidget';
import ProductionMetricsWidget from './ProductionMetricsWidget';
import ResourceForecastWidget from './ResourceForecastWidget';
import SystemEventsWidget from './SystemEventsWidget';
import PendingProposalsWidget from './PendingProposalsWidget';
import { useAuth } from '../../hooks/useAuth';

const StatCard: React.FC<{ title: string; value: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string }> = ({ title, value, icon: Icon, color }) => (
  <Card className="flex-1 h-full !border-0">
    <div className="flex items-center h-full">
      <div className={`p-3 rounded-lg ${color} mr-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-brand-text-secondary uppercase">{title}</p>
        <p className="text-2xl font-semibold text-brand-text-primary">{value}</p>
      </div>
    </div>
  </Card>
);

type SortableOrderKeys = 'customerName' | 'amount' | 'date' | 'status';
type SortableProductionOrderKeys = 'name' | 'status' | 'relatedSalesOrderId';
interface SortConfig {
  key: SortableOrderKeys | SortableProductionOrderKeys | null;
  direction: 'asc' | 'desc';
}

interface KanbanSummaryData {
  totalActiveTasks: number;
  tasksByStatus: Record<KanbanTaskStatus, number>;
  workloadByUser: { userId: string; userName: string; taskCount: number; }[];
  overdueTasksCount: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Order[]>([]);
  const [productionOrdersNeedingReview, setProductionOrdersNeedingReview] = useState<ProductionOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [productionMetrics, setProductionMetrics] = useState<ProductionMetrics | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const [kanbanSummary, setKanbanSummary] = useState<KanbanSummaryData | null>(null);
  const [isLoadingKanban, setIsLoadingKanban] = useState(true);

  const [newOrdersSortConfig, setNewOrdersSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [outstandingInvoicesSortConfig, setOutstandingInvoicesSortConfig] = useState<SortConfig>({ key: 'amount', direction: 'desc' });
  const [productionReviewSortConfig, setProductionReviewSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  
  const isCouncilMember = user?.role === 'ceo' || user?.role === 'manager';


  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingSummary(true);
      setIsLoadingKanban(true);
      try {
        const [summary, kanbanData, lowStockData, prodMetrics] = await Promise.all([
          apiService.getDashboardSummary(),
          apiService.getDashboardKanbanSummary(),
          apiService.getLowStockItems(),
          apiService.getProductionMetrics(),
        ]);
        
        setNewOrders(summary.newOrders);
        setOutstandingInvoices(summary.outstandingInvoices);
        setProductionOrdersNeedingReview(summary.productionOrdersNeedingReview || []);
        setKanbanSummary(kanbanData);
        setLowStockItems(lowStockData);
        setProductionMetrics(prodMetrics);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoadingSummary(false);
        setIsLoadingKanban(false);
      }
    };
    fetchDashboardData();
  }, []);

  const controlPoints = useMemo(() => [
    { title: 'Просроченные Задачи', value: (kanbanSummary?.overdueTasksCount || 0).toString(), icon: ExclamationTriangleIcon, color: 'bg-red-500', link: ROUTE_PATHS.KANBAN_MY_TASKS },
    { title: 'Товары с Низким Остатком', value: lowStockItems.length.toString(), icon: ExclamationTriangleIcon, color: 'bg-yellow-500', link: ROUTE_PATHS.WAREHOUSE },
    { title: 'Неоплаченные Заказы', value: outstandingInvoices.length.toString(), icon: CurrencyDollarIcon, color: 'bg-orange-500', link: ROUTE_PATHS.ORDERS },
    { title: 'ПЗ к Пересмотру', value: productionOrdersNeedingReview.length.toString(), icon: CogIcon, color: 'bg-amber-500', link: ROUTE_PATHS.PRODUCTION },
  ], [kanbanSummary, lowStockItems, outstandingInvoices, productionOrdersNeedingReview]);


  const getStatusColorClass = (status: OrderStatus | null): string => {
    if (!status) return ORDER_STATUS_COLOR_MAP['default'];
    return ORDER_STATUS_COLOR_MAP[status] || ORDER_STATUS_COLOR_MAP['default'];
  };
   const getProductionStatusColorClass = (status: ProductionOrder['status'] | null): string => {
    if (!status) return PRODUCTION_ORDER_STATUS_COLOR_MAP['default'];
    return PRODUCTION_ORDER_STATUS_COLOR_MAP[status] || PRODUCTION_ORDER_STATUS_COLOR_MAP['default'];
  };


  const requestSort = (key: SortableOrderKeys | SortableProductionOrderKeys, type: 'newOrders' | 'outstandingInvoices' | 'productionReview') => {
    let direction: 'asc' | 'desc' = 'asc';
    let currentSortConfig: SortConfig;

    switch(type) {
        case 'newOrders': currentSortConfig = newOrdersSortConfig; break;
        case 'outstandingInvoices': currentSortConfig = outstandingInvoicesSortConfig; break;
        case 'productionReview': currentSortConfig = productionReviewSortConfig; break;
        default: return;
    }

    if (currentSortConfig.key === key && currentSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    switch(type) {
        case 'newOrders': setNewOrdersSortConfig({ key, direction }); break;
        case 'outstandingInvoices': setOutstandingInvoicesSortConfig({ key, direction }); break;
        case 'productionReview': setProductionReviewSortConfig({ key, direction }); break;
    }
  };

  const getSortIcon = (key: SortableOrderKeys | SortableProductionOrderKeys, type: 'newOrders' | 'outstandingInvoices' | 'productionReview') => {
    let currentSortConfig: SortConfig;
    switch(type) {
        case 'newOrders': currentSortConfig = newOrdersSortConfig; break;
        case 'outstandingInvoices': currentSortConfig = outstandingInvoicesSortConfig; break;
        case 'productionReview': currentSortConfig = productionReviewSortConfig; break;
        default: return <ChevronDownIcon className="h-3 w-3 opacity-30 inline-block ml-1" />;
    }
    if (currentSortConfig.key !== key) {
      return <ChevronDownIcon className="h-3 w-3 opacity-30 inline-block ml-1" />;
    }
    return currentSortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline-block ml-1" /> : <ChevronDownIcon className="h-4 w-4 inline-block ml-1" />;
  };
  
  const sortedNewOrders = useMemo(() => {
    let sortableItems = [...newOrders];
    if (newOrdersSortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[newOrdersSortConfig.key as SortableOrderKeys];
        const valB = b[newOrdersSortConfig.key as SortableOrderKeys];
        if (newOrdersSortConfig.key === 'date') {
            return newOrdersSortConfig.direction === 'asc' ? new Date(valA as string).getTime() - new Date(valB as string).getTime() : new Date(valB as string).getTime() - new Date(valA as string).getTime();
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return newOrdersSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return newOrdersSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [newOrders, newOrdersSortConfig]);

  const sortedOutstandingInvoices = useMemo(() => {
    let sortableItems = [...outstandingInvoices];
    if (outstandingInvoicesSortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[outstandingInvoicesSortConfig.key as SortableOrderKeys];
        const valB = b[outstandingInvoicesSortConfig.key as SortableOrderKeys];
         if (outstandingInvoicesSortConfig.key === 'date') {
            return outstandingInvoicesSortConfig.direction === 'asc' ? new Date(valA as string).getTime() - new Date(valB as string).getTime() : new Date(valB as string).getTime() - new Date(valA as string).getTime();
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return outstandingInvoicesSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return outstandingInvoicesSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [outstandingInvoices, outstandingInvoicesSortConfig]);

  const sortedProductionOrdersNeedingReview = useMemo(() => {
    let sortableItems = [...productionOrdersNeedingReview];
    if (productionReviewSortConfig.key) {
        sortableItems.sort((a, b) => {
            const valA = a[productionReviewSortConfig.key as SortableProductionOrderKeys];
            const valB = b[productionReviewSortConfig.key as SortableProductionOrderKeys];
            if (typeof valA === 'string' && typeof valB === 'string') {
                return productionReviewSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return 0;
        });
    }
    return sortableItems;
  }, [productionOrdersNeedingReview, productionReviewSortConfig]);

  const renderOrderListHeader = (type: 'newOrders' | 'outstandingInvoices') => {
    const headers: { key: SortableOrderKeys; label: string; className?: string }[] = [
      { key: 'customerName', label: 'Клиент', className: 'col-span-2' },
      { key: 'amount', label: 'Сумма', className: 'text-right' },
      { key: 'date', label: 'Дата', className: 'text-right'},
      { key: 'status', label: 'Статус', className: 'text-left' }
    ];
    return (
      <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-brand-border text-xs text-brand-text-muted uppercase sticky top-0 bg-brand-surface z-10">
        {headers.map(header => (
          <div
            key={header.key}
            onClick={() => requestSort(header.key, type)}
            className={`cursor-pointer hover:text-brand-text-primary ${header.className || ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Сортировать по ${header.label}`}
          >
            {header.label} {getSortIcon(header.key, type)}
          </div>
        ))}
      </div>
    );
  };

  const renderProductionReviewHeader = () => {
    const headers: { key: SortableProductionOrderKeys; label: string; className?: string }[] = [
      { key: 'name', label: 'Произв. Задание', className: 'col-span-3' },
      { key: 'relatedSalesOrderId', label: 'Связанный Заказ', className: 'col-span-1 text-left' },
      { key: 'status', label: 'Статус ПЗ', className: 'col-span-1 text-left' }
    ];
    return (
      <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-brand-border text-xs text-brand-text-muted uppercase sticky top-0 bg-brand-surface z-10">
        {headers.map(header => (
          <div
            key={header.key}
            onClick={() => requestSort(header.key, 'productionReview')}
            className={`cursor-pointer hover:text-brand-text-primary ${header.className || ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Сортировать по ${header.label}`}
          >
            {header.label} {getSortIcon(header.key, 'productionReview')}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-brand-text-primary">Панель управления</h1>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-brand-text-primary">Пункты Контроля</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {controlPoints.map(stat => (
            <Link to={stat.link} key={stat.title} className="block hover:bg-zinc-50 transition-colors duration-200 rounded-xl border border-brand-border">
                <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
            </Link>
          ))}
        </div>
      </div>
      
      {/* Pending Proposals (High Priority for Council) - Full Width Above Grid if exists */}
      {isCouncilMember && (
        <div className="mb-4">
            <PendingProposalsWidget />
        </div>
      )}
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
      
        {/* Kanban Summary - Expanded to 2 columns - PLACED FIRST */}
        <div className="lg:col-span-2">
            {isLoadingKanban ? (
            <Card className="flex items-center justify-center p-8 h-64"><LoadingSpinner/></Card>
            ) : kanbanSummary ? (
            <KanbanSummaryWidget summary={kanbanSummary} />
            ) : (
            <Card className="text-center p-8 text-brand-text-muted h-64 flex items-center justify-center">Не удалось загрузить сводку по Kanban.</Card>
            )}
        </div>

        {/* Production Pulse - PLACED SECOND */}
        <div className="lg:col-span-1">
             {isLoadingSummary ? (
                <Card className="flex items-center justify-center p-8 h-64"><LoadingSpinner/></Card>
            ) : productionMetrics ? (
                <ProductionMetricsWidget metrics={productionMetrics} />
            ) : (
                <Card className="text-center p-8 text-brand-text-muted h-64 flex items-center justify-center">Нет данных о производстве.</Card>
            )}
        </div>
        
        {/* Resource Forecast - PLACED THIRD */}
        <div className="lg:col-span-1">
             <ResourceForecastWidget />
        </div>
      </div>
      
      {/* System Events (Audit Log) - Moved to a separate row for cleaner layout */}
      <div className="grid grid-cols-1 gap-6">
          <div className="lg:col-span-2 xl:col-span-4">
               <SystemEventsWidget />
          </div>
      </div>

       {/* Low Stock Widget */}
      <div className="grid grid-cols-1 gap-6">
          <Card className="lg:col-span-1 flex flex-col">
            <h2 className="text-xl font-semibold text-brand-text-primary mb-4 px-3 pt-3 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-500"/>
                Товары с низким остатком
            </h2>
            {isLoadingSummary ? <div className="flex-grow flex items-center justify-center"><LoadingSpinner/></div> : lowStockItems.length > 0 ? (
              <ul className="space-y-0 flex-grow overflow-y-auto max-h-80 custom-scrollbar-thin">
                {lowStockItems.map(item => (
                  <li key={item.id} className="hover:bg-zinc-50 transition-colors border-b border-brand-border last:border-b-0">
                    <Link to={item.type === 'warehouse' ? ROUTE_PATHS.WAREHOUSE : ROUTE_PATHS.HOUSEHOLD_ACCOUNTING} className="block p-3">
                      <div className="grid grid-cols-3 gap-2 items-center">
                         <span className="font-medium text-brand-text-primary col-span-2 truncate flex items-center" title={item.name}>
                            <CubeIcon className={`h-4 w-4 mr-2 flex-shrink-0 ${item.type === 'warehouse' ? 'text-sky-500' : 'text-teal-500'}`}/>
                            {item.name}
                         </span>
                         <span className="text-sm text-yellow-600 text-right">
                            {item.quantity} / {item.lowStockThreshold} {item.unit}
                         </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-brand-text-muted p-3 text-center">Все запасы в норме.</p>}
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-semibold text-brand-text-primary mb-4 px-3 pt-3">Новые и необработанные заказы ({sortedNewOrders.length})</h2>
          {renderOrderListHeader('newOrders')}
          {isLoadingSummary ? <div className="flex-grow flex items-center justify-center"><LoadingSpinner/></div> : sortedNewOrders.length > 0 ? (
            <ul className="space-y-0 flex-grow overflow-y-auto max-h-80 custom-scrollbar-thin">
              {sortedNewOrders.map(order => (
                <li key={order.id} className="hover:bg-zinc-50 transition-colors border-b border-brand-border last:border-b-0">
                  <Link to={`${ROUTE_PATHS.ORDERS}/${order.id}`} className="block p-3">
                    <div className="grid grid-cols-5 gap-2 items-center">
                      <span className="font-medium text-brand-text-primary col-span-2 truncate" title={order.customerName}>{order.customerName}</span>
                      <span className="text-sm text-brand-text-primary text-right">₽{order.amount.toLocaleString('ru-RU')}</span>
                      <span className="text-xs text-brand-text-muted text-right">{new Date(order.date).toLocaleDateString('ru-RU')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs text-center ${getStatusColorClass(order.status)}`}>{order.status}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-brand-text-muted p-3 text-center">Нет новых заказов.</p>}
        </Card>

        <Card className="lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-semibold text-brand-text-primary mb-4 px-3 pt-3">Неоплаченные счета ({sortedOutstandingInvoices.length})</h2>
          {renderOrderListHeader('outstandingInvoices')}
           {isLoadingSummary ? <div className="flex-grow flex items-center justify-center"><LoadingSpinner/></div> : sortedOutstandingInvoices.length > 0 ? (
            <ul className="space-y-0 flex-grow overflow-y-auto max-h-80 custom-scrollbar-thin">
              {sortedOutstandingInvoices.map(order => (
                <li key={order.id} className="hover:bg-zinc-50 transition-colors border-b border-brand-border last:border-b-0">
                   <Link to={`${ROUTE_PATHS.ORDERS}/${order.id}`} className="block p-3">
                     <div className="grid grid-cols-5 gap-2 items-center">
                      <span className="font-medium text-brand-text-primary col-span-2 truncate" title={order.customerName}>{order.customerName}</span>
                      <span className="text-sm text-red-600 text-right">₽{order.amount.toLocaleString('ru-RU')}</span>
                       <span className="text-xs text-brand-text-muted text-right">{new Date(order.date).toLocaleDateString('ru-RU')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs text-center ${getStatusColorClass(order.status)}`}>{order.status}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-brand-text-muted p-3 text-center">Нет неоплаченных счетов.</p>}
        </Card>
      </div>
      
      {/* Production Orders Needing Review */}
      <div className="grid grid-cols-1 gap-6">
          <Card className="lg:col-span-1 flex flex-col">
            <h2 className="text-xl font-semibold text-brand-text-primary mb-4 px-3 pt-3">
                <ExclamationTriangleIcon className="h-5 w-5 inline-block mr-2 text-orange-500"/>
                Производственные Задания к Пересмотру ({sortedProductionOrdersNeedingReview.length})
            </h2>
            {renderProductionReviewHeader()}
            {isLoadingSummary ? <div className="flex-grow flex items-center justify-center"><LoadingSpinner/></div> : sortedProductionOrdersNeedingReview.length > 0 ? (
              <ul className="space-y-0 flex-grow overflow-y-auto max-h-80 custom-scrollbar-thin">
                {sortedProductionOrdersNeedingReview.map(po => (
                  <li key={po.id} className="hover:bg-zinc-50 transition-colors border-b border-brand-border last:border-b-0">
                    <Link to={`${ROUTE_PATHS.PRODUCTION}/${po.id}`} className="block p-3">
                      <div className="grid grid-cols-5 gap-2 items-center">
                        <span className="font-medium text-orange-600 col-span-3 truncate" title={po.name}>{po.name}</span>
                        <span className="text-xs text-brand-text-muted col-span-1 text-left">{po.relatedSalesOrderId ? `Заказ: ${po.relatedSalesOrderId}` : '-'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs text-center col-span-1 ${getProductionStatusColorClass(po.status)}`}>{po.status}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-brand-text-muted p-3 text-center">Нет производственных заданий, требующих пересмотра.</p>}
          </Card>
      </div>

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d4d4d8;
          border-radius: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a1a1aa;
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
