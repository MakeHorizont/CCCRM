// services/api/collectiveFundService.ts
import { CollectiveFund, FundTransaction, SocialInitiative, User } from '../../types';
import { mockCollectiveFund } from '../mockData/collectiveFund';
import { mockSocialInitiatives } from '../mockData/socialInitiatives';
import { mockMonthlyExpenses } from '../mockData/monthlyExpenses';
import { mockTransactions } from '../mockData/transactions';
import { MOCK_USERS } from '../mockData/users';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';

const getCollectiveFund = async (): Promise<CollectiveFund> => {
    await delay(300);
    mockCollectiveFund.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return deepCopy(mockCollectiveFund);
};

const updateCollectiveFund = async (data: Partial<CollectiveFund>): Promise<CollectiveFund> => {
    await delay(400);
    mockCollectiveFund.balance = data.balance ?? mockCollectiveFund.balance;
    mockCollectiveFund.contributionPercentage = data.contributionPercentage ?? mockCollectiveFund.contributionPercentage;
    return deepCopy(mockCollectiveFund);
};

const addFundTransaction = async (data: Omit<FundTransaction, 'id'>): Promise<FundTransaction> => {
    await delay(400);
    const newTx: FundTransaction = { ...data, id: generateId('ftx') };
    mockCollectiveFund.history.unshift(newTx);
    if (newTx.type === 'contribution') {
        mockCollectiveFund.balance += newTx.amount;
    } else {
        mockCollectiveFund.balance -= newTx.amount;
    }
    return deepCopy(newTx);
};

const deleteFundTransaction = async (id: string): Promise<{ success: true }> => {
    await delay(400);
    const index = mockCollectiveFund.history.findIndex(tx => tx.id === id);
    if (index === -1) throw new Error("Fund transaction not found");
    
    const tx = mockCollectiveFund.history[index];
    if (tx.type === 'contribution') {
        mockCollectiveFund.balance -= tx.amount;
    } else {
        mockCollectiveFund.balance += tx.amount;
    }
    
    mockCollectiveFund.history.splice(index, 1);
    return { success: true };
};

