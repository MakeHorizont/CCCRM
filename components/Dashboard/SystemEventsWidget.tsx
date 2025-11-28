
import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import { EyeIcon, UserCircleIcon, BanknotesIcon, CogIcon, ShieldCheckIcon, ServerIcon } from '../UI/Icons';
import { apiService } from '../../services/apiService';
import { SystemEvent, SystemEventType } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const SystemEventsWidget: React.FC = () => {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await apiService.getSystemEvents();
                // Take top 5 most recent
                setEvents(data.slice(-5).reverse());
            } catch (e) {
                console.error("Failed to fetch system events", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
        // Optional: Poll for updates every minute
        const interval = setInterval(fetchEvents, 60000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: SystemEventType) => {
        const iconClasses = "h-4 w-4";
        switch (type) {
            case 'auth': return <ServerIcon className={`${iconClasses} text-zinc-400`} />;
            case 'user_update': return <UserCircleIcon className={`${iconClasses} text-purple-400`} />;
            case 'finance': return <BanknotesIcon className={`${iconClasses} text-emerald-400`} />;
            case 'production': return <CogIcon className={`${iconClasses} text-orange-400`} />;
            case 'security': return <ShieldCheckIcon className={`${iconClasses} text-red-400`} />;
            case 'admin': return <EyeIcon className={`${iconClasses} text-blue-400`} />;
            default: return <EyeIcon className={`${iconClasses} text-gray-400`} />;
        }
    };

    if (isLoading) return <Card className="h-full flex items-center justify-center"><LoadingSpinner/></Card>;

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-brand-text-primary flex items-center">
                    <EyeIcon className="h-6 w-6 mr-2 text-brand-primary"/>
                    Пульс Системы
                </h2>
            </div>
            
            <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar-thin pr-1">
                {events.length === 0 ? (
                    <p className="text-center text-brand-text-muted my-auto">Событий пока нет.</p>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="flex gap-3 text-sm">
                            <div className="mt-1 flex-shrink-0">
                                {getIcon(event.type)}
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <span className="font-medium text-brand-text-primary truncate mr-2">{event.action}</span>
                                    <span className="text-[10px] text-brand-text-muted whitespace-nowrap">
                                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ru })}
                                    </span>
                                </div>
                                <p className="text-xs text-brand-text-secondary truncate">{event.userName}</p>
                                <p className="text-xs text-brand-text-muted truncate opacity-80" title={event.details}>{event.details}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

export default SystemEventsWidget;
