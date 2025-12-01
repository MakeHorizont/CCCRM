
import React, { useState, useRef } from 'react';
import Card from '../../UI/Card';
import Button from '../../UI/Button';
import { apiService } from '../../../services/apiService';
import { ServerIcon, ArrowPathIcon, ArchiveBoxArrowDownIcon, ArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon } from '../../UI/Icons';
import { API_CONFIG } from '../../../services/api/config';
import LoadingSpinner from '../../UI/LoadingSpinner';

const AdminSettingsTab: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const blob = await apiService.exportSystemState();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cccrm_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setMessage({ type: 'success', text: 'Бэкап успешно создан и скачан.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Ошибка создания бэкапа.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm("ВНИМАНИЕ: Это действие перезапишет ВСЕ текущие данные системы данными из файла. Вы уверены?")) {
            e.target.value = ''; // Reset input
            return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            const result = await apiService.importSystemState(file);
            setMessage({ type: 'success', text: result.message });
            // Optional: Reload page to ensure all components refresh with new data
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: (err as Error).message });
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleHardReset = () => {
         if (window.confirm("ВНИМАНИЕ: Вы собираетесь сбросить систему к начальному состоянию. Все данные текущей сессии будут потеряны. Продолжить?")) {
             apiService.hardReset();
         }
    };

    return (
        <div className="space-y-6">
            {/* System Status */}
            <Card>
                <h3 className="text-lg font-semibold text-brand-text-primary mb-4 flex items-center">
                    <ServerIcon className="h-5 w-5 mr-2 text-brand-primary" />
                    Статус Системы
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
                        <p className="text-brand-text-muted">Режим API</p>
                        <p className="font-mono font-bold text-brand-text-primary">{API_CONFIG.USE_REAL_API ? 'REAL BACKEND' : 'MOCK (IN-MEMORY)'}</p>
                    </div>
                    <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
                        <p className="text-brand-text-muted">Версия</p>
                        <p className="font-mono font-bold text-brand-text-primary">v1.9.4 (Archivist)</p>
                    </div>
                    <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
                        <p className="text-brand-text-muted">База данных</p>
                        <p className="font-mono font-bold text-brand-text-primary">{API_CONFIG.USE_REAL_API ? 'PostgreSQL' : 'Local JS Heap'}</p>
                    </div>
                </div>
            </Card>

            {/* Backup & Restore */}
            <Card>
                <h3 className="text-lg font-semibold text-brand-text-primary mb-2 flex items-center">
                    <ArchiveBoxArrowDownIcon className="h-5 w-5 mr-2 text-sky-500" />
                    Резервное Копирование
                </h3>
                <p className="text-sm text-brand-text-secondary mb-6">
                    Создайте полный слепок состояния системы (JSON). Используйте его для переноса данных или восстановления после сбоев в режиме прототипирования.
                </p>
                
                {message && (
                    <div className={`mb-4 p-3 rounded-md flex items-center ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 mr-2"/> : <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>}
                        {message.text}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                        onClick={handleExport} 
                        isLoading={isLoading} 
                        variant="primary" 
                        leftIcon={<ArrowUpIcon className="h-5 w-5 rotate-180"/>} // Arrow Down
                    >
                        Скачать Бэкап
                    </Button>
                    
                    <div className="relative">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".json" 
                            className="hidden" 
                        />
                        <Button 
                            onClick={handleImportClick} 
                            isLoading={isLoading} 
                            variant="secondary" 
                            leftIcon={<ArrowUpIcon className="h-5 w-5"/>}
                        >
                            Восстановить из файла
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900/50">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Опасная Зона
                </h3>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-brand-text-secondary">
                        Сброс всех данных к исходным значениям (по умолчанию). Все созданные записи будут потеряны.
                    </p>
                    <Button onClick={handleHardReset} variant="danger" size="sm">
                        Сброс Системы
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default AdminSettingsTab;
