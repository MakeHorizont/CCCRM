
import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { CalendarEvent, CalendarEventType } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, CogIcon, ShoppingCartIcon, WrenchIcon, ViewColumnsIcon, ArrowPathIcon } from '../UI/Icons';
import { useNavigate } from 'react-router-dom';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string, color: string, icon: React.FC<any> }> = {
    production: { label: 'Производство', color: 'bg-orange-500 text-white', icon: CogIcon },
    sales: { label: 'Продажи', color: 'bg-emerald-500 text-white', icon: ShoppingCartIcon },
    maintenance: { label: 'Ремонты', color: 'bg-red-500 text-white', icon: WrenchIcon },
    task: { label: 'Задачи', color: 'bg-sky-500 text-white', icon: ViewColumnsIcon },
    rotation: { label: 'Ротация', color: 'bg-purple-500 text-white', icon: ArrowPathIcon },
    meeting: { label: 'Собрания', color: 'bg-zinc-500 text-white', icon: CalendarDaysIcon },
};

const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState<Set<CalendarEventType>>(new Set(['production', 'sales', 'maintenance', 'rotation']));

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                // FIX: Explicitly cast Set to string[] for API compatibility
                const types = Array.from(activeFilters) as string[];
                const data = await apiService.getCalendarEvents({ 
                    month: currentDate.getMonth(), 
                    year: currentDate.getFullYear(),
                    types
                });
                setEvents(data);
            } catch (e) {
                console.error("Failed to fetch calendar events", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, [currentDate, activeFilters]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };
    
    const jumpToToday = () => {
        setCurrentDate(new Date());
    };
    
    const toggleFilter = (type: CalendarEventType) => {
        setActiveFilters(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    };

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Adjust for Monday start (0=Sun -> 7)
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        
        const days = [];
        // Empty cells for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    const getEventsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return events.filter(e => e.date === dateStr);
    };
    
    const handleEventClick = (event: CalendarEvent) => {
        navigate(event.link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-8 w-8 text-brand-primary"/>
                    <h1 className="text-3xl font-semibold text-brand-text-primary">Единый Календарь</h1>
                </div>
                
                <div className="flex items-center space-x-2">
                     <Button variant="secondary" size="sm" onClick={jumpToToday}>Сегодня</Button>
                     <div className="flex items-center bg-brand-surface rounded-lg border border-brand-border p-1">
                        <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}><ChevronLeftIcon className="h-5 w-5"/></Button>
                        <span className="w-32 text-center font-bold text-lg">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                        <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}><ChevronRightIcon className="h-5 w-5"/></Button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                    <button
                        key={type}
                        onClick={() => toggleFilter(type as CalendarEventType)}
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 transition-all border ${activeFilters.has(type as CalendarEventType) ? config.color : 'bg-transparent border-zinc-300 text-zinc-500 hover:border-zinc-400'}`}
                    >
                        <config.icon className="h-3 w-3"/>
                        {config.label}
                    </button>
                ))}
            </div>

            <Card className="!p-0 overflow-hidden min-h-[600px] flex flex-col">
                {/* Scrollable Container for Mobile */}
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Header Days */}
                        <div className="grid grid-cols-7 border-b border-brand-border bg-brand-surface">
                            {WEEKDAYS.map(d => (
                                <div key={d} className="p-3 text-center font-bold text-brand-text-secondary text-sm">
                                    {d}
                                </div>
                            ))}
                        </div>
                        
                        {isLoading ? (
                            <div className="flex-grow flex items-center justify-center h-[500px]"><LoadingSpinner/></div>
                        ) : (
                            <div className="grid grid-cols-7 auto-rows-fr bg-brand-background gap-px border-l border-brand-border">
                                {calendarGrid.map((date, idx) => {
                                    if (!date) return <div key={`empty-${idx}`} className="bg-brand-card/50 min-h-[120px]"></div>;
                                    
                                    const dayEvents = getEventsForDate(date);
                                    const isToday = new Date().toDateString() === date.toDateString();

                                    return (
                                        <div key={date.toISOString()} className={`bg-brand-card p-2 min-h-[120px] hover:bg-brand-surface transition-colors flex flex-col gap-1 border-r border-b border-brand-border ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                            <div className="text-right mb-1">
                                                <span className={`text-sm font-medium ${isToday ? 'bg-brand-primary text-white px-2 py-0.5 rounded-full' : 'text-brand-text-secondary'}`}>
                                                    {date.getDate()}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] custom-scrollbar-thin">
                                                {dayEvents.map(event => (
                                                    <div 
                                                        key={event.id}
                                                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                                        className={`text-[10px] p-1 rounded cursor-pointer truncate shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1 ${EVENT_TYPE_CONFIG[event.type].color}`}
                                                        title={`${event.title} ${event.assigneeName ? `(${event.assigneeName})` : ''}`}
                                                    >
                                                        <span className="truncate">{event.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default CalendarPage;
