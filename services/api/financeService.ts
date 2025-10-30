// services/api/financeService.ts
import { Transaction, TransactionCategory, SortableTransactionKeys, MonthlyExpense, CompanyRequisites } from '../../types';
import { mockTransactions } from '../mockData/transactions';
import { mockMonthlyExpenses } from '../mockData/monthlyExpenses';
import { mockCompanyRequisites } from '../mockData/companyRequisites';
import { delay, deepCopy, sortData } from './utils';
import { generateId } from '../../utils/idGenerators';

const getTransactions = async (filters: { searchTerm?: string; typeFilter?: 'income' | 'expense'; categoryFilter?: TransactionCategory | 'Все'; viewMode?: 'active' | 'archived'; sortConfig?: { key: SortableTransactionKeys, direction: 'asc' | 'desc' } }): Promise<Transaction[]> => {
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
    await delay(100);
    const tx = mockTransactions.find(t => t.id === id);
    return tx ? deepCopy(tx) : null;
};

const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'isArchived' | 'archivedAt'>): Promise<Transaction> => {
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
    await delay(400);
    const index = mockTransactions.findIndex(t => t.id === data.id);
    if (index === -1) throw new Error("Transaction not found");
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
    await delay(300);
    const index = mockTransactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Transaction not found");
    mockTransactions[index].isArchived = archive;
    mockTransactions[index].archivedAt = archive ? new Date().toISOString() : undefined;
    return { success: true };
};

const deleteTransaction = async (id: string): Promise<{success: true}> => {
    await delay(500);
    const index = mockTransactions.findIndex(t => t.id === id);
    if(index > -1 && mockTransactions[index].isArchived) {
        mockTransactions.splice(index, 1);
        return { success: true };
    }
    if(index === -1) throw new Error("Transaction not found");
    throw new Error("Transaction must be archived before deletion");
};

const getMonthlyExpense = async (year: number, month: number): Promise<MonthlyExpense | null> => {
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
    await delay(100);
    return deepCopy(mockCompanyRequisites);
};

const updateCompanyRequisites = async (data: CompanyRequisites): Promise<CompanyRequisites> => {
    await delay(400);
    // Directly update properties of the imported mutable object
    Object.assign(mockCompanyRequisites, data);
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