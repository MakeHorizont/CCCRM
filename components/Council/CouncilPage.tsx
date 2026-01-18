
import React, { useState, useEffect, useCallback } from 'react';
import { CouncilProposal, ProposalType } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { CheckCircleIcon, XCircleIcon, PlusCircleIcon, ScaleIcon, ExclamationCircleIcon, ServerIcon, ClockIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import Modal from '../UI/Modal';
import Input from '../UI/Input';

const ProposalCard: React.FC<{ proposal: CouncilProposal; currentUserId?: string; onVote: (id: string, decision: 'approve' | 'reject', comment?: string) => void; processingId: string | null }> = ({ proposal, currentUserId, onVote, processingId }) => {
    const [voteComment, setVoteComment] = useState('');
    const alreadyVoted = proposal.votes.some(v => v.userId === currentUserId);
    const approves = proposal.votes.filter(v => v.decision === 'approve').length;
    const rejects = proposal.votes.filter(v => v.decision === 'reject').length;
    const totalVotes = approves + rejects;
    const required = proposal.requiredApprovals;

    const getStatusStyle = () => {
        if (proposal.status === 'executed') return 'border-emerald-500 bg-emerald-500/5';
        if (proposal.status === 'approved') return 'border-emerald-400';
        if (proposal.status === 'rejected') return 'border-red-500 bg-red-500/5';
        return 'border-sky-500';
    };

    const getStatusLabel = () => {
        if (proposal.status === 'executed') return 'Исполнено системой';
        if (proposal.status === 'approved') return 'Принято';
        if (proposal.status === 'rejected') return 'Отклонено';
        return 'На голосовании';
    };

    return (
        <Card className={`mb-4 border-l-4 shadow-sm transition-all ${getStatusStyle()}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-brand-text-primary truncate">{proposal.title}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-tighter ${
                            proposal.status === 'executed' ? 'bg-emerald-600 text-white' : 
                            proposal.status === 'pending' ? 'bg-sky-100 text-sky-800' : 'bg-zinc-200 text-zinc-700'
                        }`}>
                            {getStatusLabel()}
                        </span>
                    </div>
                    <p className="text-[10px] text-brand-text-muted mt-1 uppercase font-bold tracking-widest">
                        Инициатор: {proposal.initiatorName} • {new Date(proposal.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-xs text-brand-text-secondary font-mono flex items-center">
                        Кворум: <span className="font-bold ml-1">{approves}/{required}</span>
                    </div>
                    {proposal.executedAt && (
                        <div className="text-[9px] text-emerald-600 font-bold mt-1 flex items-center">
                            <ServerIcon className="h-3 w-3 mr-1"/>
                            {new Date(proposal.executedAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-sm text-brand-text-primary mb-4 p-3 bg-brand-surface rounded-md border border-brand-border/50 whitespace-pre-wrap leading-relaxed">
                {proposal.description}
            </p>

            <div className="mb-4">
                <div className="flex justify-between text-[10px] mb-1 font-black uppercase tracking-tighter">
                    <span className="text-emerald-600">За: {approves}</span>
                    <span className="text-red-600">Против: {rejects}</span>
                </div>
                <div className="w-full bg-brand-border rounded-full h-1.5 flex overflow-hidden shadow-inner">
                     {totalVotes > 0 ? (
                         <>
                            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${(approves / Math.max(approves+rejects, required)) * 100}%` }}></div>
                            <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${(rejects / Math.max(approves+rejects, required)) * 100}%` }}></div>
                         </>
                     ) : (
                         <div className="bg-brand-secondary w-full h-full opacity-30"></div>
                     )}
                </div>
            </div>

            {proposal.status === 'pending' && !alreadyVoted && (
                <div className="space-y-3 border-t border-brand-border pt-4">
                    <textarea 
                        value={voteComment}
                        onChange={e => setVoteComment(e.target.value)}
                        placeholder="Ваш комментарий к решению..."
                        className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-xs focus:ring-1 focus:ring-brand-primary"
                        rows={2}
                    />
                    <div className="flex space-x-3">
                        <Button onClick={() => onVote(proposal.id, 'approve', voteComment)} isLoading={processingId === proposal.id} disabled={processingId !== null} className="flex-1 !bg-emerald-600 text-white" leftIcon={<CheckCircleIcon className="h-5 w-5"/>}>Утвердить</Button>
                        <Button onClick={() => onVote(proposal.id, 'reject', voteComment)} isLoading={processingId === proposal.id} disabled={processingId !== null} className="flex-1 !bg-red-600 text-white" leftIcon={<XCircleIcon className="h-5 w-5"/>}>Отклонить</Button>
                    </div>
                </div>
            )}
            
            {proposal.votes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-border/50">
                    <p className="text-[10px] text-brand-text-muted mb-2 uppercase font-black tracking-widest">Журнал голосования:</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar-thin">
                        {proposal.votes.map((v, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-brand-surface/50 rounded border border-brand-border/30">
                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${v.decision === 'approve' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                <div className="flex-grow">
                                    <span className="font-bold text-brand-text-primary">{v.userName}</span>
                                    {v.comment && <span className="text-brand-text-secondary ml-1 italic">«{v.comment}»</span>}
                                    <span className="text-[9px] text-brand-text-muted ml-2">{new Date(v.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
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
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // New Proposal Form
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [active, history] = await Promise.all([
                apiService.getProposals('active'),
                apiService.getProposals('history')
            ]);
            setActiveProposals(active);
            setHistoryProposals(history);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleVote = async (proposalId: string, decision: 'approve' | 'reject', comment?: string) => {
        setProcessingId(proposalId);
        try {
            await apiService.voteForProposal(proposalId, decision, comment);
            await fetchData();
        } catch (err) { alert(err); } finally { setProcessingId(null); }
    };

    const handleCreateProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await apiService.createProposal('general_decision', newTitle, newDesc, {});
            setIsCreateModalOpen(false);
            setNewTitle(''); setNewDesc('');
            await fetchData();
        } catch(e) { alert("Ошибка при создании предложения"); } finally { setIsLoading(false); }
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                    <ScaleIcon className="h-8 w-8 mr-3 text-brand-primary"/> Совет (Власть)
                </h1>
                <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5"/>}>Новое решение</Button>
            </div>
            
            <div className="border-b border-brand-border">
                <nav className="-mb-px flex space-x-4">
                    <button onClick={() => setActiveTab('active')} className={`py-2 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === 'active' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'}`}>Активные ({activeProposals.length})</button>
                    <button onClick={() => setActiveTab('history')} className={`py-2 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'}`}>Архив решений</button>
                </nav>
            </div>

            {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : (
                <div className="grid grid-cols-1 gap-2">
                    {(activeTab === 'active' ? activeProposals : historyProposals).map(p => <ProposalCard key={p.id} proposal={p} currentUserId={currentUser?.id} onVote={handleVote} processingId={processingId} />)}
                    {(activeTab === 'active' ? activeProposals : historyProposals).length === 0 && (
                        <div className="text-center py-20 bg-brand-surface rounded-xl border border-dashed border-brand-border">
                            <ExclamationCircleIcon className="h-12 w-12 mx-auto mb-4 text-brand-text-muted opacity-30"/>
                            <p className="text-brand-text-muted font-medium italic">Повестка дня пуста. Коллектив работает в штатном режиме.</p>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Вынести вопрос на Совет">
                <form onSubmit={handleCreateProposal} className="space-y-4">
                    <Input id="prop-title" label="Тема/Суть решения *" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="Например: Изменение графика смен в цеху" />
                    <div>
                        <label className="block text-sm font-medium mb-1 text-brand-text-primary">Обоснование и детали *</label>
                        <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={5} className="w-full bg-brand-card border border-brand-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-primary" required placeholder="Опишите, какую проблему решает данное предложение..."/>
                    </div>
                    <div className="p-3 bg-brand-surface rounded border border-brand-border text-[11px] text-brand-text-muted flex items-start">
                        <ClockIcon className="h-4 w-4 mr-2 text-sky-400 mt-0.5 flex-shrink-0"/>
                        <span>Ваше предложение будет опубликовано от вашего имени. Для принятия требуется кворум голосов (2/3). В случае утверждения системных параметров, они будут применены автоматически.</span>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Отмена</Button>
                        <Button type="submit" isLoading={isLoading}>Опубликовать</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CouncilPage;