const closeMonthAndContributeToFund = async (year: number, month: number): Promise<{ message: string, fundContribution: number }> => {
    await delay(1000);
    const id = `${year}-${String(month + 1).padStart(2, '0')}`;
    const expenseRecord = mockMonthlyExpenses.find(e => e.id === id);
    if (!expenseRecord) throw new Error("Финансовые данные за этот месяц не найдены.");
    if (expenseRecord.isClosed) throw new Error("Этот месяц уже закрыт.");

    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const directExpenses = mockTransactions
        .filter(tx => 
            tx.type === 'expense' && 
            new Date(tx.date + 'T00:00:00Z') >= startDate && // Treat date as UTC
            new Date(tx.date + 'T00:00:00Z') <= endDate && 
            !tx.isArchived
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

    const income = expenseRecord.totalIncome || 0;
    const totalIndirectExpenses = (expenseRecord.rent || 0) + (expenseRecord.depreciation || 0) + (expenseRecord.supplies || 0) + (expenseRecord.cleaning || 0) + (expenseRecord.repairs || 0) + (expenseRecord.electricityCost || 0) + (expenseRecord.waterAndOtherUtilities || 0);
    
    const profit = income - totalIndirectExpenses - directExpenses;

    if (profit <= 0) {
        expenseRecord.isClosed = true;
        return { message: `Месяц закрыт. Прибыль отсутствует (${profit.toLocaleString()} ₽). Отчисления в фонд не производились.`, fundContribution: 0 };
    }

    const contribution = (profit * mockCollectiveFund.contributionPercentage) / 100;
    
    await addFundTransaction({
        date: new Date(year, month + 1, 0).toISOString().split('T')[0],
        type: 'contribution',
        amount: contribution,
        description: `Отчисления от прибыли за ${id}`,
        relatedPeriod: id,
    });
    
    expenseRecord.isClosed = true;
    
    return { message: `Месяц закрыт. Чистая прибыль: ${profit.toLocaleString()} ₽. В фонд отчислено ${contribution.toLocaleString()} ₽.`, fundContribution: contribution };
};

const getSocialInitiatives = async (): Promise<SocialInitiative[]> => {
    await delay(300);
    return deepCopy(mockSocialInitiatives).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const addSocialInitiative = async (data: Omit<SocialInitiative, 'id'|'createdAt'|'updatedAt'|'currentAmount'|'supporters'>): Promise<SocialInitiative> => {
    await delay(400);
    const newInitiative: SocialInitiative = {
        ...data,
        id: generateId('si'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentAmount: 0,
        supporters: [],
    };
    mockSocialInitiatives.unshift(newInitiative);
    return deepCopy(newInitiative);
};

const updateSocialInitiative = async (data: SocialInitiative): Promise<SocialInitiative> => {
    await delay(400);
    const index = mockSocialInitiatives.findIndex(i => i.id === data.id);
    if (index === -1) throw new Error("Social initiative not found");
    mockSocialInitiatives[index] = { ...mockSocialInitiatives[index], ...data, updatedAt: new Date().toISOString() };
    return deepCopy(mockSocialInitiatives[index]);
};

const supportSocialInitiative = async (initiativeId: string, user: {id: string, name: string}): Promise<SocialInitiative> => {
    await delay(300);
    const index = mockSocialInitiatives.findIndex(i => i.id === initiativeId);
    if (index === -1) throw new Error("Social initiative not found");

    const initiative = mockSocialInitiatives[index];
    const userIndex = initiative.supporters.findIndex(s => s.userId === user.id);
    
    if (userIndex > -1) {
        initiative.supporters.splice(userIndex, 1); // Un-support
    } else {
        initiative.supporters.push({ userId: user.id, userName: user.name, supportedAt: new Date().toISOString() });
    }
    
    initiative.updatedAt = new Date().toISOString();
    return deepCopy(initiative);
};

const fundSocialInitiative = async (initiativeId: string, userId: string): Promise<SocialInitiative> => {
    await delay(600);
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user || user.role !== 'ceo') {
        throw new Error("Только руководитель может финансировать инициативы.");
    }
    const index = mockSocialInitiatives.findIndex(i => i.id === initiativeId);
    if (index === -1) {
        throw new Error("Социальная инициатива не найдена.");
    }

    const initiative = mockSocialInitiatives[index];
    if (initiative.status !== 'proposal' && initiative.status !== 'active') {
        throw new Error("Инициатива не может быть профинансирована в текущем статусе.");
    }
    if (!initiative.targetAmount || initiative.targetAmount <= 0) {
        throw new Error("У инициативы нет финансовой цели.");
    }

    const amountToFund = initiative.targetAmount - initiative.currentAmount;
    if (amountToFund <= 0) {
        initiative.status = 'funded';
        initiative.updatedAt = new Date().toISOString();
        return deepCopy(initiative);
    }
    
    if (mockCollectiveFund.balance < amountToFund) {
        throw new Error(`Недостаточно средств в Коллективном Фонде. Требуется: ${amountToFund.toLocaleString()} ₽, доступно: ${mockCollectiveFund.balance.toLocaleString()} ₽.`);
    }

    const transaction: FundTransaction = {
        id: generateId('ftx'),
        date: new Date().toISOString(),
        type: 'expense',
        amount: amountToFund,
        description: `Финансирование инициативы: "${initiative.title}"`,
        relatedInitiativeId: initiative.id,
        relatedUserId: userId,
        relatedUserName: user.name,
    };
    mockCollectiveFund.history.unshift(transaction);
    mockCollectiveFund.balance -= amountToFund;

    initiative.currentAmount = initiative.targetAmount;
    initiative.status = 'funded';
    initiative.updatedAt = new Date().toISOString();
    
    return deepCopy(initiative);
};

export const collectiveFundService = {
    getCollectiveFund,
    updateCollectiveFund,
    addFundTransaction,
    deleteFundTransaction,
    closeMonthAndContributeToFund,
    getSocialInitiatives,
    addSocialInitiative,
    updateSocialInitiative,
    supportSocialInitiative,
    fundSocialInitiative,
};
