
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../UI/Card';
import { CurrencyDollarIcon, ExclamationTriangleIcon, ChevronUpIcon, ChevronDownIcon, CogIcon, CubeIcon, ScaleIcon } from '../UI/Icons';
import { apiService } from '../../services/apiService';
import { Order, OrderStatus, ProductionOrder, KanbanTaskStatus, LowStockItem, ProductionMetrics, HonorBoardEntry, CouncilProposal } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS, ORDER_STATUS_COLOR_MAP, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import KanbanSummaryWidget from './KanbanSummaryWidget';
import ProductionMetricsWidget from './ProductionMetricsWidget';
import ResourceForecastWidget from './ResourceForecastWidget';
import SystemEventsWidget from './SystemEventsWidget';
import PendingProposalsWidget from './PendingProposalsWidget';
import BoardOfHonorWidget from './BoardOfHonorWidget';
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

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Order[]>([]);
  const [productionOrdersNeedingReview, setProductionOrdersNeedingReview] = useState<ProductionOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [productionMetrics, setProductionMetrics] = useState<ProductionMetrics | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [activeProposals, setActiveProposals] = useState<CouncilProposal[]>([]);

  const [kanbanSummary, setKanbanSummary] = useState<any | null>(null);
  const [isLoadingKanban, setIsLoadingKanban] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingSummary(true);
      setIsLoadingKanban(true);
      try {
        const [summary, kanbanData, lowStockData, prodMetrics, proposals] = await Promise.all([
          apiService.getDashboardSummary(),
          apiService.getDashboardKanbanSummary(),
          apiService.getLowStockItems(),
          apiService.getProductionMetrics(),
          apiService.getProposals('active')
        ]);
        
        setNewOrders(summary.newOrders);
        setOutstandingInvoices(summary.outstandingInvoices);
        setProductionOrdersNeedingReview(summary.productionOrdersNeedingReview || []);
        setKanbanSummary(kanbanData);
        setLowStockItems(lowStockData);
        setProductionMetrics(prodMetrics);
        setActiveProposals(proposals);
      } catch (error) {
        console.error("Dashboard error", error);
      } finally {
        setIsLoadingSummary(false);
        setIsLoadingKanban(false);
      }
    };
    fetchDashboardData();
  }, []);

  const controlPoints = useMemo(() => [
    { title: 'Просрочено', value: (kanbanSummary?.overdueTasksCount || 0).toString(), icon: ExclamationTriangleIcon, color: 'bg-red-500', link: ROUTE_PATHS.KANBAN_MY_TASKS },
    { title: 'Низкий Остаток', value: lowStockItems.length.toString(), icon: CubeIcon, color: 'bg-orange-500', link: ROUTE_PATHS.WAREHOUSE },
    { title: 'Голосования', value: activeProposals.length.toString(), icon: ScaleIcon, color: 'bg-sky-500', link: ROUTE_PATHS.COUNCIL },
    { title: 'ПЗ к Пересмотру', value: productionOrdersNeedingReview.length.toString(), icon: CogIcon, color: 'bg-amber-500', link: ROUTE_PATHS.PRODUCTION },
  ], [kanbanSummary, lowStockItems, activeProposals, productionOrdersNeedingReview]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary">Панель управления</h1>
        <div className="text-xs font-bold text-brand-text-muted uppercase tracking-widest bg-brand-surface px-3 py-1 rounded-full border border-brand-border">
             v1.9.9 «Синтез»
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {controlPoints.map(stat => (
          <Link to={stat.link} key={stat.title} className="block hover:translate-y-[-2px] transition-transform duration-200">
              <StatCard title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
          </Link>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
               {isLoadingKanban ? <Card className="h-64 flex items-center justify-center"><LoadingSpinner/></Card> : kanbanSummary && <KanbanSummaryWidget summary={kanbanSummary} />}
          </div>
          <div className="lg:col-span-1">
               <PendingProposalsWidget />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
             {isLoadingSummary ? <Card className="h-64 flex items-center justify-center"><LoadingSpinner/></Card> : productionMetrics && <ProductionMetricsWidget metrics={productionMetrics} />}
        </div>
        <div className="lg:col-span-1">
             {isLoadingKanban ? <Card className="h-64 flex items-center justify-center"><LoadingSpinner/></Card> : kanbanSummary && <BoardOfHonorWidget entries={kanbanSummary.collectiveHonorBoard} />}
        </div>
        <div className="lg:col-span-2">
             <SystemEventsWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="flex flex-col">
            <h2 className="text-xl font-semibold text-brand-text-primary mb-4 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-500"/>
                Товары с низким остатком
            </h2>
            {isLoadingSummary ? <LoadingSpinner/> : lowStockItems.length > 0 ? (
              <ul className="space-y-1 overflow-y-auto max-h-64 custom-scrollbar-thin">
                {lowStockItems.map(item => (
                  <li key={item.id} className="p-3 bg-brand-surface rounded-lg border border-brand-border hover:bg-brand-secondary transition-colors">
                    <Link to={item.type === 'warehouse' ? ROUTE_PATHS.WAREHOUSE : ROUTE_PATHS.HOUSEHOLD_ACCOUNTING} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-brand-text-primary">{item.name}</span>
                      <span className="text-xs font-bold text-red-500">{item.quantity} / {item.lowStockThreshold} {item.unit}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-center py-8 text-brand-text-muted italic">Запасы обеспечены.</p>}
         </Card>
         <div className="grid grid-cols-1 gap-6">
            <ResourceForecastWidget />
         </div>
      </div>
    </div>
  );
};

export default DashboardPage;
