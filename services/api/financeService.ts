
// services/api/financeService.ts
import { Transaction, TransactionCategory, SortableTransactionKeys, MonthlyExpense, CompanyRequisites } from '../../types';
import { mockTransactions } from '../mockData/transactions';
import { mockMonthlyExpenses } from '../mockData/monthlyExpenses';
import { mockCompanyRequisites } from '../mockData/companyRequisites';
import { delay, deepCopy, sortData } from './utils';
import { generateId } from '../../utils/idGenerators';
import { systemService } from './systemService'; 
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getTransactions = async (filters: { searchTerm?: string; typeFilter?: 'income' | 'expense'; categoryFilter?: TransactionCategory | 'Все'; viewMode?: 'active' | 'archived'; sortConfig?: { key: SortableTransactionKeys, direction: 'asc' | 'desc' } }): Promise<Transaction[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        return apiClient.get<Transaction[]>('/finance/transactions', {
            search: filters.searchTerm,
            type: filters.typeFilter,
            category: filters.categoryFilter !== 'Все' ? filters.categoryFilter : undefined,
            archived: filters.viewMode === 'archived'
        }).then(txs => sortData(txs, filters.sortConfig || { key: 'date', direction: 'desc' }));
    }

    await delay(300);
    let txs = deepCopy(mockTransactions);
    if (filters.viewMode === 'archived') txs = txs.filter(t => t.isArchived);
    else txs = txs.filter(t => !t.isArchived);

    if (filters.typeFilter) txs = txs.filter(t => t.type === filters.typeFilter);
    if (filters.categoryFilter && filters.categoryFilter !== 'Все') txs = txs.filter(t => t.category === filters.categoryFilter);
    if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        txs = txs.filter(t => t.description.toLowerCase().includes(term));
    }
    return sortData(txs, filters.sortConfig || { key: 'date', direction: 'desc' });
};

const getTransactionById = async (id: string): Promise<Transaction | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        return apiClient.get<Transaction>(`/finance/transactions/${id}`);
    }
    await delay(100);
    const tx = mockTransactions.find(t => t.id === id);
    return tx ? deepCopy(tx) : null;
};

const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt'>): Promise<Transaction> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        return apiClient.post<Transaction>('/finance/transactions', data);
    }

    await delay(400);
    const newTx: Transaction = {
        ...data,
        id: generateId('txn'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
    };
    mockTransactions.unshift(newTx);
    return deepCopy(newTx);
};

const updateTransaction = async (data: Transaction): Promise<Transaction> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        return apiClient.patch<Transaction>(`/finance/transactions/${data.id}`, data);
    }

    await delay(400);
    const index = mockTransactions.findIndex(t => t.id === data.id);
    if (index === -1) throw new Error("Transaction not found");
    
    const oldTx = mockTransactions[index];
    if (oldTx.amount !== data.amount || oldTx.type !== data.type) {
         await systemService.logEvent(
            'Редактирование транзакции',
            `Транзакция #${data.id}: сумма изменена с ${oldTx.amount} на ${data.amount}`,
            'finance',
            data.id,
            'Transaction'
        );
    }

    mockTransactions[index] = { ...mockTransactions[index], ...data, updatedAt: new Date().toISOString() };
    return deepCopy(mockTransactions[index]);
};

const saveTransaction = async (data: Partial<Transaction>): Promise<Transaction> => {
    if (data.id) {
        return updateTransaction(data as Transaction);
    } else {
        return addTransaction(data as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt'>);
    }
};

const archiveTransaction = async (id: string, archive: boolean): Promise<{success: true}> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        await apiClient.post(`/finance/transactions/${id}/archive`, { archive });
        return { success: true };
    }

    await delay(300);
    const index = mockTransactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Transaction not found");
    mockTransactions[index].isArchived = archive;
    mockTransactions[index].archivedAt = archive ? new Date().toISOString() : undefined;
    
    await systemService.logEvent(
        archive ? 'Архивация транзакции' : 'Восстановление транзакции',
        `Транзакция #${id} ${archive ? 'перемещена в архив' : 'восстановлена'}.`,
        'finance',
        id,
        'Transaction'
    );

    return { success: true };
};

