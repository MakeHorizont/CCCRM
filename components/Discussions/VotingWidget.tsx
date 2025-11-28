import React, { useState, useMemo } from 'react';
import { DiscussionTopic, User, Vote } from '../../types';
import Button from '../UI/Button';
import { CheckCircleIcon, FlagIcon, LockClosedIcon, UserGroupIcon, XCircleIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

interface VotingWidgetProps {
  topic: DiscussionTopic;
  currentUser: User | null;
  onVote: (vote: 'for' | 'against', argument: string) => Promise<void>;
  onCloseVote: () => Promise<void>;
}

const VotingWidget: React.FC<VotingWidgetProps> = ({ topic, currentUser, onVote, onCloseVote }) => {
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | null>(null);
  const [argument, setArgument] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userVote = useMemo(() => {
    return topic.voting?.votes.find(v => v.userId === currentUser?.id);
  }, [topic.voting, currentUser]);

  const canVote = !userVote && topic.status === 'voting';
  const canCloseVote = currentUser && (topic.authorId === currentUser.id || currentUser.role === 'ceo') && topic.status === 'voting';

  const votesFor = topic.voting?.votes.filter(v => v.vote === 'for').length || 0;
  const votesAgainst = topic.voting?.votes.filter(v => v.vote === 'against').length || 0;
  const totalVotes = votesFor + votesAgainst;

  const handleSubmitVote = async () => {
    if (!selectedVote) return;
    setIsSubmitting(true);
    await onVote(selectedVote, argument);
    setIsSubmitting(false);
  };
  
  if (!topic.voting) return null;

  return (
    <div className="p-4 bg-brand-surface border border-sky-600/50 rounded-lg space-y-4">
      <h4 className="text-lg font-semibold text-sky-300 flex items-center">
        <FlagIcon className="h-5 w-5 mr-2"/> Голосование
      </h4>
      <p className="text-brand-text-primary bg-brand-card p-2 rounded-md">{topic.voting.proposal}</p>
      
      {/* Vote Casting UI */}
      {canVote && (
        <div className="space-y-3">
          <div className="flex space-x-3">
            <Button
              onClick={() => setSelectedVote('for')}
              variant={selectedVote === 'for' ? 'primary' : 'secondary'}
              className={`flex-1 ${selectedVote === 'for' ? '!bg-emerald-600' : ''}`}
              leftIcon={<CheckCircleIcon className="h-5 w-5"/>}
            >
              За
            </Button>
            <Button
              onClick={() => setSelectedVote('against')}
              variant={selectedVote === 'against' ? 'primary' : 'secondary'}
              className={`flex-1 ${selectedVote === 'against' ? '!bg-red-600' : ''}`}
              leftIcon={<XCircleIcon className="h-5 w-5"/>}
            >
              Против
            </Button>
          </div>
          <textarea
            value={argument}
            onChange={(e) => setArgument(e.target.value)}
            placeholder="Ваша аргументация (опционально)..."
            rows={2}
            className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm"
          />
          <div className="flex justify-end">
             <Button onClick={handleSubmitVote} disabled={!selectedVote} isLoading={isSubmitting}>Проголосовать</Button>
          </div>
        </div>
      )}
      
      {/* Voted Display */}
      {userVote && (
         <div className={`p-2 rounded text-center text-sm font-medium ${userVote.vote === 'for' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'}`}>
            Вы проголосовали: <strong>{userVote.vote === 'for' ? 'За' : 'Против'}</strong>
         </div>
      )}

      {/* Results and Arguments */}
      <div>
        <h5 className="text-md font-semibold text-brand-text-secondary mb-2 flex items-center"><UserGroupIcon className="h-4 w-4 mr-1"/> Результаты ({totalVotes} голосов)</h5>
        <div className="flex items-center space-x-4">
            <div className="text-emerald-400">За: <strong>{votesFor}</strong></div>
            <div className="text-red-400">Против: <strong>{votesAgainst}</strong></div>
        </div>
        {totalVotes > 0 && (
             <div className="w-full bg-brand-card rounded-full h-2.5 mt-2">
                <Tooltip text={`За: ${votesFor}, Против: ${votesAgainst}`}>
                    <div className="bg-emerald-600 h-2.5 rounded-l-full" style={{ width: `${(votesFor / totalVotes) * 100}%`, float: 'left' }}></div>
                </Tooltip>
                 <Tooltip text={`За: ${votesFor}, Против: ${votesAgainst}`}>
                    <div className="bg-red-600 h-2.5 rounded-r-full" style={{ width: `${(votesAgainst / totalVotes) * 100}%`, float: 'left' }}></div>
                 </Tooltip>
            </div>
        )}

        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto custom-scrollbar-thin pr-2">
            {topic.voting.votes.map(v => (
                <div key={v.userId} className={`p-2 rounded-md border-l-2 ${v.vote === 'for' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                    <p className="text-xs"><strong>{v.userName}</strong> проголосовал(а) <strong>{v.vote === 'for' ? 'За' : 'Против'}</strong>:</p>
                    {v.argument && <p className="text-sm italic mt-1 pl-2 border-l border-current/30 text-brand-text-secondary">{v.argument}</p>}
                </div>
            ))}
        </div>
      </div>

      {/* Close Vote Button */}
      {canCloseVote && (
        <div className="border-t border-brand-border pt-3 flex justify-end">
            <Button variant="danger" size="sm" onClick={onCloseVote} isLoading={isSubmitting} leftIcon={<LockClosedIcon className="h-4 w-4"/>}>
                Завершить голосование
            </Button>
        </div>
      )}
      <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
    </div>
  );
};

export default VotingWidget;