
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { QualityCheck, QualityCheckStatus } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { ShieldCheckIcon, MagnifyingGlassIcon, FunnelIcon, CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ClockIcon } from '../UI/Icons';
import Input from '../UI/Input';
import QualityCheckModal from './QualityCheckModal';
import { useNavigate } from 'react-router-dom';

const QualityControlPage: React.FC = () => {
    const [checks, setChecks] = useState<QualityCheck[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal
    const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchChecks = useCallback(async () => {
        setIsLoading(true);
        try {
            // In a real app, filters would be passed to API
            const data = await apiService.getQualityChecks({}); 
            setChecks(data);
        } catch (err) {
            setError('Не удалось загрузить список проверок.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChecks();
    }, [fetchChecks]);

    const filteredChecks = checks.filter(c => {
        const matchesTab = activeTab === 'pending' ? c.status === 'pending' : c.status !== 'pending';
        const matchesSearch = c.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (c.relatedEntityName && c.relatedEntityName.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTab && matchesSearch;
    });
    
    const handleOpenCheck = (check: QualityCheck) => {
        setSelectedCheck(check);
        setIsModalOpen(true);
    };
    
    const handleResolveCheck = async (id: string, result: any) => {
        setIsSaving(true);
        try {
            await apiService.updateQualityCheckResult(id, result);
            setIsModalOpen(false);
            await fetchChecks();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const getStatusIcon = (status: QualityCheckStatus) => {
        switch(status) {
            case 'passed': return <CheckCircleIcon className="h-5 w-5 text-emerald-500"/>;
            case 'failed': return <XCircleIcon className="h-5 w-5 text-red-500"/>;
            case 'conditional': return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500"/>;
            default: return <ClockIcon className="h-5 w-5 text-zinc-400"/>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <ShieldCheckIcon className="h-8 w-8 mr-3 text-brand-primary"/>
                    Контроль Качества (ОТК)
                </h1>
            </div>
            
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-4">
                    <button onClick={() => setActiveTab('pending')} className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'}`}>
                        Ожидают проверки ({checks.filter(c => c.status === 'pending').length})
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'}`}>
                        История проверок
                    </button>
                </nav>
            </div>

            <Card>
                <div className="mb-4">
                    <Input 
                        id="qc-search" 
                        type="text" 
                        placeholder="Поиск по номеру или объекту..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                    />
                </div>

                {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner/></div> : error ? <p className="text-red-500 text-center">{error}</p> : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredChecks.length > 0 ? filteredChecks.map(check => (
                            <div key={check.id} onClick={() => handleOpenCheck(check)} className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${check.status === 'pending' ? 'bg-brand-surface border-l-4 border-l-sky-500' : 'bg-brand-card border-l-4 ' + (check.status === 'passed' ? 'border-l-emerald-500' : check.status === 'failed' ? 'border-l-red-500' : 'border-l-amber-500')}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-lg font-medium text-brand-text-primary">{check.relatedEntityName}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded bg-brand-secondary text-brand-text-secondary font-mono">{check.checkNumber}</span>
                                        </div>
                                        <p className="text-sm text-brand-text-muted mt-1">{check.relatedEntityType} | {new Date(check.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center space-x-2 mb-1">
                                            {getStatusIcon(check.status)}
                                            <span className={`text-sm font-bold ${check.status === 'passed' ? 'text-emerald-600' : check.status === 'failed' ? 'text-red-600' : check.status === 'pending' ? 'text-sky-600' : 'text-amber-600'}`}>
                                                {check.status.toUpperCase()}
                                            </span>
                                        </div>
                                        {check.inspectorName && <p className="text-xs text-brand-text-secondary">Инспектор: {check.inspectorName}</p>}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-brand-text-muted py-8">Проверок не найдено.</p>
                        )}
                    </div>
                )}
            </Card>
            
            {selectedCheck && (
                <QualityCheckModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    check={selectedCheck} 
                    onResolve={handleResolveCheck}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
};

export default QualityControlPage;