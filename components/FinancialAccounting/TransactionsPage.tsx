
import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { Transaction, TransactionCategory, SortableTransactionKeys, Contact, Order } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import Input from '../UI/Input';
import { ArrowsUpDownIcon, PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon, TableCellsIcon, ArchiveBoxIcon as ViewArchiveIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, ArrowLeftIcon, SaveIcon, ArrowDownTrayIcon } from '../UI/Icons';
import { TRANSACTION_CATEGORIES, TRANSACTION_TYPE_COLOR_MAP, ROUTE_PATHS } from '../../constants';
import { useView } from '../../hooks/useView';
import ConfirmationModal from '../UI/ConfirmationModal';
import Tooltip from '../UI/Tooltip';
import { useNavigate, useParams } from 'react-router-dom';
import { downloadCSV } from '../../utils/exportUtils';

type ViewMode = 'active' | 'archived';
type SortDirection = 'asc' | 'desc';

const MobileTransactionCard: React.FC<{
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onArchiveToggle: (tx: Transaction) => void;
  onDeleteInitiate: (tx: Transaction) => void;
}> = ({ tx, onEdit, onArchiveToggle, onDeleteInitiate }) => (
  <Card className={`mb-3 ${tx.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onEdit(tx)}>
    <div className="flex justify-between items-start">
        <div className="flex-grow min-w-0">
            <p className="text-xs text-brand-text-muted">{new Date(tx.date).toLocaleDateString()}</p>
            <h3 className="font-medium text-brand-text-primary truncate" title={tx.description}>{tx.description}</h3>
            <p className="text-xs text-brand-text-secondary">{tx.category}</p>
        </div>
        <div className={`text-lg font-semibold flex-shrink-0 ml-2 ${TRANSACTION_TYPE_COLOR_MAP[tx.type].text}`}>
            {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('ru-RU')} ₽
        </div>
    </div>
    <div className="mt-3 pt-2 border-t border-brand-border flex justify-end space-x-1" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={() => onEdit(tx)}><PencilSquareIcon className="h-5 w-5 mr-1" /> Ред.</Button>
        <Button size="sm" variant="ghost" onClick={() => onArchiveToggle(tx)}>
            {tx.isArchived ? <ArrowUturnLeftIcon className="h-5 w-5"/> : <ArchiveBoxArrowDownIcon className="h-5 w-5"/>}
        </Button>
        {tx.isArchived && <Button size="sm" variant="danger" onClick={() => onDeleteInitiate(tx)}><TrashIcon className="h-5 w-5"/></Button>}
    </div>
  </Card>
);


const TransactionsPage: React.FC = () => {
    const { user } = useAuth();
    const { isMobileView } = useView();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInteractionLoading, setIsInteractionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [categoryFilter, setCategoryFilter] = useState<TransactionCategory | 'Все'>('Все');
    const [sortConfig, setSortConfig] = useState<{ key: SortableTransactionKeys, direction: SortDirection }>({ key: 'date', direction: 'desc' });
    
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [transactionToToggle, setTransactionToToggle] = useState<Transaction | null>(null);


    const fetchTransactions = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.getTransactions({
                searchTerm,
                typeFilter: typeFilter === 'all' ? undefined : typeFilter,
                categoryFilter,
                viewMode,
                sortConfig,
            });
            setTransactions(data);
        } catch (err) {
            setError(`Не удалось загрузить транзакции.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [user, searchTerm, typeFilter, categoryFilter, viewMode, sortConfig]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);
    
    const handleExportCSV = () => {
         const dataToExport = transactions.map(tx => ({
            ID: tx.id,
            Дата: new Date(tx.date).toLocaleDateString('ru-RU'),
            Тип: tx.type === 'income' ? 'Доход' : 'Расход',
            Сумма: tx.amount,
            Категория: tx.category,
            Описание: tx.description,
            Учет_ЕСХН: tx.isTaxDeductible !== false ? 'Да' : 'Нет',
            Архив: tx.isArchived ? 'Да' : 'Нет'
         }));
         
         downloadCSV(dataToExport, `transactions_export_${new Date().toISOString().split('T')[0]}.csv`, 'Экспорт транзакций');
    };

    const handleArchiveToggle = async (transaction: Transaction) => {
        setIsInteractionLoading(true);
        try {
            await apiService.archiveTransaction(transaction.id, !transaction.isArchived);
            await fetchTransactions();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsInteractionLoading(false);
        }
    };
    
    const handleDeleteInitiate = (transaction: Transaction) => {
        if(transaction.isArchived) {
            setTransactionToDelete(transaction);
            setIsDeleteConfirmOpen(true);
        }
    };

    const handleDeleteConfirm = async () => {
        if(!transactionToDelete) return;
        setIsInteractionLoading(true);
        try {
            await apiService.deleteTransaction(transactionToDelete.id);
            await fetchTransactions();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsInteractionLoading(false);
            setIsDeleteConfirmOpen(false);
            setTransactionToDelete(null);
        }
    };
    
    const handleToggleDeductibleConfirm = async () => {
        if (!transactionToToggle) return;
        setIsInteractionLoading(true);
        try {
            await apiService.updateTransaction({
                ...transactionToToggle,
                isTaxDeductible: !(transactionToToggle.isTaxDeductible !== false),
            });
            await fetchTransactions();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsInteractionLoading(false);
            setTransactionToToggle(null);
        }
    };

    const requestSort = (key: SortableTransactionKeys) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const getSortIcon = (key: SortableTransactionKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
          return <ArrowsUpDownIcon className="h-4 w-4 inline ml-1 opacity-40" />;
        }
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline ml-1" /> : <ChevronDownIcon className="h-4 w-4 inline ml-1" />;
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
                    <ArrowsUpDownIcon className="h-8 w-8 mr-3 text-brand-primary" />
                    Финансовые Транзакции
                </h1>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <Button onClick={handleExportCSV} variant="secondary" leftIcon={<ArrowDownTrayIcon className="h-5 w-5"/>} fullWidth={isMobileView}>
                        Экспорт CSV
                    </Button>
                    <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5"/>} fullWidth={isMobileView}>
                        {viewMode === 'active' ? 'Архив' : 'Активные'}
                    </Button>
                    <Button onClick={() => navigate(`${ROUTE_PATHS.TRANSACTIONS}/new`)} variant="primary" fullWidth={isMobileView}>
                        <PlusCircleIcon className="h-5 w-5 mr-2" />
                        Добавить транзакцию
                    </Button>
                </div>
            </div>

            <Card>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Input
                        id="transactions-search"
                        type="text"
                        placeholder="Поиск по описанию..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                    />
                    <div className="relative">
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full pl-4 pr-8 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary">
                            <option value="all">Все типы</option>
                            <option value="income">Доход</option>
                            <option value="expense">Расход</option>
                        </select>
                    </div>
                     <div className="relative">
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)} className="w-full pl-4 pr-8 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary">
                            <option value="Все">Все категории</option>
                            {TRANSACTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                
                {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : error ? <p className="text-red-500 text-center p-4">{error}</p> : (
                    transactions.length > 0 ? (
                        isMobileView ? (
                          <div className="space-y-3">
                            {transactions.map(tx => (
                                <MobileTransactionCard
                                    key={tx.id}
                                    tx={tx}
                                    onEdit={() => navigate(`${ROUTE_PATHS.TRANSACTIONS}/${tx.id}`)}
                                    onArchiveToggle={handleArchiveToggle}
                                    onDeleteInitiate={handleDeleteInitiate}
                                />
                            ))}
                          </div>
                        ) : (
                        <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left text-brand-text-secondary">
                                <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('date')}>Дата {getSortIcon('date')}</th>
                                        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('description')}>Описание {getSortIcon('description')}</th>
                                        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort('category')}>Категория {getSortIcon('category')}</th>
                                        <th scope="col" className="px-6 py-3 text-right cursor-pointer" onClick={() => requestSort('amount')}>Сумма {getSortIcon('amount')}</th>
                                        <th scope="col" className="px-4 py-3 text-center">Учет в ЕСХН</th>
                                        <th scope="col" className="px-6 py-3 text-center">Действия</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className={`${tx.isArchived ? 'opacity-50' : ''} hover:bg-brand-secondary cursor-pointer`} onClick={() => navigate(`${ROUTE_PATHS.TRANSACTIONS}/${tx.id}`)}>
                                            <td className="px-4 py-3">{new Date(tx.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-3 text-brand-text-primary">{tx.description}</td>
                                            <td className="px-6 py-3">{tx.category}</td>
                                            <td className={`px-6 py-3 text-right font-semibold ${TRANSACTION_TYPE_COLOR_MAP[tx.type].text}`}>
                                                {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('ru-RU')} ₽
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                {tx.type === 'expense' ? (
                                                    <Tooltip text={tx.isTaxDeductible !== false ? "Учитывается в расходах" : "Не учитывается в расходах"}>
                                                        <input
                                                            type="checkbox"
                                                            checked={tx.isTaxDeductible !== false}
                                                            onChange={() => setTransactionToToggle(tx)}
                                                            className="h-4 w-4 rounded border-brand-border text-sky-600 focus:ring-sky-500 cursor-pointer"
                                                            disabled={isInteractionLoading || tx.isArchived}
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <span className="text-xs text-brand-text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip text="Редактировать"><Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTE_PATHS.TRANSACTIONS}/${tx.id}`)}><PencilSquareIcon className="h-5 w-5"/></Button></Tooltip>
                                                    <Tooltip text={tx.isArchived ? 'Восстановить' : 'Архивировать'}><Button variant="ghost" size="sm" onClick={() => handleArchiveToggle(tx)}>{tx.isArchived ? <ArrowUturnLeftIcon className="h-5 w-5"/> : <ArchiveBoxArrowDownIcon className="h-5 w-5"/>}</Button></Tooltip>
                                                    {tx.isArchived && <Tooltip text="Удалить"><Button variant="ghost" size="sm" onClick={() => handleDeleteInitiate(tx)} className="text-red-500 hover:text-red-400"><TrashIcon className="h-5 w-5"/></Button></Tooltip>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        )
                    ) : (
                        <div className="text-center p-8 text-brand-text-muted">
                            <TableCellsIcon className="h-12 w-12 mx-auto mb-2" />
                            <p>Транзакции не найдены.</p>
                        </div>
                    )
                )}
            </Card>
            
            {transactionToToggle && (
                <ConfirmationModal
                    isOpen={!!transactionToToggle}
                    onClose={() => setTransactionToToggle(null)}
                    onConfirm={handleToggleDeductibleConfirm}
                    title="Изменить статус учета?"
                    message={
                        <p>
                            Вы уверены, что хотите изменить статус учета этой транзакции для налога ЕСХН?
                            <br />
                            <strong className="text-brand-text-primary">{transactionToToggle.description}</strong>
                            <br />
                            Новый статус: <strong className={transactionToToggle.isTaxDeductible !== false ? 'text-red-400' : 'text-emerald-400'}>{transactionToToggle.isTaxDeductible !== false ? 'НЕ УЧИТЫВАТЬ' : 'УЧИТЫВАТЬ'}</strong>.
                        </p>
                    }
                    confirmText="Да, изменить"
                    confirmButtonVariant="primary"
                    isLoading={isInteractionLoading}
                />
            )}

            {isDeleteConfirmOpen && transactionToDelete && (
                <ConfirmationModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={handleDeleteConfirm}
                    title="Удалить транзакцию?"
                    message={<p>Вы уверены, что хотите удалить транзакцию <strong className="text-brand-text-primary">{transactionToDelete.description}</strong>? Это действие необратимо.</p>}
                    confirmText="Удалить"
                    isLoading={isInteractionLoading}
                />
            )}
        </div>
    );
};

export default TransactionsPage;


// --- Transaction Editor Page Component ---

export const TransactionEditorPage: React.FC = () => {
    const { transactionId } = useParams<{ transactionId: string }>();
    const navigate = useNavigate();
    const isNew = !transactionId;

    const [transaction, setTransaction] = useState<Partial<Transaction>>({});
    const [isLoading, setIsLoading] = useState(!isNew);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchPrereqsAndData = async () => {
            setIsLoadingPrereqs(true);
            setIsLoading(true);
            try {
                const [contactsData, ordersData] = await Promise.all([
                    apiService.getContacts({ viewMode: 'active' }),
                    apiService.getOrders({ viewMode: 'active' })
                ]);
                setContacts(contactsData);
                setOrders(ordersData);

                if (isNew) {
                    setTransaction({
                        date: new Date().toISOString().split('T')[0],
                        type: 'expense',
                        amount: undefined,
                        description: '',
                        category: 'Прочее',
                        isTaxDeductible: true,
                    });
                } else {
                    const txData = await apiService.getTransactionById(transactionId!);
                    if (txData) {
                        setTransaction(txData);
                    } else {
                        setError("Транзакция не найдена");
                    }
                }
            } catch (err) {
                setError("Ошибка загрузки данных");
            } finally {
                setIsLoading(false);
                setIsLoadingPrereqs(false);
            }
        };
        fetchPrereqsAndData();
    }, [isNew, transactionId]);
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setTransaction(prev => ({ ...prev, [name]: checked }));
            return;
        }
        
        setTransaction(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
            ...(name === 'type' && value === 'income' && { isTaxDeductible: undefined })
        }));
    };

    const handleSave = async () => {
        setIsSaveConfirmOpen(false);
        setError(null);
        if (!transaction.description?.trim()) { setError("Описание обязательно."); return; }
        if (transaction.amount === undefined || transaction.amount <= 0) { setError("Сумма должна быть больше нуля."); return; }
        
        setIsSaving(true);
        try {
            await apiService.saveTransaction(transaction);
            navigate(ROUTE_PATHS.TRANSACTIONS);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) return <LoadingSpinner/>;
    if (error && !transaction) return <p className="text-red-500 text-center">{error}</p>;
    if (!transaction) return null;

    return (
        <div className="space-y-4">
             <Button onClick={() => navigate(ROUTE_PATHS.TRANSACTIONS)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку транзакций
            </Button>
            <h1 className="text-2xl font-semibold">{isNew ? 'Новая транзакция' : 'Редактировать транзакцию'}</h1>
             <Card>
                <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }} className="space-y-4">
                    {isLoadingPrereqs ? <LoadingSpinner/> : (
                         <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input id="tx-date" name="date" label="Дата *" type="date" value={transaction.date?.split('T')[0] || ''} onChange={handleInputChange} required />
                                <div>
                                    <label htmlFor="tx-type" className="block text-sm font-medium text-brand-text-primary mb-1">Тип *</label>
                                    <select id="tx-type" name="type" value={transaction.type || 'expense'} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                                        <option value="expense">Расход</option>
                                        <option value="income">Доход</option>
                                    </select>
                                </div>
                            </div>
                            <Input id="tx-amount" name="amount" label="Сумма (₽) *" type="number" step="0.01" value={String(transaction.amount || '')} onChange={handleInputChange} required />
                            <Input id="tx-description" name="description" label="Описание *" value={transaction.description || ''} onChange={handleInputChange} required />
                             <div>
                                <label htmlFor="tx-category" className="block text-sm font-medium text-brand-text-primary mb-1">Категория *</label>
                                <select id="tx-category" name="category" value={transaction.category || 'Прочее'} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                                    {TRANSACTION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            {transaction.type === 'expense' && (
                                <div className="flex items-center space-x-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="tx-isTaxDeductible"
                                        name="isTaxDeductible"
                                        checked={transaction.isTaxDeductible !== false}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-sky-600 border-brand-border rounded focus:ring-sky-500"
                                    />
                                    <label htmlFor="tx-isTaxDeductible" className="text-sm text-brand-text-primary">
                                        Учитывать в расходах для налога ЕСХН
                                    </label>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label htmlFor="tx-relatedContactId" className="block text-sm font-medium text-brand-text-primary mb-1">Связать с контактом (опционально)</label>
                                    <select id="tx-relatedContactId" name="relatedContactId" value={transaction.relatedContactId || ''} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                                        <option value="">Не связан</option>
                                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="tx-relatedOrderId" className="block text-sm font-medium text-brand-text-primary mb-1">Связать с заказом (опционально)</label>
                                    <select id="tx-relatedOrderId" name="relatedOrderId" value={transaction.relatedOrderId || ''} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                                        <option value="">Не связан</option>
                                        {orders.map(o => <option key={o.id} value={o.id}>{`#${o.id} - ${o.customerName}`}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-5 flex justify-end space-x-3">
                                <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isSaving}>Отмена</Button>
                                <Button type="submit" isLoading={isSaving} leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                            </div>
                        </>
                    )}
                </form>
             </Card>
             {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleSave} title="Подтвердить сохранение?" message="Сохранить эту транзакцию?" confirmText="Сохранить" isLoading={isSaving} />}
        </div>
    );
};
