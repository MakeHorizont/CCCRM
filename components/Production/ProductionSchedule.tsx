
import React, { useMemo, useState } from 'react';
import { DndContext, useDraggable, DragEndEvent, DragStartEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { ProductionOrder } from '../../types';
import { PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import { ChevronLeftIcon, ChevronRightIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import { apiService } from '../../services/apiService';

interface ProductionScheduleProps {
  orders: ProductionOrder[];
  onOrderUpdate?: () => void; // Callback to refresh parent
}

const CELL_WIDTH = 40; // Width of one day column in px
const SIDEBAR_WIDTH = 250; // Width of the order name column

// Sub-component for the draggable bar
const DraggableBar: React.FC<{
    order: ProductionOrder;
    left: number;
    width: number;
    colorClass: string;
    isOverlay?: boolean;
}> = ({ order, left, width, colorClass, isOverlay }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: order.id,
        data: { order, initialLeft: left }
    });

    const style: React.CSSProperties = {
        left: left,
        width: width,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        position: 'absolute',
        top: '6px', // Center vertically in row
        opacity: isDragging && !isOverlay ? 0.5 : 1,
        zIndex: isDragging || isOverlay ? 100 : 10,
        cursor: 'grab',
    };

    // Extract generic color for bg (removing text color classes to avoid conflicts)
    // A simple mapping based on status is safer for the bar background
    const getBgClass = (status: string) => {
         if (status === 'Завершено') return 'bg-emerald-500';
         if (status === 'В производстве') return 'bg-blue-500';
         if (status === 'Ожидает сырья') return 'bg-amber-500';
         if (status === 'Готово к запуску') return 'bg-lime-500';
         if (status === 'Контроль качества') return 'bg-purple-500';
         if (status === 'Отменено') return 'bg-red-500';
         return 'bg-zinc-400';
    };

    const bgClass = getBgClass(order.status);

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners}
            className={`h-6 rounded text-[10px] text-white px-2 flex items-center whitespace-nowrap overflow-hidden shadow-sm hover:opacity-90 ${bgClass} ${isOverlay ? 'ring-2 ring-white shadow-xl' : ''}`}
        >
            <span className="truncate drop-shadow-md font-medium">{Math.round(width / CELL_WIDTH)} дн.</span>
        </div>
    );
};


