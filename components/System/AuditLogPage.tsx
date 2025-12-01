
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { SystemEvent, SystemEventType } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MagnifyingGlassIcon, FunnelIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon, ServerIcon, UserCircleIcon, BanknotesIcon, CogIcon, ShieldCheckIcon } from '../UI/Icons';
import Input from '../UI/Input';
import Button from '../UI/Button';

const AuditLogPage: React.FC = () => {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [typeFilter, setTypeFilter] = useState<SystemEventType | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getSystemEvents({
                type: typeFilter === 'all' ? undefined : typeFilter
            });
            setEvents(data);
        } catch (err) {
            setError('Не удалось загрузить журнал событий.');
        } finally {
            setIsLoading(false);
        }
    }, [typeFilter]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const filteredEvents = events.filter(e => 
        e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.entityId && e.entityId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getEventTypeColor = (type: SystemEventType) => {
        switch (type) {
            case 'auth': return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
            case 'user_update': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            case 'finance': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'production': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            case 'security': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getEventIcon = (type: SystemEventType) => {
         switch (type) {
            case 'auth': return <ServerIcon className="h-4 w-4"/>;
            case 'user_update': return <UserCircleIcon className="h-4 w-4"/>;
            case 'finance': return <BanknotesIcon className="h-4 w-4"/>;
            case 'production': return <CogIcon className="h-4 w-4"/>;
            case 'security': return <ShieldCheckIcon className="h-4 w-4"/>;
            case 'admin': return <EyeIcon className="h-4 w-4"/>;
            default: return <EyeIcon className="h-4 w-4"/>;
        }
    };

    const getEventTypeLabel = (type: SystemEventType) => {
         switch (type) {
            case 'auth': return 'Система';
            case 'user_update': return 'Кадры';
            case 'finance': return 'Финансы';
            case 'production': return 'Производство';
            case 'security': return 'Безопасность';
            case 'admin': return 'Админ';
            default: return type;
        }
    };
    
    const toggleExpand = (id: string) => {
        setExpandedEventId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <EyeIcon className="h-8 w-8 mr-3 text-brand-primary"/>
                    Журнал Событий
                </h1>
                <p className="text-sm text-brand-text-secondary max-w-xl mt-2 sm:mt-0 text-right">
                    Принцип "Стеклянного Завода": все критические действия фиксируются. <br/>
                    <span className="text-xs opacity-70">Immutable Ledger v1.0</span>
                </p>
            </div>

            <Card className="!p-0 overflow-hidden">
                <div className="p-4 border-b border-brand-border bg-brand-surface/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            id="audit-search" 
                            type="text" 
                            placeholder="Поиск по действию, пользователю, ID..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                        />
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2"><FunnelIcon className="h-5 w-5 text-brand-text-muted" /></span>
                            <select 
                                value={typeFilter} 
                                onChange={e => setTypeFilter(e.target.value as any)}
                                className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary"
                            >
                                <option value="all">Все типы событий</option>
                                <option value="user_update">Кадры (Зарплаты, Роли)</option>
                                <option value="finance">Финансы</option>
                                <option value="production">Производство</option>
                                <option value="admin">Администрирование</option>
                                <option value="security">Безопасность</option>
                                <option value="auth">Системные</option>
                            </select>
                        </div>
                    </div>
                </div>

                {isLoading ? <div className="flex justify-center p-12"><LoadingSpinner/></div> : error ? <p className="text-red-500 p-4 text-center">{error}</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface/80 border-b border-brand-border">
                                <tr>
                                    <th className="px-4 py-3 w-10"></th>
                                    <th className="px-4 py-3">Время</th>
                                    <th className="px-4 py-3">Тип</th>
                                    <th className="px-4 py-3">Действие</th>
                                    <th className="px-4 py-3">Пользователь</th>
                                    <th className="px-4 py-3">Детали</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                    <React.Fragment key={event.id}>
                                        <tr 
                                            className={`hover:bg-brand-secondary transition-colors cursor-pointer ${expandedEventId === event.id ? 'bg-brand-secondary/50' : ''}`}
                                            onClick={() => toggleExpand(event.id)}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                {expandedEventId === event.id ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-brand-text-muted">
                                                {new Date(event.timestamp).toLocaleString('ru-RU')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-[10px] font-bold rounded-full flex items-center w-fit gap-1 ${getEventTypeColor(event.type)}`}>
                                                    {getEventIcon(event.type)}
                                                    {getEventTypeLabel(event.type)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-brand-text-primary">{event.action}</td>
                                            <td className="px-4 py-3 whitespace-nowrap flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px]">
                                                    {event.userName.charAt(0)}
                                                </div>
                                                {event.userName}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-brand-text-secondary truncate max-w-xs">
                                                {event.details}
                                            </td>
                                        </tr>
                                        {expandedEventId === event.id && (
                                            <tr className="bg-brand-surface/30">
                                                <td colSpan={6} className="px-4 py-4 border-b border-brand-border">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <h4 className="font-bold text-brand-text-primary mb-1">Подробности</h4>
                                                            <p className="whitespace-pre-wrap text-brand-text-secondary">{event.details}</p>
                                                            
                                                            <div className="mt-4 space-y-1 text-xs text-brand-text-muted font-mono">
                                                                <p>Event ID: {event.id}</p>
                                                                <p>User ID: {event.userId}</p>
                                                                <p>Target Entity: {event.entityType} #{event.entityId}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-brand-card border border-brand-border rounded p-2 overflow-x-auto">
                                                            <h4 className="font-bold text-xs text-brand-text-muted mb-1 uppercase">Raw Data</h4>
                                                            <pre className="text-xs font-mono text-brand-text-secondary">
                                                                {JSON.stringify(event, (key, value) => {
                                                                    if (key === 'details') return undefined; // Don't duplicate details
                                                                    return value;
                                                                }, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-brand-text-muted flex flex-col items-center">
                                            <MagnifyingGlassIcon className="h-12 w-12 mb-2 opacity-20"/>
                                            <span>Записи не найдены.</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AuditLogPage;
