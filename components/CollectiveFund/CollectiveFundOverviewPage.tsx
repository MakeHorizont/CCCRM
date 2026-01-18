
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CollectiveFund, FundTransaction, MonthlyExpense, Transaction } from '../../types';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { PencilIcon, CheckIcon, XMarkIcon, PlusCircleIcon, TrashIcon, ScaleIcon, ArrowTrendingUpIcon, CalculatorIcon } from '../UI/Icons';
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
    const [monthlyExpense, setMonthlyExpense] = useState<MonthlyExpense | null>(null);
    const [allTxns, setAllTxns] = useState<Transaction[]>([]);
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
            const today = new Date();
            const [data, expense, txns] = await Promise.all([
                apiService.getCollectiveFund(),
                apiService.getMonthlyExpense(today.getFullYear(), today.getMonth()),
                apiService.getTransactions({ viewMode: 'active' })
            ]);
            setFundData(data);
            setMonthlyExpense(expense);
            setAllTxns(txns);
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

    const projectedContribution = useMemo(() => {
        if (!fundData || !monthlyExpense) return 0;
        
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        const currentDirectExpenses = allTxns
            .filter(tx => tx.type === 'expense' && new Date(tx.date) >= startDate && new Date(tx.date) <= endDate)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const currentIncome = allTxns
            .filter(tx => tx.type === 'income' && new Date(tx.date) >= startDate && new Date(tx.date) <= endDate)
            .reduce((sum, tx) => sum + tx.amount, 0);

        const indirectTotal = (monthlyExpense.rent || 0) + (monthlyExpense.supplies || 0) + (monthlyExpense.cleaning || 0) + (monthlyExpense.repairs || 0) + (monthlyExpense.electricityCost || 0);
        
        const currentProfit = currentIncome - currentDirectExpenses - indirectTotal;
        if (currentProfit <= 0) return 0;

        return (currentProfit * fundData.contributionPercentage) / 100;
    }, [fundData, monthlyExpense, allTxns]);

    const handleInitiateChange = async () => {
        if (!canEdit) return;
        setIsSaving(true);
        try {
            if (fundData && editedData.contributionPercentage !== fundData.contributionPercentage) {
                await apiService.createProposal(
                    'change_fund_settings',
                    `Изменение % отчислений в фонд`,
                    `Предлагается изменить процент отчислений от чистой прибыли с ${fundData.contributionPercentage}% на ${editedData.contributionPercentage}%.`,
                    { contributionPercentage: editedData.contributionPercentage }
                );
                setSuccessMsg("Предложение отправлено в Совет.");
            }
            setIsEditing(false);
        } catch (err) {
            setError('Ошибка: ' + (err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
             {successMsg && (
                <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded flex items-center animate-fade-in">
                    <ScaleIcon className="h-5 w-5 mr-2"/>
                    <span className="flex-grow">{successMsg}</span>
                    <Link to={ROUTE_PATHS.COUNCIL} className="underline font-bold ml-2">Перейти в Совет</Link>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <p className="text-xs font-bold uppercase text-brand-text-secondary mb-1">Текущий баланс</p>
                    <p className="text-3xl font-black text-emerald-400">
                        {fundData?.balance.toLocaleString()} ₽
                    </p>
                </Card>
                <Card>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase text-brand-text-secondary mb-1">Ставка отчислений</p>
                             {isEditing ? (
                                <div className="flex items-center">
                                    <Input id="fund-percentage" type="number" value={String(editedData.contributionPercentage || '')} onChange={e => setEditedData(p => ({...p, contributionPercentage: parseFloat(e.target.value) || 0}))} className="text-3xl font-bold !p-0 !bg-transparent border-0 focus:ring-0 w-20" />
                                    <span className="text-3xl font-bold text-sky-400">%</span>
                                </div>
                            ) : (
                                <p className="text-3xl font-black text-sky-400">{fundData?.contributionPercentage}%</p>
                            )}
                        </div>
                          {canEdit && (
                            <Button size="sm" variant="ghost" onClick={() => isEditing ? handleInitiateChange() : setIsEditing(true)}>
                                {isEditing ? <CheckIcon className="h-5 w-5 text-emerald-500"/> : <PencilIcon className="h-5 w-5"/>}
                            </Button>
                        )}
                    </div>
                </Card>
                <Card className="bg-sky-500/5 border-sky-500/30">
                    <p className="text-xs font-bold uppercase text-sky-600 mb-1 flex items-center">
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1"/> Прогноз пополнения
                    </p>
                    <p className="text-3xl font-black text-brand-text-primary">
                        + {projectedContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₽
                    </p>
                    <p className="text-[10px] text-brand-text-muted mt-1 italic">* На основе текущей прибыли месяца</p>
                </Card>
            </div>

            <Card className="!p-0 overflow-hidden">
                 <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-surface">
                    <h2 className="text-xl font-bold text-brand-text-primary">Журнал Общественных Средств</h2>
                    {canEdit && <Button onClick={() => setIsTxModalOpen(true)} size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Добавить запись</Button>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-brand-text-muted uppercase bg-brand-surface/50 font-bold">
                            <tr>
                                <th className="px-6 py-3">Дата</th>
                                <th className="px-6 py-3">Тип</th>
                                <th className="px-6 py-3">Назначение / Описание</th>
                                <th className="px-6 py-3 text-right">Сумма</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {fundData?.history.map(tx => (
                                <tr key={tx.id} className="hover:bg-brand-secondary/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${tx.type === 'contribution' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {tx.type === 'contribution' ? 'Взнос' : 'Трата'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-brand-text-primary font-medium">{tx.description}</td>
                                    <td className={`px-6 py-4 text-right font-black ${tx.type === 'contribution' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {tx.type === 'contribution' ? '+' : '-'} {tx.amount.toLocaleString()} ₽
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isTxModalOpen && <FundTransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} onSave={async (d) => { await apiService.addFundTransaction(d); fetchFundData(); setIsTxModalOpen(false); }} />}
        </div>
    );
};

export default CollectiveFundOverviewPage;
