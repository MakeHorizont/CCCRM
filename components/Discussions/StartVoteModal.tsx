import React, { useState } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';

interface StartVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (proposal: string) => Promise<void>;
  isLoading: boolean;
}

const StartVoteModal: React.FC<StartVoteModalProps> = ({ isOpen, onClose, onStart, isLoading }) => {
  const [proposal, setProposal] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal.trim()) {
      setError("Текст предложения не может быть пустым.");
      return;
    }
    setError(null);
    await onStart(proposal);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Начать голосование">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-brand-text-secondary">
          Сформулируйте четкое предложение, которое будет вынесено на голосование.
          Например: "Принять новый регламент по учету рабочего времени с 01.08.2024".
        </p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <textarea
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          rows={4}
          className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm"
          placeholder="Текст предложения для голосования..."
          required
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!proposal.trim()}>
            Начать
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StartVoteModal;
