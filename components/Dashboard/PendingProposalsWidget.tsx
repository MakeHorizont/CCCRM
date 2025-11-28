
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../UI/Card';
import { ScaleIcon, ChevronRightIcon, ExclamationCircleIcon } from '../UI/Icons';
import { apiService } from '../../services/apiService';
import { CouncilProposal } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { ROUTE_PATHS } from '../../constants';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';

const PendingProposalsWidget: React.FC = () => {
    const { user } = useAuth();
    const [pendingProposals, setPendingProposals] = useState<CouncilProposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProposals = async () => {
            if (!user) return;
            try {
                // Fetch active proposals
                const activeProps = await apiService.getProposals('active');
                // Filter those where user hasn't voted yet
                const myPending = activeProps.filter(p => 
                    !p.votes.some(v => v.userId === user.id)
                );
                setPendingProposals(myPending);
            } catch (e) {
                console.error("Failed to fetch proposals", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProposals();
    }, [user]);

    if (isLoading) return <Card className="h-full flex items-center justify-center"><LoadingSpinner/></Card>;

    if (pendingProposals.length === 0) return null; // Don't show if nothing to vote on

    return (
        <Card className="h-full border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10 flex flex-col">
            <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200 flex items-center">
                    <ScaleIcon className="h-6 w-6 mr-2"/>
                    Требуется решение Совета
                </h2>
                <span className="bg-amber-200 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
                    {pendingProposals.length}
                </span>
            </div>
            
            <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar-thin pr-1">
                {pendingProposals.map(prop => (
                    <div key={prop.id} className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-amber-200 dark:border-amber-800/30">
                        <div className="flex items-start gap-2">
                            <ExclamationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5"/>
                            <div>
                                <p className="text-sm font-medium text-brand-text-primary leading-tight">{prop.title}</p>
                                <p className="text-xs text-brand-text-muted mt-1">Инициатор: {prop.initiatorName}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 pt-2 border-t border-amber-200 dark:border-amber-800/30">
                 <Link to={ROUTE_PATHS.COUNCIL}>
                    <Button fullWidth variant="primary" className="bg-amber-600 hover:bg-amber-500 text-white border-none" rightIcon={<ChevronRightIcon className="h-4 w-4"/>}>
                        Перейти к голосованию
                    </Button>
                 </Link>
            </div>
        </Card>
    );
};

export default PendingProposalsWidget;
