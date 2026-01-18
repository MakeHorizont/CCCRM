
import React, { useMemo, useState } from 'react';
import { DndContext, useDraggable, DragEndEvent, DragStartEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { ProductionOrder } from '../../types';
import { PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import { ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import { apiService } from '../../services/apiService';

interface ProductionScheduleProps {
  orders: ProductionOrder[];
  onOrderUpdate?: () => void;
}

const CELL_WIDTH = 40;
const SIDEBAR_WIDTH = 250;

const DraggableBar: React.FC<{
    order: ProductionOrder;
    left: number;
    width: number;
    colorClass: string;
    isOverlay?: boolean;
    hasConflict?: boolean;
}> = ({ order, left, width, colorClass, isOverlay, hasConflict }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: order.id,
        data: { order, initialLeft: left }
    });

    const style: React.CSSProperties = {
        left: left,
        width: width,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        position: 'absolute',
        top: '6px',
        opacity: isDragging && !isOverlay ? 0.5 : 1,
        zIndex: isDragging || isOverlay ? 100 : 10,
        cursor: 'grab',
    };

    const getBgClass = (status: string) => {
         if (status === 'Завершено') return 'bg-emerald-500';
         if (status === 'В производстве') return 'bg-blue-500';
         if (status === 'Ожидает сырья') return 'bg-amber-500';
         if (status === 'Готово к запуску') return 'bg-lime-500';
         if (status === 'Контроль качества') return 'bg-purple-500';
         if (status === 'Отменено') return 'bg-red-500';
         return 'bg-zinc-400';
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners}
            className={`h-6 rounded text-[10px] text-white px-2 flex items-center whitespace-nowrap overflow-hidden shadow-sm hover:opacity-90 ${getBgClass(order.status)} ${isOverlay ? 'ring-2 ring-white shadow-xl' : ''} ${hasConflict ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
        >
            {hasConflict && <ExclamationTriangleIcon className="h-3 w-3 mr-1 text-white flex-shrink-0"/>}
            <span className="truncate drop-shadow-md font-medium">{Math.round(width / CELL_WIDTH)} дн.</span>
        </div>
    );
};


const ProductionSchedule: React.FC<ProductionScheduleProps> = ({ orders, onOrderUpdate }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d;
  });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const daysToShow = 30;
  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate]);

  const activeOrders = useMemo(() => {
    return orders.filter(o => !o.isArchived && o.status !== 'Отменено' && o.plannedStartDate && o.plannedEndDate);
  }, [orders]);

  // Conflict Detection: multiple POs using same equipment at same time
  const conflicts = useMemo(() => {
      const conflictSet = new Set<string>();
      activeOrders.forEach(o1 => {
          activeOrders.forEach(o2 => {
              if (o1.id === o2.id) return;
              // Check if they share any equipment and overlap in time
              // For simplicity, let's assume each PO uses a specific stove/station (mock logic)
              // In real app, we check orderItem -> techCard -> equipment
              // Mock: assume same assignedToId or similar logic
              const start1 = new Date(o1.plannedStartDate!).getTime();
              const end1 = new Date(o1.plannedEndDate!).getTime();
              const start2 = new Date(o2.plannedStartDate!).getTime();
              const end2 = new Date(o2.plannedEndDate!).getTime();

              const overlaps = (start1 < end2 && end1 > start2);
              const sameAssignee = o1.assignedToId === o2.assignedToId && o1.assignedToId !== null;

              if (overlaps && sameAssignee) {
                  conflictSet.add(o1.id);
                  conflictSet.add(o2.id);
              }
          });
      });
      return conflictSet;
  }, [activeOrders]);

  const shiftTime = (days: number) => {
    setStartDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      return d;
    });
  };

  const getBarPosition = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const viewStart = dates[0].getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const offsetDays = (s - viewStart) / oneDay;
    const durationDays = Math.max(1, (e - s) / oneDay);
    return { left: offsetDays * CELL_WIDTH, width: durationDays * CELL_WIDTH };
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
      const { active, delta } = event;
      setActiveDragId(null);
      const daysShifted = Math.round(delta.x / CELL_WIDTH);
      if (daysShifted !== 0) {
          const order = active.data.current?.order as ProductionOrder;
          if (!order || !order.plannedStartDate || !order.plannedEndDate) return;
          const newStart = new Date(new Date(order.plannedStartDate).getTime() + daysShifted * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const newEnd = new Date(new Date(order.plannedEndDate).getTime() + daysShifted * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          try {
              if ((apiService as any).rescheduleProductionOrder) {
                  await (apiService as any).rescheduleProductionOrder(order.id, newStart, newEnd);
                  if (onOrderUpdate) onOrderUpdate();
              }
          } catch (err) { alert("Ошибка переноса: " + (err as Error).message); }
      }
  };

  const todayOffset = (new Date().setHours(0,0,0,0) - dates[0].getTime()) / (24 * 60 * 60 * 1000);
  const todayLeft = todayOffset * CELL_WIDTH + (CELL_WIDTH / 2);
  const showTodayLine = todayOffset >= 0 && todayOffset < daysToShow;
  const activeOrderData = activeOrders.find(o => o.id === activeDragId);
  const activeBarPos = activeOrderData ? getBarPosition(activeOrderData.plannedStartDate!, activeOrderData.plannedEndDate!) : null;

  return (
    <div className="flex flex-col h-full bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-inner">
      <div className="flex justify-between items-center p-2 border-b border-brand-border bg-brand-surface">
        <div className="flex items-center space-x-2">
            <button onClick={() => shiftTime(-7)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><ChevronLeftIcon className="h-5 w-5"/></button>
            <span className="text-sm font-medium text-brand-text-primary w-40 text-center">{dates[0].toLocaleDateString()} - {dates[dates.length-1].toLocaleDateString()}</span>
            <button onClick={() => shiftTime(7)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><ChevronRightIcon className="h-5 w-5"/></button>
        </div>
        <div className="text-xs text-brand-text-secondary flex items-center gap-4">
            {conflicts.size > 0 && <span className="flex items-center text-red-500 font-bold"><ExclamationTriangleIcon className="h-4 w-4 mr-1"/> Обнаружены накладки</span>}
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>Сегодня</span>
        </div>
      </div>

      <DndContext modifiers={[restrictToHorizontalAxis]} onDragStart={(e) => setActiveDragId(e.active.id as string)} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="flex-grow overflow-auto custom-scrollbar-thin relative select-none">
        <div className="min-w-max">
            <div className="flex sticky top-0 z-20 bg-brand-surface border-b border-brand-border h-[40px]">
                <div style={{ width: SIDEBAR_WIDTH }} className="flex-shrink-0 p-2 border-r border-brand-border font-bold text-xs text-brand-text-secondary sticky left-0 bg-brand-surface z-30 flex items-center shadow-sm">Задание</div>
                <div className="flex relative">
                    {dates.map((d, i) => (
                        <div key={i} style={{ width: CELL_WIDTH }} className={`flex-shrink-0 text-[10px] text-center p-1 border-r border-brand-border/50 flex flex-col justify-center ${[0,6].includes(d.getDay()) ? 'bg-zinc-100 dark:bg-zinc-800/50' : ''}`}>
                            <span className="font-bold">{d.getDate()}</span>
                            <span className="opacity-50 text-[9px]">{['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}</span>
                        </div>
                    ))}
                     {showTodayLine && <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 pointer-events-none" style={{ left: todayLeft }}></div>}
                </div>
            </div>

            {activeOrders.map(order => {
                const pos = getBarPosition(order.plannedStartDate!, order.plannedEndDate!);
                const hasConflict = conflicts.has(order.id);
                return (
                    <div key={order.id} className={`flex border-b border-brand-border/30 hover:bg-brand-secondary/30 transition-colors group h-[36px] ${hasConflict ? 'bg-red-500/5' : ''}`}>
                        <div style={{ width: SIDEBAR_WIDTH }} className={`flex-shrink-0 p-2 border-r border-brand-border text-xs truncate sticky left-0 z-20 flex items-center ${hasConflict ? 'bg-red-50 dark:bg-red-900/10 font-bold text-red-600' : 'bg-brand-card text-brand-text-primary'}`}>
                            <Tooltip text={
                                 <div className="text-xs">
                                    <p className="font-bold">{order.name}</p>
                                    <p>{new Date(order.plannedStartDate!).toLocaleDateString()} - {new Date(order.plannedEndDate!).toLocaleDateString()}</p>
                                    {hasConflict && <p className="text-red-400 mt-1 font-bold">ВНИМАНИЕ: Накладка по ресурсам/исполнителю!</p>}
                                </div>
                            } position="right">
                                <span className="cursor-help flex items-center">
                                    {hasConflict && <ExclamationTriangleIcon className="h-3 w-3 mr-1 text-red-500"/>}
                                    {order.name}
                                </span>
                            </Tooltip>
                        </div>
                        <div className="flex relative">
                             {dates.map((_, i) => <div key={i} style={{ width: CELL_WIDTH }} className="flex-shrink-0 border-r border-brand-border/30 h-full"/>)}
                             {showTodayLine && <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none opacity-30" style={{ left: todayLeft }}></div>}
                            <DraggableBar order={order} left={pos.left} width={pos.width} colorClass={PRODUCTION_ORDER_STATUS_COLOR_MAP[order.status] || 'text-zinc-500'} hasConflict={hasConflict} />
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
      <DragOverlay>
        {activeOrderData && activeBarPos ? (
             <DraggableBar order={activeOrderData} left={0} width={activeBarPos.width} colorClass={PRODUCTION_ORDER_STATUS_COLOR_MAP[activeOrderData.status] || 'text-zinc-500'} isOverlay />
        ) : null}
      </DragOverlay>
      </DndContext>
    </div>
  );
};

export default ProductionSchedule;
