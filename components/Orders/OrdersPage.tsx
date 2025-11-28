import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from 'react';
import Card from '../UI/Card';
import { Order, OrderStatus } from '../../types';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useAuth } from '../../hooks/useAuth';
import {
    PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon,
    CheckCircleIcon, XCircleIcon, ArrowsUpDownIcon,
    ChevronDownIcon, ChevronUpIcon, ArchiveBoxIcon as ViewArchiveIcon,
    ShoppingCartIcon, TruckIcon, HashtagIcon
} from '../UI/Icons';
import { ORDER_STATUS_COLOR_MAP, ALL_ORDER_STATUSES, PRIORITY_ICON_MAP, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useNavigate } from 'react-router-dom'; 
import { useView } from '../../hooks/useView'; 
import MobileOrderCard from './MobileOrderCard';

type ViewMode = 'active' | 'archived';
type SortableOrderKeys = 'id' | 'customerName' | 'status' | 'amount' | 'date' | 'paidAt' | 'sentAt';
type SortDirection = 'asc' | 'desc';
type PaymentFilter = 'all' | 'paid' | 'unpaid';


const OrdersPage: React.FC = () => {
  const { isMobileView } = useView(); 
  const { user } = useAuth(); 
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'Все'>('Все');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableOrderKeys; direction: SortDirection }>({ key: 'date', direction: 'desc' });
  const [paymentSortOpen, setPaymentSortOpen] = useState(false);
  const paymentSortRef = useRef<HTMLDivElement>(null);


  const orderStatuses: Array<OrderStatus | 'Все'> = ['Все', ...ALL_ORDER_STATUSES];

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
       const data = await apiService.getOrders({ searchTerm, statusFilter, paymentFilter, viewMode });
       setOrders(data);
    } catch (err) {
      setError(`Не удалось загрузить ${viewMode === 'active' ? 'активные' : 'архивные'} заказы.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, paymentFilter, viewMode]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (paymentSortRef.current && !paymentSortRef.current.contains(event.target as Node)) {
            setPaymentSortOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const requestSort = (key: SortableOrderKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPaymentSortOpen(false);
  };

  const sortedOrders = useMemo(() => {
    let sortableItems = [...orders];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Order];
        const valB = b[sortConfig.key as keyof Order];
  
        if (sortConfig.key === 'paidAt' || sortConfig.key === 'sentAt' || sortConfig.key === 'date') {
            const dateA = valA ? new Date(valA as string).getTime() : 0;
            const dateB = valB ? new Date(valB as string).getTime() : 0;

            if (dateA === 0 && dateB === 0) return 0;
            if (dateA === 0) return 1;
            if (dateB === 0) return -1;
            
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
    }
    return sortableItems;
  }, [orders, sortConfig]);

  const getSortIcon = (key: SortableOrderKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowsUpDownIcon className="h-4 w-4 inline ml-1 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline ml-1" /> : <ChevronDownIcon className="h-4 w-4 inline ml-1" />;
  };

  const handleNavigateToOrder = (order: Order) => {
      navigate(`${ROUTE_PATHS.ORDERS}/${order.id}`);
  };
  
  const PriorityDisplay: React.FC<{priority?: Order['customerPriority']}> = React.memo(({ priority }) => {
    if (!priority) return <Tooltip text="Приоритет не установлен"><HashtagIcon className="h-4 w-4 text-brand-text-muted opacity-50" /></Tooltip>;
    const priorityInfo = PRIORITY_ICON_MAP[priority];
    const IconComponent = priorityInfo.icon;
    return (
        <Tooltip text={priorityInfo.label}>
          <IconComponent className={`h-5 w-5 ${priorityInfo.color}`} />
        </Tooltip>
    );
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
            <ShoppingCartIcon className="h-8 w-8 mr-3 text-brand-primary" />
            Заказы
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5" />} fullWidth={isMobileView}>{viewMode === 'active' ? 'Архив' : 'Активные'}</Button>
          {viewMode === 'active' && <Button onClick={() => navigate(`${ROUTE_PATHS.ORDERS}/new`)} variant="primary" fullWidth={isMobileView}><PlusCircleIcon className="h-5 w-5 mr-2" />Добавить заказ</Button>}
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Input id="orders-search-input" type="text" placeholder="Поиск по ID, клиенту, товару..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted" />} />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2"><FunnelIcon className="h-5 w-5 text-brand-text-muted" /></span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary">
              <option value="Все">Все статусы</option>
              {orderStatuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
           <div className="flex space-x-1 p-1 bg-brand-surface rounded-lg">
                <Button size="sm" variant={paymentFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setPaymentFilter('all')} className="flex-1">Все</Button>
                <Button size="sm" variant={paymentFilter === 'paid' ? 'secondary' : 'ghost'} onClick={() => setPaymentFilter('paid')} className="flex-1">Оплаченные</Button>
                <Button size="sm" variant={paymentFilter === 'unpaid' ? 'secondary' : 'ghost'} onClick={() => setPaymentFilter('unpaid')} className="flex-1">Неоплаченные</Button>
            </div>
        </div>
        
        {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
        {error && <p className="text-red-500 text-center p-4">{error}</p>}
        
        {!isLoading && !error && (
          sortedOrders.length > 0 ? (
            isMobileView ? (
              <div>{sortedOrders.map(order => (<MobileOrderCard key={order.id} order={order} onViewDetails={handleNavigateToOrder} PriorityDisplay={PriorityDisplay} />))}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                  <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                    <tr>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('id')}>Заказ ID {getSortIcon('id')}</th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('customerName')}>Клиент {getSortIcon('customerName')}</th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('status')}>Статус {getSortIcon('status')}</th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('amount')}>Сумма {getSortIcon('amount')}</th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('date')}>Дата {getSortIcon('date')}</th>
                      <th scope="col" className="px-4 py-3">
                          <div className="relative" ref={paymentSortRef}>
                              <button onClick={() => setPaymentSortOpen(p => !p)} className="flex items-center cursor-pointer">
                                  Оплата {getSortIcon('paidAt')} {getSortIcon('sentAt')} <ChevronDownIcon className="h-3 w-3 ml-1"/>
                              </button>
                              {paymentSortOpen && (
                                  <div className="absolute top-full mt-1 left-0 bg-brand-card border border-brand-border rounded-md shadow-lg z-10 text-xs whitespace-nowrap">
                                      <button onClick={() => requestSort('paidAt')} className="block w-full text-left px-3 py-1.5 hover:bg-brand-secondary">по дате оплаты</button>
                                      <button onClick={() => requestSort('sentAt')} className="block w-full text-left px-3 py-1.5 hover:bg-brand-secondary">по дате отправки</button>
                                  </div>
                              )}
                          </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {sortedOrders.map(order => (
                      <tr key={order.id} onClick={() => handleNavigateToOrder(order)} className={`hover:bg-brand-secondary transition-colors cursor-pointer ${order.isArchived ? 'opacity-70' : ''}`}>
                        <td className="px-4 py-3 font-medium text-brand-text-primary">{order.id}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><PriorityDisplay priority={order.customerPriority} /><span>{order.customerName}</span></div></td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium text-center ${ORDER_STATUS_COLOR_MAP[order.status] || ORDER_STATUS_COLOR_MAP['default']}`}>{order.status}</span></td>
                        <td className="px-4 py-3">₽{order.amount.toLocaleString('ru-RU')}</td>
                        <td className="px-4 py-3">{new Date(order.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center space-x-1">
                              {order.isPaid ? <CheckCircleIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              <span>{order.paidAt ? new Date(order.paidAt).toLocaleDateString() : '—'}</span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                              {order.sentAt ? <TruckIcon className="h-4 w-4 text-blue-500 flex-shrink-0" /> : <XCircleIcon className="h-4 w-4 text-brand-text-muted flex-shrink-0" />}
                              <span>{order.sentAt ? new Date(order.sentAt).toLocaleDateString() : '—'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : ( <div className="text-center p-8 text-brand-text-muted"><ShoppingCartIcon className="h-12 w-12 mx-auto mb-2" /><p>{viewMode === 'active' ? 'Активные заказы не найдены.' : 'Архивные заказы не найдены.'}</p></div>)
        )}
      </Card>
      
      <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
    </div>
  );
};

export default OrdersPage;