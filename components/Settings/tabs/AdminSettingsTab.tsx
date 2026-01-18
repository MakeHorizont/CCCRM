
import React, { useState, useRef, useEffect } from 'react';
import Card from '../../UI/Card';
import Button from '../../UI/Button';
import Input from '../../UI/Input';
import { apiService } from '../../../services/apiService';
import { ServerIcon, ArrowPathIcon, ArchiveBoxArrowDownIcon, ArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon, LinkIcon, DocumentDuplicateIcon } from '../../UI/Icons';
import { API_CONFIG } from '../../../services/api/config';
import LoadingSpinner from '../../UI/LoadingSpinner';
import Tooltip from '../../UI/Tooltip';

const AdminSettingsTab: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [deployLink, setDeployLink] = useState(localStorage.getItem('ccrm_deploy_link') || '');
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

    const saveDeployLink = () => {
        localStorage.setItem('ccrm_deploy_link', deployLink);
        setMessage({ type: 'success', text: 'Ссылка на актуальную версию сохранена локально.' });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Ссылка скопирована. Теперь вы можете вставить её в настройки вашего репозитория на GitHub.");
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
                    <div className="p-3 bg-brand-surface rounded-md border border-brand-border font-medium">
                        <p className="text-brand-text-muted text-[10px] uppercase font-bold mb-1">Режим API</p>
                        <p className="font-mono text-brand-text-primary">{API_CONFIG.USE_REAL_API ? 'REAL BACKEND' : 'MOCK (IN-MEMORY)'}</p>
                    </div>
                    <div className="p-3 bg-brand-surface rounded-md border border-brand-border font-medium">
                        <p className="text-brand-text-muted text-[10px] uppercase font-bold mb-1">Версия</p>
                        <p className="font-mono text-brand-text-primary">v1.9.8 (Integrator)</p>
                    </div>
                    <div className="p-3 bg-brand-surface rounded-md border border-brand-border font-medium">
                        <p className="text-brand-text-muted text-[10px] uppercase font-bold mb-1">База данных</p>
                        <p className="font-mono text-brand-text-primary">{API_CONFIG.USE_REAL_API ? 'PostgreSQL' : 'Local JS Heap'}</p>
                    </div>
                </div>
            </Card>

            {/* Deployment Helper */}
            <Card className="border-sky-200 dark:border-sky-900/50">
                <h3 className="text-lg font-semibold text-brand-text-primary mb-2 flex items-center">
                    <LinkIcon className="h-5 w-5 mr-2 text-sky-500" />
                    Актуальная ссылка (GitHub Integration)
                </h3>
                <p className="text-sm text-brand-text-secondary mb-4">
                    AI Studio генерирует временные ссылки. Сохраните текущую ссылку здесь, чтобы быстро скопировать её для обновления вашего README или настроек репозитория на GitHub.
                </p>
                <div className="flex gap-2">
                    <div className="flex-grow">
                        <Input 
                            id="deploy-link" 
                            placeholder="Вставьте ссылку из адресной строки..." 
                            value={deployLink}
                            onChange={e => setDeployLink(e.target.value)}
                            icon={<LinkIcon className="h-4 w-4 text-brand-text-muted"/>}
                        />
                    </div>
                    <Button onClick={saveDeployLink} variant="secondary">Запомнить</Button>
                    <Tooltip text="Копировать для GitHub">
                        <Button onClick={() => copyToClipboard(deployLink)} variant="primary" disabled={!deployLink}>
                            <DocumentDuplicateIcon className="h-5 w-5"/>
                        </Button>
                    </Tooltip>
                </div>
            </Card>

            {/* Backup & Restore */}
            <Card>
                <h3 className="text-lg font-semibold text-brand-text-primary mb-2 flex items-center">
                    <ArchiveBoxArrowDownIcon className="h-5 w-5 mr-2 text-emerald-500" />
                    Резервное Копирование
                </h3>
                <p className="text-sm text-brand-text-secondary mb-6">
                    Создайте полный слепок состояния системы (JSON). Используйте его для переноса данных или восстановления после сбоев в режиме прототипирования.
                </p>
                
                {message && (
                    <div className={`mb-4 p-3 rounded-md flex items-center shadow-sm animate-fade-in ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 mr-2"/> : <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                        onClick={handleExport} 
                        isLoading={isLoading} 
                        variant="primary" 
                        leftIcon={<ArrowUpIcon className="h-5 w-5 rotate-180"/>} 
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
            <Card className="border-red-200 dark:border-red-900/50 bg-red-50/10">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Опасная Зона
                </h3>
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-brand-text-secondary">
                        Сброс всех данных к исходным значениям. Это действие необратимо для текущей сессии.
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
