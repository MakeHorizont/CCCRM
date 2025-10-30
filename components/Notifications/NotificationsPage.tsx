import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { Notification } from '../../types';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { BellIcon, CheckIcon, ViewColumnsIcon, ChatBubbleOvalLeftEllipsisIcon, BanknotesIcon, ArchiveBoxIcon, ExclamationTriangleIcon } from '../UI/Icons';
import { formatDistanceStrict } from 'date-fns';
import ru from 'date-fns/locale/ru';

type NotificationFilter = 'all' | 'unread';

const NotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.getNotifications(user.id);
            setAllNotifications(data);
        } catch (err) {
            setError('Не удалось загрузить уведомления.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleNotificationClick = async (notification: Notification) => {
        navigate(notification.link);
        if (notification.status === 'unread') {
            try {
                await apiService.markNotificationAsRead(notification.id);
                setAllNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'read' } : n));
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await apiService.markAllNotificationsAsRead(user.id);
            await fetchNotifications(); // Refetch to get the updated state
        } catch (err) {
            setError("Не удалось отметить все как прочитанные.");
        } finally {
            setIsLoading(false);
        }
    };

    const getIconForType = (notification: Notification) => {
        const iconClasses = "h-6 w-6 flex-shrink-0";
        if (notification.type === 'critical') return <ExclamationTriangleIcon className={`${iconClasses} text-red-500`} />;
        if (notification.type === 'warning') return <ExclamationTriangleIcon className={`${iconClasses} text-orange-400`} />;
        
        // Info types based on source
        switch (notification.sourceEntity.type) {
            case 'task': return <ViewColumnsIcon className={`${iconClasses} text-indigo-400`} />;
            case 'discussion': return <ChatBubbleOvalLeftEllipsisIcon className={`${iconClasses} text-sky-400`} />;
            case 'order': return <BanknotesIcon className={`${iconClasses} text-emerald-400`} />;
            case 'stock': return <ArchiveBoxIcon className={`${iconClasses} text-brand-text-muted`} />;
            default: return <BellIcon className={`${iconClasses} text-brand-text-muted`} />;
        }
    };

    const filteredNotifications = allNotifications.filter(n => {
        if (filter === 'unread') return n.status === 'unread';
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center mb-4 sm:mb-0">
                    <BellIcon className="h-8 w-8 mr-3 text-brand-primary" />
                    Уведомления
                </h1>
                <Button onClick={handleMarkAllAsRead} disabled={isLoading || allNotifications.every(n => n.status === 'read')}>
                    <CheckIcon className="h-5 w-5 mr-2"/>
                    Отметить все как прочитанные
                </Button>
            </div>
            
            <Card>
                <div className="border-b border-brand-border mb-4 pb-2 flex space-x-2">
                    <Button
                        variant={filter === 'all' ? 'secondary' : 'ghost'}
                        onClick={() => setFilter('all')}
                    >
                        Все
                    </Button>
                    <Button
                        variant={filter === 'unread' ? 'secondary' : 'ghost'}
                        onClick={() => setFilter('unread')}
                    >
                        Непрочитанные ({allNotifications.filter(n => n.status === 'unread').length})
                    </Button>
                </div>
                
                {isLoading ? (
                    <div className="flex justify-center p-8"><LoadingSpinner /></div>
                ) : error ? (
                    <p className="text-red-500 text-center p-4">{error}</p>
                ) : filteredNotifications.length > 0 ? (
                    <ul className="divide-y divide-brand-border">
                        {filteredNotifications.map(notification => (
                            <li key={notification.id}>
                                <button
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left p-4 flex space-x-4 items-start hover:bg-brand-secondary transition-colors ${notification.status === 'unread' ? 'bg-sky-900/10' : ''}`}
                                >
                                    <div className="mt-1">{getIconForType(notification)}</div>
                                    <div className="flex-grow">
                                        <p className="text-base text-brand-text-primary">{notification.message}</p>
                                        <p className="text-sm text-brand-text-muted mt-1">
                                            {formatDistanceStrict(new Date(notification.createdAt), new Date(), { addSuffix: true, locale: ru } as any)}
                                        </p>
                                    </div>
                                    {notification.status === 'unread' && (
                                        <div className="flex-shrink-0 mt-1">
                                            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 block" title="Непрочитано"></span>
                                        </div>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center p-8 text-brand-text-muted">
                        <BellIcon className="h-12 w-12 mx-auto mb-2" />
                        <p>Нет {filter === 'unread' ? 'непрочитанных' : ''} уведомлений.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default NotificationsPage;