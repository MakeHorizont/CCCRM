
import { CouncilProposal, CouncilVote, ProposalType } from '../../types';
import { mockCouncilProposals } from '../mockData/council';
import { mockCollectiveFund } from '../mockData/collectiveFund'; // Direct access to modify
import { MOCK_USERS } from '../mockData/users'; // Import users to find council members
import { delay, deepCopy, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { authService } from '../authService';
import { systemService } from './systemService';
import { ROUTE_PATHS } from '../../constants';

const getProposals = async (status?: 'active' | 'history'): Promise<CouncilProposal[]> => {
    await delay(300);
    let props = deepCopy(mockCouncilProposals);
    if (status === 'active') {
        props = props.filter(p => p.status === 'pending');
    } else if (status === 'history') {
        props = props.filter(p => p.status !== 'pending');
    }
    return props.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const createProposal = async (
    type: ProposalType,
    title: string,
    description: string,
    payload: any
): Promise<CouncilProposal> => {
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
        votes: [],
        requiredApprovals: 2, // Hardcoded threshold for now (simulating 2 out of 3)
    };

    // Auto-vote for initiator
    newProposal.votes.push({
        userId: user.id,
        userName: user.name || user.email,
        decision: 'approve',
        timestamp: new Date().toISOString(),
        comment: 'Инициатор предложения'
    });

    mockCouncilProposals.unshift(newProposal);

    await systemService.logEvent(
        'Создание предложения в Совет',
        `Инициировано голосование: "${title}". Требуется голосов: ${newProposal.requiredApprovals}`,
        'admin',
        newProposal.id,
        'CouncilProposal'
    );
    
    // Notify Council Members
    // In our mock system, Council = CEO + Managers
    const councilMembers = MOCK_USERS.filter(u => u.role === 'ceo' || u.role === 'manager');
    councilMembers.forEach(member => {
        if (member.id !== user.id) { // Don't notify initiator
            createSystemNotification(
                member.id,
                'warning',
                `Совет: Требуется ваш голос по вопросу "${title}"`,
                ROUTE_PATHS.COUNCIL,
                { type: 'system', id: newProposal.id }
            );
        }
    });

    // Check if initiator's vote is enough (e.g. threshold is 1 for dev mode, but usually it's >1)
    if (newProposal.votes.length >= newProposal.requiredApprovals) {
         await checkAndExecuteProposal(newProposal.id);
    }

    return deepCopy(newProposal);
};

const voteForProposal = async (proposalId: string, decision: 'approve' | 'reject', comment?: string): Promise<CouncilProposal> => {
    await delay(400);
    const index = mockCouncilProposals.findIndex(p => p.id === proposalId);
    if (index === -1) throw new Error("Proposal not found");

    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    const proposal = mockCouncilProposals[index];
    
    if (proposal.status !== 'pending') throw new Error("Голосование по этому вопросу уже закрыто.");
    if (proposal.votes.some(v => v.userId === user.id)) throw new Error("Вы уже голосовали.");

    // Record vote
    proposal.votes.push({
        userId: user.id,
        userName: user.name || user.email,
        decision,
        timestamp: new Date().toISOString(),
        comment
    });

    mockCouncilProposals[index] = proposal; // Update mock store
    
    // Check execution logic immediately
    await checkAndExecuteProposal(proposalId);

    return deepCopy(mockCouncilProposals[index]);
};

// Internal helper to check thresholds and execute logic
const checkAndExecuteProposal = async (proposalId: string) => {
    const index = mockCouncilProposals.findIndex(p => p.id === proposalId);
    if (index === -1) return;
    const proposal = mockCouncilProposals[index];

    const approves = proposal.votes.filter(v => v.decision === 'approve').length;
    const rejects = proposal.votes.filter(v => v.decision === 'reject').length;
    
    if (approves >= proposal.requiredApprovals) {
        proposal.status = 'approved';
        proposal.executedAt = new Date().toISOString();
        
        // --- THE SMART CONTRACT LOGIC ---
        // This code executes the decision. It's the only way to change these settings.
        switch (proposal.type) {
            case 'change_fund_settings':
                if (proposal.payload.contributionPercentage !== undefined) {
                    const oldVal = mockCollectiveFund.contributionPercentage;
                    mockCollectiveFund.contributionPercentage = proposal.payload.contributionPercentage;
                    await systemService.logEvent(
                        'Исполнение решения Совета',
                        `Изменена ставка фонда: ${oldVal}% -> ${mockCollectiveFund.contributionPercentage}%`,
                        'finance',
                        proposal.id,
                        'CollectiveFund'
                    );
                }
                break;
            case 'change_system_mode':
                if (proposal.payload.mode) {
                    try {
                        localStorage.setItem('systemMode', proposal.payload.mode);
                        // Trigger a storage event so other tabs/components update if listening (optional)
                        window.dispatchEvent(new Event("storage"));
                        await systemService.logEvent(
                            'Смена режима системы',
                            `Режим системы изменен на: ${proposal.payload.mode}`,
                            'admin',
                            proposal.id,
                            'SystemSettings'
                        );
                    } catch (e) {
                        console.error("Failed to update system mode", e);
                    }
                }
                break;
            // Add other cases here (e.g. withdraw_fund)
        }
        // --------------------------------
        
        await systemService.logEvent(
            'Решение Совета принято',
            `Предложение "${proposal.title}" утверждено (ЗА: ${approves}) и исполнено системой автоматически.`,
            'admin',
            proposal.id,
            'CouncilProposal'
        );

    } else if (rejects >= proposal.requiredApprovals) { // Or logic for rejection threshold
        proposal.status = 'rejected';
        await systemService.logEvent(
            'Решение Совета отклонено',
            `Предложение "${proposal.title}" отклонено (ПРОТИВ: ${rejects}).`,
            'admin',
            proposal.id,
            'CouncilProposal'
        );
    }
    mockCouncilProposals[index] = proposal;
};

export const councilService = {
    getProposals,
    createProposal,
    voteForProposal,
};