const ProductionSchedule: React.FC<ProductionScheduleProps> = ({ orders, onOrderUpdate }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3); // Start view 3 days ago
    return d;
  });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const daysToShow = 30; // Show 30 days window

  // Generate dates array
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
    
    // Calculate offset in days relative to view start
    const offsetDays = (s - viewStart) / oneDay;
    
    // Calculate duration in days
    const durationDays = Math.max(1, (e - s) / oneDay); // Min 1 day
    
    // Visual calculation
    const left = offsetDays * CELL_WIDTH;
    const width = durationDays * CELL_WIDTH;

    return { left, width };
  };
  
  const handleDragStart = (event: DragStartEvent) => {
      setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
      const { active, delta } = event;
      setActiveDragId(null);
      
      // Calculate days shifted
      const daysShifted = Math.round(delta.x / CELL_WIDTH);
      
      if (daysShifted !== 0) {
          const order = active.data.current?.order as ProductionOrder;
          if (!order || !order.plannedStartDate || !order.plannedEndDate) return;

          const newStart = new Date(new Date(order.plannedStartDate).getTime() + daysShifted * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const newEnd = new Date(new Date(order.plannedEndDate).getTime() + daysShifted * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          try {
              // We assume this method exists in apiService based on previous steps
              // If TS complains, ensure it's added to productionService and exported in apiService
              if ((apiService as any).rescheduleProductionOrder) {
                  await (apiService as any).rescheduleProductionOrder(order.id, newStart, newEnd);
                  if (onOrderUpdate) onOrderUpdate();
              } else {
                  console.error("rescheduleProductionOrder method missing in apiService");
              }
          } catch (err) {
              alert("Ошибка переноса: " + (err as Error).message);
          }
      }
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Calculate "Today" line position
  const todayOffset = (today.getTime() - dates[0].getTime()) / (24 * 60 * 60 * 1000);
  const todayLeft = todayOffset * CELL_WIDTH + (CELL_WIDTH / 2);
  const showTodayLine = todayOffset >= 0 && todayOffset < daysToShow;
  
  const activeOrderData = activeOrders.find(o => o.id === activeDragId);
  const activeBarPos = activeOrderData ? getBarPosition(activeOrderData.plannedStartDate!, activeOrderData.plannedEndDate!) : null;


  return (
    <div className="flex flex-col h-full bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="flex justify-between items-center p-2 border-b border-brand-border bg-brand-surface">
        <div className="flex items-center space-x-2">
            <button onClick={() => shiftTime(-7)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><ChevronLeftIcon className="h-5 w-5"/></button>
            <span className="text-sm font-medium text-brand-text-primary w-40 text-center">
                {dates[0].toLocaleDateString()} - {dates[dates.length-1].toLocaleDateString()}
            </span>
            <button onClick={() => shiftTime(7)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><ChevronRightIcon className="h-5 w-5"/></button>
        </div>
        <div className="text-xs text-brand-text-secondary flex items-center gap-4">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>Сегодня</span>
            <span>Заданий: {activeOrders.length}</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <DndContext 
        modifiers={[restrictToHorizontalAxis]} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
      <div className="flex-grow overflow-auto custom-scrollbar-thin relative select-none">
        <div className="min-w-max">
            {/* Header Row */}
            <div className="flex sticky top-0 z-20 bg-brand-surface border-b border-brand-border h-[40px]">
                <div style={{ width: SIDEBAR_WIDTH }} className="flex-shrink-0 p-2 border-r border-brand-border font-bold text-xs text-brand-text-secondary sticky left-0 bg-brand-surface z-30 flex items-center shadow-sm">
                    Задание
                </div>
                <div className="flex relative">
                    {dates.map((d, i) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                            <div 
                                key={i} 
                                style={{ width: CELL_WIDTH }} 
                                className={`flex-shrink-0 text-[10px] text-center p-1 border-r border-brand-border/50 flex flex-col justify-center ${isWeekend ? 'bg-zinc-100 dark:bg-zinc-800/50' : ''}`}
                            >
                                <span className="font-bold">{d.getDate()}</span>
                                <span className="opacity-50 text-[9px]">{['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}</span>
                            </div>
                        );
                    })}
                     {showTodayLine && (
                        <div 
                            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 pointer-events-none"
                            style={{ left: todayLeft }}
                        ></div>
                    )}
                </div>
            </div>

            {/* Body Rows */}
            {activeOrders.map(order => {
                const pos = getBarPosition(order.plannedStartDate!, order.plannedEndDate!);
                
                return (
                    <div key={order.id} className="flex border-b border-brand-border/30 hover:bg-brand-secondary/30 transition-colors group h-[36px]">
                        {/* Sidebar Name */}
                        <div style={{ width: SIDEBAR_WIDTH }} className="flex-shrink-0 p-2 border-r border-brand-border text-xs text-brand-text-primary truncate sticky left-0 bg-brand-card z-20 group-hover:bg-brand-secondary/30 flex items-center">
                            <Tooltip text={
                                 <div className="text-xs">
                                    <p className="font-bold">{order.name}</p>
                                    <p>{new Date(order.plannedStartDate!).toLocaleDateString()} - {new Date(order.plannedEndDate!).toLocaleDateString()}</p>
                                    <p className="opacity-70">{order.status}</p>
                                    {order.assignedToId && <p className="opacity-70 mt-1">Исп: {order.assigneeName}</p>}
                                </div>
                            } position="right">
                                <span className="cursor-help">{order.name}</span>
                            </Tooltip>
                        </div>
                        
                        {/* Timeline Cells Background */}
                        <div className="flex relative">
                             {dates.map((d, i) => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                    <div 
                                        key={i} 
                                        style={{ width: CELL_WIDTH }} 
                                        className={`flex-shrink-0 border-r border-brand-border/30 h-full ${isWeekend ? 'bg-zinc-500/5' : ''}`}
                                    />
                                );
                            })}
                             {showTodayLine && (
                                <div 
                                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-10 pointer-events-none opacity-50"
                                    style={{ left: todayLeft }}
                                ></div>
                            )}

                            {/* The Draggable Bar */}
                            <DraggableBar 
                                order={order} 
                                left={pos.left} 
                                width={pos.width} 
                                colorClass={PRODUCTION_ORDER_STATUS_COLOR_MAP[order.status] || 'text-zinc-500'}
                            />
                        </div>
                    </div>
                );
            })}
            
            {activeOrders.length === 0 && (
                <div className="p-8 text-center text-brand-text-muted">Нет активных заданий с запланированными датами.</div>
            )}
        </div>
      </div>
      
      <DragOverlay>
        {activeOrderData && activeBarPos ? (
             <DraggableBar 
                order={activeOrderData} 
                left={0} // Position handled by transform in overlay
                width={activeBarPos.width} 
                colorClass={PRODUCTION_ORDER_STATUS_COLOR_MAP[activeOrderData.status] || 'text-zinc-500'}
                isOverlay
            />
        ) : null}
      </DragOverlay>
      </DndContext>
    </div>
  );
};

export default ProductionSchedule;
