import React, { useState, useEffect, useCallback } from 'react';
import { CouncilProposal } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { CheckCircleIcon, XCircleIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

// Extracted ProposalCard to avoid re-definition on every render
const ProposalCard: React.FC<{ proposal: CouncilProposal; currentUserId?: string; onVote: (id: string, decision: 'approve' | 'reject') => void; processingId: string | null }> = ({ proposal, currentUserId, onVote, processingId }) => {
    const alreadyVoted = proposal.votes.some(v => v.userId === currentUserId);
    const approves = proposal.votes.filter(v => v.decision === 'approve').length;
    const rejects = proposal.votes.filter(v => v.decision === 'reject').length;
    const totalVotes = approves + rejects;
    const required = proposal.requiredApprovals;

    return (
        <Card className={`mb-4 border-l-4 ${proposal.status === 'pending' ? 'border-sky-500' : proposal.status === 'approved' ? 'border-emerald-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-brand-text-primary">{proposal.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                            proposal.status === 'pending' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200' : 
                            proposal.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                        }`}>
                            {proposal.status === 'pending' ? 'На голосовании' : proposal.status === 'approved' ? 'Принято' : 'Отклонено'}
                        </span>
                    </div>
                    <p className="text-xs text-brand-text-muted mt-1">
                        Инициатор: {proposal.initiatorName} | {new Date(proposal.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right text-xs text-brand-text-secondary">
                    Кворум: <span className="font-bold">{required}</span>
                </div>
            </div>
            
            <p className="text-sm text-brand-text-primary mb-4 p-3 bg-brand-secondary rounded-md border border-brand-border/50">
                {proposal.description}
            </p>

            {/* Voting Progress */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">За: {approves}</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">Против: {rejects}</span>
                </div>
                <div className="w-full bg-brand-border rounded-full h-2 flex overflow-hidden">
                     {totalVotes > 0 ? (
                         <>
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(approves / totalVotes) * 100}%` }}></div>
                            <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(rejects / totalVotes) * 100}%` }}></div>
                         </>
                     ) : (
                         <div className="bg-brand-secondary w-full h-full"></div>
                     )}
                </div>
            </div>

            {/* Action Buttons */}
            {proposal.status === 'pending' && !alreadyVoted && (
                <div className="flex space-x-3 border-t border-brand-border pt-3">
                    <Button 
                        onClick={() => onVote(proposal.id, 'approve')} 
                        isLoading={processingId === proposal.id}
                        disabled={processingId !== null}
                        className="flex-1 !bg-emerald-600 hover:!bg-emerald-500 text-white border-emerald-700"
                        leftIcon={<CheckCircleIcon className="h-5 w-5"/>}
                    >
                        Утвердить
                    </Button>
                    <Button 
                        onClick={() => onVote(proposal.id, 'reject')} 
                        isLoading={processingId === proposal.id}
                        disabled={processingId !== null}
                        className="flex-1 !bg-red-600 hover:!bg-red-500 text-white border-red-700"
                        leftIcon={<XCircleIcon className="h-5 w-5"/>}
                    >
                        Отклонить
                    </Button>
                </div>
            )}
            
            {alreadyVoted && proposal.status === 'pending' && (
                <p className="text-sm text-brand-text-muted text-center italic border-t border-brand-border pt-2">
                    Ваш голос принят. Ожидание решения Совета.
                </p>
            )}

             {/* Execution Mark */}
             {proposal.status === 'approved' && proposal.executedAt && (
                <p className="text-xs text-emerald-500 text-center border-t border-brand-border pt-2 font-medium">
                    Исполнено системой: {new Date(proposal.executedAt).toLocaleString()}
                </p>
            )}

            {/* Voters List (Small) */}
            {proposal.votes.length > 0 && (
                <div className="mt-3 pt-2 border-t border-brand-border/50">
                     <p className="text-[10px] text-brand-text-muted mb-1 uppercase tracking-wider">Голоса:</p>
                     <div className="flex flex-wrap gap-1">
                         {proposal.votes.map((v, idx) => (
                             <Tooltip key={idx} text={`${v.decision === 'approve' ? 'За' : 'Против'} (${new Date(v.timestamp).toLocaleDateString()})`}>
                                 <span className={`px-1.5 py-0.5 text-[10px] rounded border ${v.decision === 'approve' ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800' : 'border-red-200 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'}`}>
                                     {v.userName}
                                 </span>
                             </Tooltip>
                         ))}
                     </div>
                </div>
            )}
        </Card>
    );
};

const CouncilPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [activeProposals, setActiveProposals] = useState<CouncilProposal[]>([]);
    const [historyProposals, setHistoryProposals] = useState<CouncilProposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [active, history] = await Promise.all([
                apiService.getProposals('active'),
                apiService.getProposals('history')
            ]);
            setActiveProposals(active);
            setHistoryProposals(history);
        } catch (err) {
            setError('Не удалось загрузить данные Совета.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVote = async (proposalId: string, decision: 'approve' | 'reject') => {
        setProcessingId(proposalId);
        try {
            await apiService.voteForProposal(proposalId, decision);
            await fetchData();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-brand-text-primary">Совет (Власть)</h1>
            </div>
            <div className="border-b border-brand-border mb-4">
                <nav className="-mb-px flex space-x-4">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'active' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border'}`}
                    >
                        Активные голосования ({activeProposals.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border'}`}
                    >
                        История ({historyProposals.length})
                    </button>
                </nav>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
            ) : error ? (
                <p className="text-red-500 text-center">{error}</p>
            ) : (
                <div>
                    {activeTab === 'active' ? (
                        activeProposals.length > 0 ? (
                            activeProposals.map(p => <ProposalCard key={p.id} proposal={p} currentUserId={currentUser?.id} onVote={handleVote} processingId={processingId} />)
                        ) : (
                            <p className="text-brand-text-muted text-center py-8">Нет активных голосований.</p>
                        )
                    ) : (
                         historyProposals.length > 0 ? (
                            historyProposals.map(p => <ProposalCard key={p.id} proposal={p} currentUserId={currentUser?.id} onVote={handleVote} processingId={processingId} />)
                        ) : (
                            <p className="text-brand-text-muted text-center py-8">История пуста.</p>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default CouncilPage;