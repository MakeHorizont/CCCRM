
import { CouncilProposal, CouncilVote, ProposalType, ProposalStatus, User } from '../../types';
import { mockCouncilProposals } from '../mockData/council';
import { mockCollectiveFund } from '../mockData/collectiveFund';
import { MOCK_USERS } from '../mockData/users';
import { mockTechnologyCards } from '../mockData/technologyCards';
import { delay, deepCopy, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';
import { systemService } from './systemService';
import { ROUTE_PATHS } from '../../constants';
import { API_CONFIG } from './config';
import { apiClient } from '../apiClient';

const getProposals = async (status?: 'active' | 'history'): Promise<CouncilProposal[]> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.COUNCIL) {
        return apiClient.get<CouncilProposal[]>('/council/proposals', { 
            active: status === 'active'
        });
    }

    await delay(300);
    let props = deepCopy(mockCouncilProposals);
    if (status === 'active') {
        props = props.filter(p => p.status === 'pending');
    } else if (status === 'history') {
        props = props.filter(p => p.status !== 'pending');
    }
    return props.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const executeProposalLogic = async (proposal: CouncilProposal) => {
    console.log(`[СИСТЕМА] Исполнение решения Совета: ${proposal.title}`);
    
    switch (proposal.type) {
        case 'change_fund_settings':
            if (proposal.payload.contributionPercentage !== undefined) {
                mockCollectiveFund.contributionPercentage = proposal.payload.contributionPercentage;
            }
            break;
        case 'change_system_mode':
            if (proposal.payload.mode) {
                localStorage.setItem('systemMode', proposal.payload.mode);
                window.dispatchEvent(new Event('storage'));
            }
            break;
        case 'change_salary_formula':
            // Collective Salary Reform: Update all daily rates by percentage or fix
            if (proposal.payload.increasePercentage) {
                MOCK_USERS.forEach(u => {
                    if (u.dailyRate) u.dailyRate = Math.round(u.dailyRate * (1 + proposal.payload.increasePercentage / 100));
                });
            }
            break;
        case 'technological_reform':
            // Approve a new version of a Technology Card
            if (proposal.payload.techCardId) {
                const card = mockTechnologyCards.find(c => c.id === proposal.payload.techCardId);
                if (card) {
                    card.isArchived = false;
                    card.version = (card.version || 1) + 1;
                }
            }
            break;
        case 'withdraw_fund':
            if (proposal.payload.amount) {
                mockCollectiveFund.balance -= proposal.payload.amount;
                mockCollectiveFund.history.unshift({
                    id: generateId('ftx'),
                    date: new Date().toISOString(),
                    type: 'expense',
                    amount: proposal.payload.amount,
                    description: `Выплата по решению Совета: ${proposal.title}`
                });
            }
            break;
    }
    
    await systemService.logEvent(
        'Исполнение решения Совета',
        `Решение "${proposal.title}" (Тип: ${proposal.type}) исполнено программным ядром.`,
        'admin',
        proposal.id,
        'CouncilProposal'
    );
};

const voteForProposal = async (proposalId: string, decision: 'approve' | 'reject', comment?: string): Promise<CouncilProposal> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.COUNCIL) {
        return apiClient.post<CouncilProposal>(`/council/proposals/${proposalId}/vote`, { decision, comment });
    }

    await delay(400);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const index = mockCouncilProposals.findIndex(p => p.id === proposalId);
    if (index === -1) throw new Error("Proposal not found");

    const proposal = mockCouncilProposals[index];
    if (proposal.status !== 'pending') throw new Error("Голосование закрыто.");
    if (proposal.votes.some(v => v.userId === user.id)) throw new Error("Вы уже голосовали.");

    proposal.votes.push({
        userId: user.id,
        userName: user.name || user.email,
        decision,
        timestamp: new Date().toISOString(),
        comment
    });

    const approves = proposal.votes.filter(v => v.decision === 'approve').length;
    const rejects = proposal.votes.filter(v => v.decision === 'reject').length;

    if (approves >= proposal.requiredApprovals) {
        proposal.status = 'approved';
        await executeProposalLogic(proposal);
        proposal.status = 'executed';
        proposal.executedAt = new Date().toISOString();
        proposal.executedBySystem = true;
    } else if (rejects >= proposal.requiredApprovals) {
        proposal.status = 'rejected';
    }

    mockCouncilProposals[index] = proposal;
    return deepCopy(proposal);
};

const createProposal = async (type: ProposalType, title: string, description: string, payload: any): Promise<CouncilProposal> => {
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.COUNCIL) {
        return apiClient.post<CouncilProposal>('/council/proposals', { type, title, description, payload });
    }

    await delay(400);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const newProposal: CouncilProposal = {
        id: generateId('prop'),
        type,
        title,
        description,
        initiatorId: user.id,
        initiatorName: user.name || user.email,
        createdAt: new Date().toISOString(),
        status: 'pending',
        payload,
        votes: [{
            userId: user.id,
            userName: user.name || user.email,
            decision: 'approve',
            timestamp: new Date().toISOString(),
            comment: 'Инициатор'
        }],
        requiredApprovals: 2, 
    };

    mockCouncilProposals.unshift(newProposal);
    
    // Notify Council
    MOCK_USERS.filter(u => u.role === 'ceo' || u.role === 'manager').forEach(m => {
        if (m.id !== user.id) {
            createSystemNotification(m.id, 'warning', `Новый вопрос в Совете: ${title}`, ROUTE_PATHS.COUNCIL, { type: 'system', id: newProposal.id });
        }
    });

    return deepCopy(newProposal);
};

export const councilService = {
    getProposals,
    createProposal,
    voteForProposal,
};
