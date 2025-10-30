import React, { useState, useMemo } from 'react';
import { Order, WarehouseItem } from '../../types';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS, ORDER_STATUS_COLOR_MAP, PRIORITY_ICON_MAP } from '../../constants';
import {
    ArrowLeftIcon, CheckCircleIcon, XCircleIcon, DocumentChartBarIcon, FireIcon, StarIcon, SparklesIcon, HashtagIcon,
    PencilSquareIcon, CogIcon, ReceiptPercentIcon, DocumentTextIcon, CalendarDaysIcon, UserCircleIcon as ContactIcon,
    TruckIcon, TrashIcon
} from '../UI/Icons';
import ConfirmationModal from '../UI/ConfirmationModal';
import Input from '../UI/Input';

interface OrderDetailsViewProps {
  order: Order;
  warehouseItems: WarehouseItem[];
  allOrders: Order[];
  onClose: () => void;
  onEdit: (order: Order) => void;
  onSendToProduction: (order: Order) => void;
  onGenerateDocument: (order: Order, type: 'invoice' | 'waybill') => void;
  onSeizeStock: (order: Order) => void;
  isInteractionLoading: boolean;
}

const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({ order, warehouseItems, allOrders, onClose, onEdit, onSendToProduction, onGenerateDocument, onSeizeStock, isInteractionLoading }) => {
    const [isSeizureConfirmOpen, setIsSeizureConfirmOpen] = useState(false);
    const [seizureConfirmationText, setSeizureConfirmationText] = useState('');
    const SEIZURE_CONFIRM_PHRASE = 'ПЕРЕХВАТ';
    
    const PriorityDisplay: React.FC<{priority?: Order['customerPriority']}> = React.memo(({ priority }) => {
        if (!priority) return null;
        const priorityInfo = PRIORITY_ICON_MAP[priority];
        const IconComponent = priorityInfo.icon;
        return <IconComponent className={`h-4 w-4 ${priorityInfo.color}`} />;
    });
    
    const orderItemsWithDetails = useMemo(() => {
        const isAssembledOrShipped = ['Собран', 'Отправлен', 'Доставлен'].includes(order.status);

        return order.items.map(item => {
            const warehouseItem = warehouseItems.find(wh => wh.id === item.productId);
            const stockQty = warehouseItem?.quantity || 0;
            const shortage = isAssembledOrShipped ? 0 : Math.max(0, item.quantity - stockQty);
            const weight = (warehouseItem?.shippingWeightGrams || 0) * item.quantity;
            const locationName = warehouseItem?.locationName || '-';

            const assembledQty = allOrders
              .filter(o => o.status === 'Собран' && o.id !== order.id)
              .flatMap(o => o.items)
              .filter(i => i.productId === item.productId)
              .reduce((sum, i) => sum + i.quantity, 0);

            return { ...item, stockQty, shortage, weight, locationName, assembledQty };
        });
    }, [order, warehouseItems, allOrders]);
    
    const totalShortage = useMemo(() => orderItemsWithDetails.reduce((sum, item) => sum + item.shortage, 0), [orderItemsWithDetails]);

    const totalWeightGrams = orderItemsWithDetails.reduce((sum, item) => sum + item.weight, 0);
    const shippingWeightGrams = (totalWeightGrams || 0) * 1.1;

    return (
      <>
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Button onClick={onClose} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                    К списку заказов
                </Button>
                <div className="flex space-x-2">
                     {!order.productionOrderId && order.status !== 'Отменен' && (
                         <Button size="sm" onClick={() => onSendToProduction(order)} disabled={isInteractionLoading} leftIcon={<CogIcon className="h-4 w-4"/>}>В производство</Button>
                     )}
                     <Button size="sm" onClick={() => onEdit(order)} disabled={isInteractionLoading} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                </div>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold text-brand-text-primary">Заказ #{order.id}</h1>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${ORDER_STATUS_COLOR_MAP[order.status] || ORDER_STATUS_COLOR_MAP['default']}`}>
                        {order.status}
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold text-brand-text-primary mb-2 flex items-center"><ContactIcon className="h-5 w-5 mr-2 text-brand-primary"/>Информация о клиенте</h4>
                        <p className="text-sm flex items-center space-x-2"><strong>Имя:</strong> <span className="text-brand-text-primary">{order.customerName}</span> <PriorityDisplay priority={order.customerPriority} /></p>
                        <p className="text-sm"><strong>Адрес:</strong> <span className="text-brand-text-primary">{order.shippingAddress || 'Не указан'}</span></p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-brand-text-primary mb-2 flex items-center"><CalendarDaysIcon className="h-5 w-5 mr-2 text-brand-primary"/>Статусы и даты</h4>
                        <p className="text-sm"><strong>Дата заказа:</strong> <span className="text-brand-text-primary">{new Date(order.date).toLocaleDateString('ru-RU')}</span></p>
                        <p className="text-sm flex items-center"><strong>Оплата:</strong> {order.isPaid ? <CheckCircleIcon className="h-4 w-4 text-emerald-400 ml-2"/> : <XCircleIcon className="h-4 w-4 text-red-400 ml-2"/>}</p>
                        <p className="text-sm flex items-center"><strong>Счет отправлен:</strong> {order.isInvoiceSent ? <CheckCircleIcon className="h-4 w-4 text-emerald-400 ml-2"/> : <XCircleIcon className="h-4 w-4 text-red-400 ml-2"/>}</p>
                         {order.productionOrderId && (
                            <p className="text-sm">
                                <strong>Производство:</strong> 
                                <Link to={`${ROUTE_PATHS.PRODUCTION}?poId=${order.productionOrderId}`} className="text-sky-400 hover:underline ml-1">
                                   Задание #{order.productionOrderId}
                                </Link>
                            </p>
                         )}
                    </div>
                </div>
            </Card>

            <Card>
                <h4 className="font-semibold text-brand-text-primary mb-2">Состав заказа</h4>
                 <div className="overflow-x-auto border border-brand-border rounded-lg">
                    <table className="min-w-full text-xs text-left text-brand-text-secondary">
                        <thead className="uppercase bg-brand-surface">
                            <tr>
                                <th className="px-3 py-2">Название</th>
                                <th className="px-3 py-2 text-center w-16">Кол-во</th>
                                <th className="px-3 py-2 text-center w-16">Нехватка</th>
                                <th className="px-3 py-2 text-center w-16">На складе</th>
                                <th className="px-3 py-2 text-center w-16">Собраны</th>
                                <th className="px-3 py-2 text-right w-20">Цена</th>
                                <th className="px-3 py-2 text-right w-20">Сумма</th>
                                <th className="px-3 py-2 text-right w-20">Вес (гр)</th>
                                <th className="px-3 py-2 text-left w-24">Расположение</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {orderItemsWithDetails.map(item => (
                                <tr key={item.id}>
                                    <td className="px-3 py-2 font-medium text-brand-text-primary truncate">{item.productName}</td>
                                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                                    <td className={`px-3 py-2 text-center font-semibold ${item.shortage > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{item.shortage}</td>
                                    <td className="px-3 py-2 text-center">{item.stockQty}</td>
                                    <td className="px-3 py-2 text-center text-teal-400">{item.assembledQty}</td>
                                    <td className="px-3 py-2 text-right">{item.pricePerUnit.toLocaleString('ru-RU')} ₽</td>
                                    <td className="px-3 py-2 text-right font-semibold text-brand-text-primary">{(item.quantity * item.pricePerUnit).toLocaleString('ru-RU')} ₽</td>
                                    <td className="px-3 py-2 text-right">{(item.weight || 0).toLocaleString('ru-RU')}</td>
                                    <td className="px-3 py-2 text-left truncate" title={item.locationName}>{item.locationName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                     <h4 className="font-semibold text-brand-text-primary mb-2">Доставка и Опции</h4>
                     <p className="text-sm"><strong>Способ:</strong> <span className="text-brand-text-primary">{order.deliveryType === 'delivery' ? 'Доставка' : 'Самовывоз'}</span></p>
                     <p className="text-sm"><strong>Термоизоляция:</strong> <span className="text-brand-text-primary">{order.thermalInsulation ? 'Да' : 'Нет'}</span></p>
                     <p className="text-sm"><strong>Стоимость доставки:</strong> <span className="text-brand-text-primary">{(order.deliveryCost || 0).toLocaleString('ru-RU')} ₽</span></p>
                      {order.waybillAttachmentUrl && (
                        <p className="text-sm mt-1">
                            <strong>Трансп. накладная:</strong> 
                            <a href={order.waybillAttachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline ml-1">
                                {order.waybillAttachmentUrl.split('/').pop()}
                            </a>
                        </p>
                     )}
                </Card>
                <Card>
                    <h4 className="font-semibold text-brand-text-primary mb-2">Итоги и Вес</h4>
                    <p className="text-sm"><strong>Вес (нетто):</strong> <span className="text-brand-text-primary">{((totalWeightGrams || 0) / 1000).toFixed(2)} кг</span></p>
                    <p className="text-sm"><strong>Вес (отгруз.):</strong> <span className="text-brand-text-primary">{(shippingWeightGrams / 1000).toFixed(2)} кг</span></p>
                    <p className="text-sm font-bold"><strong>Итого:</strong> <span className="text-brand-text-primary">{order.amount.toLocaleString('ru-RU')} ₽</span></p>
                </Card>
             </div>
              {order.notes && <Card><h4 className="font-semibold text-brand-text-primary mb-1">Заметки</h4><p className="text-sm italic">{order.notes}</p></Card>}
               {order.history && order.history.length > 0 && (
                  <Card>
                      <h4 className="font-semibold text-brand-text-primary mb-1">История Заказа</h4>
                      <ul className="text-xs space-y-1 max-h-40 overflow-y-auto custom-scrollbar-thin pr-2">
                          {order.history.slice().reverse().map(entry => (
                              <li key={entry.id} className="text-brand-text-muted">
                                  [{new Date(entry.timestamp).toLocaleString('ru-RU')}] {entry.userName}: {entry.details}
                              </li>
                          ))}
                      </ul>
                  </Card>
              )}
             <Card>
                 <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                        <Button size="sm" onClick={() => onGenerateDocument(order, 'invoice')} disabled={isInteractionLoading} leftIcon={<ReceiptPercentIcon className="h-4 w-4"/>}>Счет</Button>
                        <Button size="sm" onClick={() => onGenerateDocument(order, 'waybill')} disabled={isInteractionLoading} leftIcon={<DocumentTextIcon className="h-4 w-4"/>}>Накладная</Button>
                    </div>
                     <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setIsSeizureConfirmOpen(true)}
                        disabled={isInteractionLoading || totalShortage === 0}
                        leftIcon={<FireIcon className="h-4 w-4"/>}
                    >
                        Приоритетный перехват
                    </Button>
                </div>
             </Card>
        </div>
        
        {isSeizureConfirmOpen && (
            <ConfirmationModal
                isOpen={isSeizureConfirmOpen}
                onClose={() => { setIsSeizureConfirmOpen(false); setSeizureConfirmationText(''); }}
                onConfirm={() => {
                    onSeizeStock(order);
                    setIsSeizureConfirmOpen(false);
                    setSeizureConfirmationText('');
                }}
                title="Подтверждение перехвата товаров"
                message={
                    <div className="space-y-3 text-sm">
                        <p>Вы собираетесь перераспределить недостающие товары для этого заказа из других, менее приоритетных заказов. Это может изменить их статус на "Не может быть собран".</p>
                        <p>Это действие будет записано в историю заказа.</p>
                        <p>Для подтверждения, введите <strong className="text-red-400">{SEIZURE_CONFIRM_PHRASE}</strong> в поле ниже:</p>
                        <Input
                            id="seizure-confirm-text"
                            type="text"
                            value={seizureConfirmationText}
                            onChange={(e) => setSeizureConfirmationText(e.target.value.toUpperCase())}
                            autoFocus
                        />
                    </div>
                }
                confirmText="Подтвердить перехват"
                confirmButtonVariant="danger"
                isLoading={isInteractionLoading}
                isConfirmDisabled={seizureConfirmationText !== SEIZURE_CONFIRM_PHRASE}
            />
        )}
         <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
      </>
    );
};

export default OrderDetailsView;