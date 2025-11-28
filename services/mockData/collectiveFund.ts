// services/mockData/collectiveFund.ts
import { CollectiveFund } from '../../types';

export let mockCollectiveFund: CollectiveFund = {
    balance: 150000,
    contributionPercentage: 20,
    history: [
        {
            id: 'ftx-1',
            date: '2024-07-01',
            type: 'contribution',
            amount: 50000,
            description: 'Отчисления от прибыли за Июнь 2024',
            relatedPeriod: '2024-06',
        },
        {
            id: 'ftx-2',
            date: '2024-07-15',
            type: 'expense',
            amount: 25000,
            description: 'Покупка теннисного стола (инициатива #si-3)',
            relatedInitiativeId: 'si-3',
        },
        {
            id: 'ftx-3',
            date: '2024-07-20',
            type: 'expense',
            amount: 10000,
            description: 'Помощь товарищу Смирнову С. в связи с трудными жизненными обстоятельствами',
            relatedUserId: 'user3',
            relatedUserName: 'Сергей Смирнов',
        }
    ]
};