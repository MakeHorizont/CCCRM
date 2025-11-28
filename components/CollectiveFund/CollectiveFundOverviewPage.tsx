
import React, { useState, useEffect, useCallback } from 'react';
import { CollectiveFund, FundTransaction } from '../../types';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { PencilIcon, CheckIcon, XMarkIcon, PlusCircleIcon, TrashIcon, ScaleIcon } from '../UI/Icons';
import { useAuth } from '../../hooks/useAuth';
import Button from '../UI/Button';
import Input from '../UI/Input';
import FundTransactionModal from './FundTransactionModal';
import ConfirmationModal from '../UI/ConfirmationModal';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';

const CollectiveFundOverviewPage: React.FC = () => {
    const { user } = useAuth();
    const [fundData, setFundData] = useState<CollectiveFund | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<CollectiveFund>>({});

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [txToDelete, setTxToDelete] = useState<FundTransaction | null>(null);

    const canEdit = user?.role === 'ceo';

    const fetchFundData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.getCollectiveFund();
            setFundData(data);
            setEditedData({ balance: data.balance, contributionPercentage: data.contributionPercentage });
        } catch (err) {
            setError('Не удалось загрузить данные Коллективного Фонда.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFundData();
    }, [fetchFundData]);

    const handleInitiateChange = async () => {
        if (!canEdit) return;
        
        setIsSaving(true);
        setError(null);
        setSuccessMsg(null);
        
        try {
            // Check if percent changed
            if (fundData && editedData.contributionPercentage !== fundData.contributionPercentage) {
                await apiService.createProposal(
                    'change_fund_settings',
                    `Изменение % отчислений в фонд`,
                    `Предлагается изменить процент отчислений от чистой прибыли с ${fundData.contributionPercentage}% на ${editedData.contributionPercentage}%.`,
                    { contributionPercentage: editedData.contributionPercentage }
                );
                setSuccessMsg("Предложение создано и отправлено в Совет. Изменения вступят в силу после голосования.");
            } else if (fundData && editedData.balance !== fundData.balance) {
                 // Direct balance correction (admin only, technically requires audit log which is handled in api)
                 await apiService.updateCollectiveFund({ balance: editedData.balance });
                 const updated = await apiService.getCollectiveFund();
                 setFundData(updated);
                 setSuccessMsg("Баланс скорректирован.");
            }

            setIsEditing(false);
        } catch (err) {
            setError('Ошибка инициации изменений: ' + (err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (fundData) {
            setEditedData({ balance: fundData.balance, contributionPercentage: fundData.contributionPercentage });
        }
    };
    
    const handleSaveTransaction = async (txData: Omit<FundTransaction, 'id'>) => {
        try {
            await apiService.addFundTransaction(txData);
            await fetchFundData(); // Refresh data
            setIsTxModalOpen(false);
        } catch (err) {
            setError((err as Error).message);
            throw err;
        }
    };
    
    const handleDeleteTransaction = async () => {
        if (!txToDelete) return;
        setIsSaving(true);
        try {
            await apiService.deleteFundTransaction(txToDelete.id);
            await fetchFundData();
            setTxToDelete(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
    }

    if (error) {
        return <p className="text-red-500 text-center p-4">{error}</p>;
    }

    if (!fundData) {
        return <p className="text-brand-text-muted text-center p-4">Нет данных о фонде.</p>;
    }

    return (
        <div className="space-y-6">
             {successMsg && (
                <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded relative flex items-center animate-fade-in" role="alert">
                    <ScaleIcon className="h-5 w-5 mr-2"/>
                    <span className="flex-grow">{successMsg}</span>
                     <Link to={ROUTE_PATHS.COUNCIL} className="underline font-bold ml-2 hover:text-emerald-900">Перейти в Совет</Link>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-brand-text-secondary">Текущий баланс</p>
                            {isEditing ? (
                                <Input id="fund-balance" name="balance" type="number" value={String(editedData.balance || '')} onChange={e => setEditedData(p => ({...p, balance: parseFloat(e.target.value) || 0}))} className="text-4xl font-bold !p-0 !bg-transparent border-0 focus:ring-0" />
                            ) : (
                                <p className="text-4xl font-bold text-emerald-400">
                                    {fundData.balance.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
                <Card>
                     <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-brand-text-secondary">Ставка отчислений</p>
                             {isEditing ? (
                                <div className="flex items-center">
                                    <Input id="fund-percentage" name="contributionPercentage" type="number" value={String(editedData.contributionPercentage || '')} onChange={e => setEditedData(p => ({...p, contributionPercentage: parseFloat(e.target.value) || 0}))} className="text-4xl font-bold !p-0 !bg-transparent border-0 focus:ring-0 w-32" />
                                    <span className="text-4xl font-bold text-sky-400">%</span>
                                </div>
                            ) : (
                                <p className="text-4xl font-bold text-sky-400">
                                    {fundData.contributionPercentage}%
                                </p>
                            )}
                            <p className="text-xs text-brand-text-muted">от чистой прибыли предприятия</p>
                        </div>
                          {canEdit && (
                            isEditing ? (
                                <div className="flex space-x-1">
                                    <Button size="sm" variant="secondary" onClick={handleCancelEdit} disabled={isSaving}><XMarkIcon className="h-5 w-5"/></Button>
                                    <Tooltip text="Инициировать голосование Совета">
                                        <Button size="sm" variant="primary" onClick={handleInitiateChange} isLoading={isSaving} leftIcon={<ScaleIcon className="h-4 w-4"/>}>
                                            Голосовать
                                        </Button>
                                    </Tooltip>
                                </div>
                            ) : (
                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}><PencilIcon className="h-5 w-5"/></Button>
                            )
                        )}
                    </div>
                </Card>
            </div>

            <Card>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-brand-text-primary">История Транзакций</h2>
                    {canEdit && <Button onClick={() => setIsTxModalOpen(true)} size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить транзакцию</Button>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                            <tr>
                                <th className="px-4 py-3">Дата</th>
                                <th className="px-4 py-3">Тип</th>
                                <th className="px-4 py-3">Описание</th>
                                <th className="px-4 py-3 text-right">Сумма</th>
                                {canEdit && <th className="px-4 py-3 text-center">Действия</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {fundData.history.length > 0 ? (
                                fundData.history.map(tx => (
                                    <tr key={tx.id} className="hover:bg-brand-secondary">
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(tx.date).toLocaleDateString('ru-RU')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${tx.type === 'contribution' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'}`}>
                                                {tx.type === 'contribution' ? 'Поступление' : 'Расход'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-brand-text-primary">{tx.description}</td>
                                        <td className={`px-4 py-3 text-right font-semibold ${tx.type === 'contribution' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {tx.type === 'contribution' ? '+' : '-'} {tx.amount.toLocaleString('ru-RU')} ₽
                                        </td>
                                        {canEdit && (
                                            <td className="px-4 py-3 text-center">
                                                <Button size="sm" variant="danger" className="p-1" onClick={() => setTxToDelete(tx)}>
                                                    <TrashIcon className="h-4 w-4"/>
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={canEdit ? 5 : 4} className="text-center p-8 text-brand-text-muted">
                                        История транзакций пуста.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isTxModalOpen && (
                <FundTransactionModal
                    isOpen={isTxModalOpen}
                    onClose={() => setIsTxModalOpen(false)}
                    onSave={handleSaveTransaction}
                />
            )}
            
            {txToDelete && (
                 <ConfirmationModal
                    isOpen={!!txToDelete}
                    onClose={() => setTxToDelete(null)}
                    onConfirm={handleDeleteTransaction}
                    title="Удалить транзакцию?"
                    message={<p>Вы уверены, что хотите удалить транзакцию <strong className="text-brand-text-primary">"{txToDelete.description}"</strong>? Баланс фонда будет пересчитан.</p>}
                    confirmText="Удалить"
                    isLoading={isSaving}
                />
            )}
        </div>
    );
};

export default CollectiveFundOverviewPage;