const deleteTransaction = async (id: string): Promise<{success: true}> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        await apiClient.delete(`/finance/transactions/${id}`);
        return { success: true };
    }

    await delay(500);
    const index = mockTransactions.findIndex(t => t.id === id);
    if(index > -1 && mockTransactions[index].isArchived) {
        const amount = mockTransactions[index].amount;
        mockTransactions.splice(index, 1);
        
        await systemService.logEvent(
            'Удаление транзакции',
            `Транзакция #${id} (сумма: ${amount}) удалена навсегда.`,
            'finance',
            id,
            'Transaction'
        );

        return { success: true };
    }
    if(index === -1) throw new Error("Transaction not found");
    throw new Error("Transaction must be archived before deletion");
};

const getMonthlyExpense = async (year: number, month: number): Promise<MonthlyExpense | null> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        try {
            return await apiClient.get<MonthlyExpense>(`/finance/expenses/${year}/${month}`);
        } catch {
            return null;
        }
    }

    await delay(200);
    const id = `${year}-${String(month + 1).padStart(2, '0')}`;
    let expense = mockMonthlyExpenses.find(e => e.id === id);
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    const incomeThisMonth = mockTransactions
        .filter(tx => tx.type === 'income' && new Date(tx.date) >= startDate && new Date(tx.date) <= endDate && !tx.isArchived)
        .reduce((sum, tx) => sum + tx.amount, 0);

    if (expense) {
        expense.totalIncome = incomeThisMonth;
    } else {
        expense = { id, year, month, totalIncome: incomeThisMonth, rent: 0, depreciation: 0, supplies: 0, cleaning: 0, repairs: 0, updatedAt: new Date().toISOString(), isClosed: false, electricityPricePerKwh: 5.5, waterAndOtherUtilities: 0, electricityCost: 0 };
    }
    return deepCopy(expense);
};

const updateMonthlyExpense = async (data: MonthlyExpense): Promise<MonthlyExpense> => {
     if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
        return await apiClient.post<MonthlyExpense>(`/finance/expenses`, data);
    }

    await delay(400);
    const index = mockMonthlyExpenses.findIndex(e => e.id === data.id);
    
    if (index > -1) {
        mockMonthlyExpenses[index] = { ...mockMonthlyExpenses[index], ...data, updatedAt: new Date().toISOString() };
    } else {
        mockMonthlyExpenses.push({ ...data, updatedAt: new Date().toISOString() });
    }
    
    const finalData = mockMonthlyExpenses.find(e => e.id === data.id);
    return deepCopy(finalData!);
};

const getCompanyRequisites = async (): Promise<CompanyRequisites> => {
     if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
         return apiClient.get<CompanyRequisites>('/finance/requisites');
     }
    await delay(100);
    return deepCopy(mockCompanyRequisites);
};

const updateCompanyRequisites = async (data: CompanyRequisites): Promise<CompanyRequisites> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.FINANCE) {
         return apiClient.put<CompanyRequisites>('/finance/requisites', data);
    }

    await delay(400);
    Object.assign(mockCompanyRequisites, data);
    
    await systemService.logEvent(
        'Изменение реквизитов',
        'Изменены реквизиты компании (Налогообложение).',
        'admin',
        'company-req',
        'CompanyRequisites'
    );
    
    return deepCopy(mockCompanyRequisites);
};

export const financeService = {
    getTransactions,
    getTransactionById,
    addTransaction,
    updateTransaction,
    saveTransaction,
    archiveTransaction,
    deleteTransaction,
    getMonthlyExpense,
    updateMonthlyExpense,
    getCompanyRequisites,
    updateCompanyRequisites,
};
