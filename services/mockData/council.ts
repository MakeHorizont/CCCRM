
import { CouncilProposal } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockCouncilProposals: CouncilProposal[] = [
    {
        id: generateId('prop'),
        type: 'change_fund_settings',
        title: 'Увеличение отчислений в фонд',
        description: 'Предлагаю поднять ставку отчислений с 15% до 20% в связи с планами по закупке нового оборудования.',
        initiatorId: 'user1',
        initiatorName: 'Левченко Роман',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        status: 'pending',
        payload: { contributionPercentage: 20 },
        votes: [
            { userId: 'user1', userName: 'Левченко Роман', decision: 'approve', timestamp: new Date().toISOString() }
        ],
        requiredApprovals: 2
    }
];
