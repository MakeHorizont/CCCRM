
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { SystemEvent, SystemEventType } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MagnifyingGlassIcon, FunnelIcon, EyeIcon } from '../UI/Icons';
import Input from '../UI/Input';

const AuditLogPage: React.FC = () => {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [typeFilter, setTypeFilter] = useState<SystemEventType | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');

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
        e.details.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getEventTypeColor = (type: SystemEventType) => {
        switch (type) {
            case 'auth': return 'bg-zinc-100 text-zinc-800';
            case 'user_update': return 'bg-purple-100 text-purple-800';
            case 'finance': return 'bg-emerald-100 text-emerald-800';
            case 'production': return 'bg-orange-100 text-orange-800';
            case 'security': return 'bg-red-100 text-red-800';
            case 'admin': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getEventTypeLabel = (type: SystemEventType) => {
         switch (type) {
            case 'auth': return 'Вход/Система';
            case 'user_update': return 'Кадры';
            case 'finance': return 'Финансы';
            case 'production': return 'Производство';
            case 'security': return 'Безопасность';
            case 'admin': return 'Администрирование';
            default: return type;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <EyeIcon className="h-8 w-8 mr-3 text-brand-primary"/>
                    Журнал Событий
                </h1>
                <p className="text-sm text-brand-text-secondary max-w-xl mt-2 sm:mt-0">
                    Принцип "Стеклянного Завода": все критические действия в системе фиксируются. История изменений доступна каждому члену коллектива для обеспечения прозрачности и доверия.
                </p>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input 
                        id="audit-search" 
                        type="text" 
                        placeholder="Поиск по действию, пользователю, деталям..." 
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

                {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner/></div> : error ? <p className="text-red-500">{error}</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                                <tr>
                                    <th className="px-4 py-3">Время</th>
                                    <th className="px-4 py-3">Тип</th>
                                    <th className="px-4 py-3">Действие</th>
                                    <th className="px-4 py-3">Пользователь</th>
                                    <th className="px-4 py-3">Детали</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-brand-secondary">
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                                            {new Date(event.timestamp).toLocaleString('ru-RU')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${getEventTypeColor(event.type)}`}>
                                                {getEventTypeLabel(event.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-brand-text-primary">{event.action}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{event.userName}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-brand-text-primary break-all">
                                            {event.details}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-brand-text-muted">Записи не найдены.</td>
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
