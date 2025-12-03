
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { ProductionOrder, ProductionOrderStatus, User, WarehouseItem, Order as SalesOrder, ProductionOrderItem, ShiftHandover } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import Input from '../UI/Input';
import { CogIcon as ProductionIcon, PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon, TableCellsIcon, ArchiveBoxIcon as ViewArchiveIcon, PencilSquareIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, ExclamationTriangleIcon, PlayCircleIcon, ChevronDownIcon, ChevronUpIcon, LightBulbIcon, DevicePhoneMobileIcon, FireIcon, ScaleIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '../UI/Icons';
import { PRODUCTION_ORDER_STATUS_COLOR_MAP, ROUTE_PATHS } from '../../constants';
import ConfirmationModal from '../UI/ConfirmationModal';
import Tooltip from '../UI/Tooltip';
import ProductionRunModal from './ProductionRunModal'; 
import { useView } from '../../hooks/useView';
import { useNavigate } from 'react-router-dom';
import CreateTopicModal from '../Discussions/CreateTopicModal';
import { useAppSettings } from '../../hooks/useAppSettings';

type ViewMode = 'active' | 'archived';
type ActiveTab = 'orders' | 'handovers';

// Mobile Card Component
const MobileProductionOrderCard: React.FC<{
  order: ProductionOrder;
  onView: (order: ProductionOrder) => void;
  onOpenRunModal: (order: ProductionOrder, item: ProductionOrderItem) => void;
  getAssigneeName: (id?: string | null) => string;
  getStatusColorClass: (status: ProductionOrderStatus | null) => string;
}> = ({ order, onView, onOpenRunModal, getAssigneeName, getStatusColorClass }) => {
  return (
    <Card className={`mb-3 ${order.isArchived ? 'opacity-70 bg-brand-surface' : ''} ${order.hasMaterialShortage ? 'border-l-4 border-l-orange-500' : ''}`} onClick={() => onView(order)}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-grow min-w-0 flex items-center">
           {order.hasMaterialShortage && (
              <Tooltip text="ДЕФИЦИТ СЫРЬЯ: Производство невозможно">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-orange-500 flex-shrink-0 animate-pulse"/>
              </Tooltip>
           )}
          <div>
            <h3 className="font-semibold text-brand-text-primary truncate" title={order.name}>{order.name}</h3>
            <p className="text-xs text-brand-text-muted">{order.id}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColorClass(order.status)}`}>
            {order.status}
        </span>
      </div>
       <p className="text-xs text-brand-text-muted mb-3">Ответственный: {getAssigneeName(order.assignedToId)}</p>

      <div className="space-y-2 border-t border-brand-border pt-2" onClick={e => e.stopPropagation()}>
         <h4 className="text-sm font-medium text-brand-text-secondary">Продукция:</h4>
         {order.orderItems.map(item => (
            <div key={item.id} className="flex justify-between items-center p-1.5 bg-brand-surface rounded-md">
                <div>
                    <p className="text-sm text-brand-text-primary">{item.productName}</p>
                    <p className="text-xs text-brand-text-muted">План: {item.plannedQuantity} {item.unit} | Факт: {item.producedQuantity || 0} {item.unit}</p>
                </div>
                 {!order.isArchived && !['Завершено', 'Отменено'].includes(order.status) && (
                    <Button
                        size="sm"
                        onClick={() => onOpenRunModal(order, item)}
                        className={`${order.hasMaterialShortage ? 'bg-gray-400' : 'bg-teal-600 hover:bg-teal-500'} text-white flex-shrink-0`}
                        leftIcon={<PlayCircleIcon className="h-4 w-4"/>}
                        disabled={false} // We allow opening to see WHAT is missing, but visual cue is grey
                    >
                        Начать
                    </Button>
                )}
            </div>
         ))}
      </div>

      <div className="mt-3 pt-2 border-t border-brand-border flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={() => onView(order)}><PencilSquareIcon className="h-5 w-5 mr-1" /> Открыть</Button>
      </div>
    </Card>
  );
};


const ProductionPage: React.FC = () => {
  const { user } = useAuth();
  const { isMobileView } = useView(); 
  const { systemMode } = useAppSettings();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders');
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isInteractionLoading, setIsInteractionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionOrderStatus | 'Все'>('Все');
  
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedOrderForRun, setSelectedOrderForRun] = useState<ProductionOrder | null>(null);
  const [selectedItemForRun, setSelectedItemForRun] = useState<ProductionOrderItem | null>(null);
  
  const [expandedOrderProducts, setExpandedOrderProducts] = useState<Record<string, boolean>>({});
  
  // Rationalization Modal State
  const [isRatModalOpen, setIsRatModalOpen] = useState(false);
  const [ratContextOrder, setRatContextOrder] = useState<ProductionOrder | null>(null);


  const ALL_PRODUCTION_STATUSES: ProductionOrderStatus[] = [
    'Планируется', 'Ожидает сырья', 'Готово к запуску', 'В производстве',
    'Контроль качества', 'Приостановлено', 'Завершено', 'Отменено'
  ];

  const fetchPageData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [ordersData, usersData, handoversData] = await Promise.all([
        apiService.getProductionOrders({ searchTerm, statusFilter, viewMode }),
        apiService.getUsersForAssignee(user.id),
        apiService.getShiftHandovers(),
      ]);
      setProductionOrders(ordersData);
      setUsersForAssigning(usersData);
      setHandovers(handoversData);
    } catch (err) {
      setError(`Не удалось загрузить данные для модуля "Производство".`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, searchTerm, statusFilter, viewMode]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  const handleOpenEditor = (order?: ProductionOrder) => {
    const path = order ? `${ROUTE_PATHS.PRODUCTION}/${order.id}` : `${ROUTE_PATHS.PRODUCTION}/new`;
    navigate(path);
  };

  const handleOpenRunModal = (order: ProductionOrder, item: ProductionOrderItem) => {
    setSelectedOrderForRun(order);
    setSelectedItemForRun(item);
    setIsRunModalOpen(true);
  };
  
  const handleCloseRunModal = () => {
    setIsRunModalOpen(false);
    setSelectedOrderForRun(null);
    setSelectedItemForRun(null);
    fetchPageData(); // Refresh list after modal closes
  };
  
  const handleOpenRatModal = (order: ProductionOrder) => {
      setRatContextOrder(order);
      setIsRatModalOpen(true);
  };

  const handleCreateRationalization = async (title: string, description: string, tags: string, type: any, ratDetails: any) => {
      if (!ratContextOrder) return;
      try {
          // Prepend context to description if not already handled
          const contextDesc = `**Контекст:** Производственное задание #${ratContextOrder.id} ("${ratContextOrder.name}")\n\n${description}`;
          
          await apiService.addDiscussionTopic({
                title,
                description: contextDesc,
                tags: [...tags.split(',').map(t=>t.trim()).filter(Boolean), 'производство', 'рацпредложение'],
                status: 'open',
                type: type,
                rationalization: ratDetails,
            });
          setIsRatModalOpen(false);
          setRatContextOrder(null);
          alert("Предложение успешно отправлено на рассмотрение!");
      } catch (err) {
          alert((err as Error).message);
      }
  };


  const getStatusColorClass = (status: ProductionOrderStatus | null): string => {
    if (!status) return PRODUCTION_ORDER_STATUS_COLOR_MAP['default'];
    return PRODUCTION_ORDER_STATUS_COLOR_MAP[status] || PRODUCTION_ORDER_STATUS_COLOR_MAP['default'];
  };
  
  const getAssigneeName = (assigneeId?: string | null): string => {
    if (!assigneeId) return 'Не назначен';
    const assignee = usersForAssigning.find(u => u.id === assigneeId);
    return assignee?.name || assignee?.email || assigneeId;
  };
  
  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderProducts(prev => ({...prev, [orderId]: !prev[orderId]}));
  };

  const tabButtonStyle = (tabName: ActiveTab) =>
    `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ` +
    (activeTab === tabName
      ? 'border-brand-primary text-brand-primary bg-brand-surface'
      : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border');


  return (
    <div className="space-y-6">
      {/* Mode Indicator Banner */}
      <div className={`p-3 rounded-lg flex items-center justify-between ${systemMode === 'mobilization' ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
           <div className="flex items-center">
               {systemMode === 'mobilization' ? <FireIcon className="h-6 w-6 mr-2 animate-pulse text-red-600"/> : <ScaleIcon className="h-6 w-6 mr-2 text-emerald-600"/>}
               <div>
                   <h3 className="font-bold text-sm">ТЕКУЩИЙ РЕЖИМ: {systemMode === 'mobilization' ? 'МОБИЛИЗАЦИЯ' : 'РАЗВИТИЕ'}</h3>
                   <p className="text-xs opacity-80">{systemMode === 'mobilization' ? 'Жесткий контроль ресурсов. Запуск без сырья заблокирован.' : 'Стандартный режим. Допускаются гибкие решения.'}</p>
               </div>
           </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
          <ProductionIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Производственные Задания
        </h1>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button onClick={() => navigate(ROUTE_PATHS.PRODUCTION_KIOSK)} variant="secondary" leftIcon={<DevicePhoneMobileIcon className="h-5 w-5"/>} fullWidth={isMobileView}>
             Режим Терминала
          </Button>
          {activeTab === 'orders' && (
              <Button
                onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
                variant="secondary"
                leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}
                disabled={isLoading || isInteractionLoading}
                fullWidth={isMobileView}
              >
                {viewMode === 'active' ? 'Архив' : 'Активные'}
              </Button>
          )}
          {viewMode === 'active' && activeTab === 'orders' && (
            <Button onClick={() => handleOpenEditor()} variant="primary" disabled={isInteractionLoading} fullWidth={isMobileView}>
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Создать Задание
            </Button>
          )}
        </div>
      </div>
      
      <div className="border-b border-brand-border">
        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
          <button onClick={() => setActiveTab('orders')} className={tabButtonStyle('orders')}>
            <ProductionIcon className="h-5 w-5 mr-2"/> Задания
          </button>
          <button onClick={() => setActiveTab('handovers')} className={tabButtonStyle('handovers')}>
            <ClockIcon className="h-5 w-5 mr-2"/> Журнал Смен
          </button>
        </nav>
      </div>

      <Card>
        {activeTab === 'orders' && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Input
                    id="production-search"
                    type="text"
                    placeholder="Поиск по ID, названию, продукции, ответственному..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                  />
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2">
                        <FunnelIcon className="h-5 w-5 text-brand-text-muted" />
                      </span>
                    <select
                      id="production-status-filter"
                      name="statusFilter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as ProductionOrderStatus | 'Все')}
                      className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-brand-text-primary placeholder-brand-text-muted"
                    >
                      <option value="Все">Все статусы</option>
                      {ALL_PRODUCTION_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
        
                {(isLoading || isInteractionLoading) && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
                {error && <p className="text-red-500 text-center p-4">{error}</p>}
                
                {!isLoading && !isInteractionLoading && !error && (
                  productionOrders.length > 0 ? (
                    isMobileView ? (
                         <div>
                            {productionOrders.map(order => (
                                <MobileProductionOrderCard 
                                    key={order.id}
                                    order={order}
                                    onView={handleOpenEditor}
                                    onOpenRunModal={handleOpenRunModal}
                                    getAssigneeName={getAssigneeName}
                                    getStatusColorClass={getStatusColorClass}
                                />
                            ))}
                         </div>
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                          <tr>
                            <th className="p-1 w-8"></th>
                            <th scope="col" className="px-4 py-3">ID / Название Задания</th>
                            <th scope="col" className="px-6 py-3">Статус</th>
                            <th scope="col" className="px-6 py-3">Ответственный</th>
                            <th scope="col" className="px-6 py-3 text-center">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                          {productionOrders.map((order) => (
                            <React.Fragment key={order.id}>
                            <tr className={`hover:bg-brand-secondary transition-colors cursor-pointer ${order.isArchived ? 'opacity-70' : ''} ${order.hasMaterialShortage ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500' : ''}`} onClick={() => handleOpenEditor(order)}>
                              <td className="px-2 py-4" onClick={e => { e.stopPropagation(); toggleExpandOrder(order.id); }}>
                                <Button variant="ghost" size="sm" className="p-1">
                                    {expandedOrderProducts[order.id] ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                                </Button>
                              </td>
                              <td className="px-4 py-4 font-medium text-brand-text-primary">
                                <div className="flex items-center">
                                  {order.hasMaterialShortage && (
                                      <Tooltip text="ДЕФИЦИТ СЫРЬЯ: Производство невозможно без пополнения склада">
                                        <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500 flex-shrink-0 animate-pulse"/>
                                      </Tooltip>
                                  )}
                                  <div>
                                    <p>{order.name}</p>
                                    <p className="text-xs text-brand-text-muted">{order.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColorClass(order.status)}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs">{getAssigneeName(order.assignedToId)}</td>
                              <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center space-x-1">
                                   <Tooltip text="Предложить улучшение">
                                     <Button variant="ghost" size="sm" onClick={() => handleOpenRatModal(order)} className="text-amber-500 hover:text-amber-400">
                                        <LightBulbIcon className="h-5 w-5" />
                                     </Button>
                                   </Tooltip>
                                   <Tooltip text="Редактировать">
                                     <Button variant="ghost" size="sm" onClick={() => handleOpenEditor(order)} aria-label="Редактировать" disabled={isInteractionLoading}>
                                       <PencilSquareIcon className="h-5 w-5" />
                                     </Button>
                                   </Tooltip>
                                </div>
                              </td>
                            </tr>
                            {expandedOrderProducts[order.id] && (
                                <tr>
                                    <td colSpan={5} className="p-0 bg-brand-surface">
                                        <div className="p-3">
                                            <h4 className="text-sm font-semibold mb-2 ml-4 text-brand-text-primary">Продукция к производству:</h4>
                                            <table className="w-full text-xs">
                                                <thead className="bg-brand-card/50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Название</th>
                                                        <th className="px-4 py-2 text-center">План</th>
                                                        <th className="px-4 py-2 text-center">Факт</th>
                                                        <th className="px-4 py-2 text-right"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-brand-border/50">
                                                    {order.orderItems.map(item => (
                                                        <tr key={item.id} className="hover:bg-brand-secondary/50">
                                                            <td className="px-4 py-2">{item.productName}</td>
                                                            <td className="px-4 py-2 text-center">{item.plannedQuantity} {item.unit}</td>
                                                            <td className="px-4 py-2 text-center">{item.producedQuantity || 0} {item.unit}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                {viewMode === 'active' && !['Завершено', 'Отменено'].includes(order.status) && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleOpenRunModal(order, item)}
                                                                        className={order.hasMaterialShortage ? "bg-gray-400 cursor-not-allowed text-white" : "bg-teal-600 hover:bg-teal-500 text-white"}
                                                                        leftIcon={<PlayCircleIcon className="h-4 w-4"/>}
                                                                        title={order.hasMaterialShortage ? "Дефицит сырья" : "Начать"}
                                                                    >
                                                                        Начать производить
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )
                  ) : (
                    <div className="text-center p-8 text-brand-text-muted">
                      <TableCellsIcon className="h-12 w-12 mx-auto mb-2" />
                      <p>Производственные задания не найдены.</p>
                      {(searchTerm || statusFilter !== 'Все') && <p className="text-sm">Попробуйте изменить фильтры или условия поиска.</p>}
                    </div>
                  )
                )}
            </>
        )}
        
        {activeTab === 'handovers' && (
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                        <tr>
                            <th className="px-4 py-3">Дата/Время</th>
                            <th className="px-4 py-3">Сдал смену</th>
                            <th className="px-4 py-3">Заметки</th>
                            <th className="px-4 py-3 text-center">Проблемы</th>
                            <th className="px-4 py-3 text-center">Чистота</th>
                            <th className="px-4 py-3 text-center">Оборудование</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {handovers.length > 0 ? handovers.map(ho => (
                            <tr key={ho.id} className="hover:bg-brand-secondary">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(ho.timestamp).toLocaleString()}</td>
                                <td className="px-4 py-3">{ho.outgoingUserName}</td>
                                <td className="px-4 py-3 truncate max-w-xs" title={ho.notes}>{ho.notes}</td>
                                <td className="px-4 py-3 text-center">
                                    {ho.issuesFlagged ? <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mx-auto"/> : <span className="text-emerald-500 text-xs">Нет</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {ho.cleanlinessChecked ? <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto"/> : <XCircleIcon className="h-5 w-5 text-red-500 mx-auto"/>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {ho.equipmentChecked ? <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto"/> : <XCircleIcon className="h-5 w-5 text-red-500 mx-auto"/>}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-brand-text-muted">История смен пуста.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        )}
      </Card>
      
      {isRunModalOpen && selectedOrderForRun && selectedItemForRun && (
        <ProductionRunModal
            isOpen={isRunModalOpen}
            onClose={handleCloseRunModal}
            order={selectedOrderForRun}
            itemToProduce={selectedItemForRun}
        />
      )}
      
       {isRatModalOpen && (
          <CreateTopicModal
            isOpen={isRatModalOpen}
            onClose={() => { setIsRatModalOpen(false); setRatContextOrder(null); }}
            onCreate={handleCreateRationalization}
          />
      )}

       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
};

export default ProductionPage;
