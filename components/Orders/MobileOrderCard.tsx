import React from 'react';
import { Link } from 'react-router-dom';
import { Order, OrderStatus, ProductionOrderStatus } from '../../types';
import Card from '../UI/Card';
import Tooltip from '../UI/Tooltip';
import { ROUTE_PATHS, ORDER_STATUS_COLOR_MAP, PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import {
    CheckCircleIcon, XCircleIcon, DocumentChartBarIcon
} from '../UI/Icons';


interface MobileOrderCardProps {
  order: Order;
  onViewDetails: (order: Order) => void;
  PriorityDisplay: React.FC<{ priority?: Order['customerPriority'] }>;
}

const MobileOrderCard: React.FC<MobileOrderCardProps> = ({ order, onViewDetails, PriorityDisplay }) => {
  
  const getSalesOrderStatusColorClass = (status: OrderStatus | null): string => {
    if (!status) return ORDER_STATUS_COLOR_MAP['default'];
    return ORDER_STATUS_COLOR_MAP[status] || ORDER_STATUS_COLOR_MAP['default'];
  };
  
  const getProductionOrderStatusColorClass = (status: ProductionOrderStatus | null): string => {
    if (!status) return PRODUCTION_ORDER_STATUS_COLOR_MAP['default'];
    return PRODUCTION_ORDER_STATUS_COLOR_MAP[status] || PRODUCTION_ORDER_STATUS_COLOR_MAP['default'];
  };

  return (
    <Card className={`mb-3 ${order.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onViewDetails(order)}>
      <div className="w-full text-left">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-grow min-w-0">
              <h3 className="font-semibold text-brand-text-primary truncate" title={order.customerName}>{order.customerName}</h3>
              <p className="text-xs text-brand-text-muted">Заказ #{order.id} от {new Date(order.date).toLocaleDateString('ru-RU')}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              <PriorityDisplay priority={order.customerPriority} />
              <span className="font-semibold text-brand-text-primary">₽{order.amount.toLocaleString('ru-RU')}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs mb-3">
            <span className={`px-2 py-1 font-medium rounded-full text-center ${getSalesOrderStatusColorClass(order.status)}`}>
              {order.status}
            </span>
            {order.productionOrderId && order.productionOrderStatus && (
              <Tooltip text={`Статус Произв. Задания: ${order.productionOrderStatus}`}>
                <Link to={`${ROUTE_PATHS.PRODUCTION}/${order.productionOrderId}`} onClick={(e) => e.stopPropagation()} className={`block px-2 py-1 font-medium rounded-full text-center truncate ${getProductionOrderStatusColorClass(order.productionOrderStatus)} hover:opacity-80`}>
                  ПЗ: {order.productionOrderStatus}
                </Link>
              </Tooltip>
            )}
            <Tooltip text={order.isPaid ? "Оплачен" : "Не оплачен"} position="top">
              <span className="inline-block p-1">
                {order.isPaid ? <CheckCircleIcon className="h-4 w-4 text-emerald-500" /> : <XCircleIcon className="h-4 w-4 text-red-500" />}
              </span>
            </Tooltip>
            <Tooltip text={order.isInvoiceSent ? "Счет отправлен" : "Счет не отправлен"} position="top">
              <span className="inline-block p-1">
                {order.isInvoiceSent ? <DocumentChartBarIcon className="h-4 w-4 text-sky-500" /> : <XCircleIcon className="h-4 w-4 text-brand-text-muted" />}
              </span>
            </Tooltip>
          </div>
      </div>
    </Card>
  );
};

export default MobileOrderCard;