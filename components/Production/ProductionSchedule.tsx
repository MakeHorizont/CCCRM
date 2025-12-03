
import React, { useMemo, useState } from 'react';
import { ProductionOrder } from '../../types';
import { PRODUCTION_ORDER_STATUS_COLOR_MAP } from '../../constants';
import { ChevronLeftIcon, ChevronRightIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

interface ProductionScheduleProps {
  orders: ProductionOrder[];
}

const CELL_WIDTH = 40; // Width of one day column in px
const SIDEBAR_WIDTH = 250; // Width of the order name column

const ProductionSchedule: React.FC<ProductionScheduleProps> = ({ orders }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3); // Start view 3 days ago
    return d;
  });

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
    const viewEnd = dates[dates.length - 1].getTime() + (24 * 60 * 60 * 1000); // End of last day

    // Check intersection
    if (e < viewStart || s > viewEnd) return null;

    const oneDay = 24 * 60 * 60 * 1000;
    
    // Calculate offset in days relative to view start
    const offsetDays = Math.max(0, (s - viewStart) / oneDay);
    
    // Calculate duration in days (clamped to view)
    const durationDays = (e - s) / oneDay; // Total duration
    
    // Visual calculation
    const left = offsetDays * CELL_WIDTH;
    
    // If task started before view, reduce width and set left to 0
    let visualWidth = durationDays * CELL_WIDTH;
    
    if (s < viewStart) {
        visualWidth -= ((viewStart - s) / oneDay) * CELL_WIDTH;
    }

    return { left, width: Math.max(CELL_WIDTH / 2, visualWidth) }; // Min width half a day
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="flex flex-col h-full bg-brand-card border border-brand-border rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="flex justify-between items-center p-2 border-b border-brand-border bg-brand-surface">
        <div className="flex items-center space-x-2">
            <button onClick={() => shiftTime(-7)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><ChevronLeftIcon className="h-5 w-5"/></button>
            <span className="text-sm font-medium text-brand-text-primary">
                {dates[0].toLocaleDateString()} - {dates[dates.length-1].toLocaleDateString()}
            </span>
            <button onClick={() => shiftTime(7)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><ChevronRightIcon className="h-5 w-5"/></button>
        </div>
        <div className="text-xs text-brand-text-secondary">
            Всего заданий в графике: {activeOrders.length}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-grow overflow-auto custom-scrollbar-thin relative">
        <div className="min-w-max">
            {/* Header Row */}
            <div className="flex sticky top-0 z-20 bg-brand-surface border-b border-brand-border">
                <div style={{ width: SIDEBAR_WIDTH }} className="flex-shrink-0 p-2 border-r border-brand-border font-bold text-xs text-brand-text-secondary sticky left-0 bg-brand-surface z-30">
                    Задание
                </div>
                <div className="flex">
                    {dates.map((d, i) => {
                        const isToday = d.getTime() === today.getTime();
                        return (
                            <div 
                                key={i} 
                                style={{ width: CELL_WIDTH }} 
                                className={`flex-shrink-0 text-[10px] text-center p-1 border-r border-brand-border/50 flex flex-col justify-center ${isToday ? 'bg-blue-500/10 font-bold text-blue-500' : 'text-brand-text-muted'}`}
                            >
                                <span>{d.getDate()}</span>
                                <span className="opacity-50">{['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Body Rows */}
            {activeOrders.map(order => {
                const pos = getBarPosition(order.plannedStartDate!, order.plannedEndDate!);
                return (
                    <div key={order.id} className="flex border-b border-brand-border/30 hover:bg-brand-secondary/30 transition-colors group">
                        {/* Sidebar Name */}
                        <div style={{ width: SIDEBAR_WIDTH }} className="flex-shrink-0 p-2 border-r border-brand-border text-xs text-brand-text-primary truncate sticky left-0 bg-brand-card z-10 group-hover:bg-brand-secondary/30 flex items-center">
                            <span title={order.name}>{order.name}</span>
                        </div>
                        
                        {/* Timeline Cells Background */}
                        <div className="flex relative">
                             {dates.map((d, i) => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const isToday = d.getTime() === today.getTime();
                                return (
                                    <div 
                                        key={i} 
                                        style={{ width: CELL_WIDTH }} 
                                        className={`flex-shrink-0 border-r border-brand-border/30 h-full ${isToday ? 'bg-blue-500/5' : isWeekend ? 'bg-zinc-500/5' : ''}`}
                                    />
                                );
                            })}

                            {/* The Bar */}
                            {pos && (
                                <Tooltip text={
                                    <div className="text-xs">
                                        <p className="font-bold">{order.name}</p>
                                        <p>{new Date(order.plannedStartDate!).toLocaleDateString()} - {new Date(order.plannedEndDate!).toLocaleDateString()}</p>
                                        <p className="opacity-70">{order.status}</p>
                                        {order.assignedToId && <p className="opacity-70 mt-1">Исп: {order.assigneeName}</p>}
                                    </div>
                                }>
                                    <div 
                                        className={`absolute top-1.5 h-6 rounded text-[10px] text-white px-2 flex items-center whitespace-nowrap overflow-hidden shadow-sm transition-all hover:opacity-90 cursor-pointer ${PRODUCTION_ORDER_STATUS_COLOR_MAP[order.status].replace('text-', 'border-').split(' ')[0].replace('bg-', 'bg-').replace('dark:bg-', 'dark:bg-')}`}
                                        style={{ 
                                            left: pos.left, 
                                            width: pos.width,
                                            backgroundColor: 'var(--tw-bg-opacity)' // Hack to ensure tailwind bg class works if extracted
                                        }}
                                    >
                                        {/* We reconstruct bg manually because MAP has text colors mixed in which breaks bg-only usage */}
                                        <div className={`absolute inset-0 ${
                                            order.status === 'Завершено' ? 'bg-emerald-500' :
                                            order.status === 'В производстве' ? 'bg-blue-500' :
                                            order.status === 'Ожидает сырья' ? 'bg-amber-500' :
                                            order.status === 'Готово к запуску' ? 'bg-lime-500' :
                                            order.status === 'Контроль качества' ? 'bg-purple-500' :
                                            'bg-zinc-400'
                                        } opacity-80`}></div>
                                        
                                        <span className="relative z-10 drop-shadow-md">{Math.round(pos.width / CELL_WIDTH)} дн.</span>
                                    </div>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                );
            })}
            
            {activeOrders.length === 0 && (
                <div className="p-8 text-center text-brand-text-muted">Нет активных заданий с запланированными датами.</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductionSchedule;
