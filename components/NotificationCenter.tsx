import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/apiService';
import { Notification } from '../types';
import { BellIcon, CheckIcon, ViewColumnsIcon, ChatBubbleOvalLeftEllipsisIcon, BanknotesIcon, ArchiveBoxIcon, ExclamationTriangleIcon } from './UI/Icons';
import Button from './UI/Button';
import Tooltip from './UI/Tooltip';
import { formatDistanceStrict } from 'date-fns';
import ru from 'date-fns/locale/ru';
import { ROUTE_PATHS } from '../constants';

const NotificationCenter: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await apiService.getNotifications(user.id);
            setNotifications(data);
            setUnreadCount(data.filter(n => n.status === 'unread').length);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNotificationClick = async (notification: Notification) => {
        setIsPanelOpen(false);
        navigate(notification.link);
        if (notification.status === 'unread') {
            try {
                const updatedNotification = await apiService.markNotificationAsRead(notification.id);
                setNotifications(prev => prev.map(n => n.id === notification.id ? updatedNotification : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        try {
            await apiService.markAllNotificationsAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const getIconForType = (notification: Notification) => {
        const iconClasses = "h-5 w-5 flex-shrink-0";
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

    return (
        <div className="relative" ref={panelRef}>
            <Tooltip text="Уведомления" position="bottom">
                <button
                    onClick={() => setIsPanelOpen(prev => !prev)}
                    className="relative p-2 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-card transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    aria-label={`Уведомления (${unreadCount} непрочитанных)`}
                >
                    <BellIcon className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </button>
            </Tooltip>

            {isPanelOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-brand-card rounded-lg shadow-2xl border border-brand-border z-50 flex flex-col max-h-[70vh]">
                    <div className="flex justify-between items-center p-3 border-b border-brand-border">
                        <h4 className="font-semibold text-brand-text-primary">Уведомления</h4>
                        {unreadCount > 0 && (
                            <Button size="sm" variant="ghost" onClick={handleMarkAllAsRead} className="text-xs">
                                <CheckIcon className="h-4 w-4 mr-1"/>
                                Прочитать все
                            </Button>
                        )}
                    </div>
                    {notifications.length === 0 ? (
                        <p className="text-sm text-brand-text-muted text-center p-6">Нет новых уведомлений.</p>
                    ) : (
                        <ul className="overflow-y-auto custom-scrollbar-thin">
                            {notifications.map(notification => (
                                <li key={notification.id}
                                    className={`border-b border-brand-border last:border-b-0 hover:bg-brand-secondary transition-colors ${notification.status === 'unread' ? 'bg-sky-900/20' : ''}`}
                                >
                                    <button onClick={() => handleNotificationClick(notification)} className="w-full text-left p-3 flex space-x-3 items-start">
                                        <div className="mt-1">{getIconForType(notification)}</div>
                                        <div className="flex-grow">
                                            <p className="text-sm text-brand-text-primary">{notification.message}</p>
                                            <p className="text-xs text-brand-text-muted mt-0.5">
                                                {formatDistanceStrict(new Date(notification.createdAt), new Date(), { addSuffix: true, locale: ru } as any)}
                                            </p>
                                        </div>
                                        {notification.status === 'unread' && (
                                            <div className="flex-shrink-0 mt-1">
                                                <span className="h-2 w-2 rounded-full bg-sky-400 block" title="Непрочитано"></span>
                                            </div>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="p-2 border-t border-brand-border text-center">
                        <Link to={ROUTE_PATHS.NOTIFICATIONS} onClick={() => setIsPanelOpen(false)} className="text-sm text-sky-400 hover:text-sky-300 hover:underline">
                            Посмотреть все уведомления
                        </Link>
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
        </div>
    );
};

export default NotificationCenter;