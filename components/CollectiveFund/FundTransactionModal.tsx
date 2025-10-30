import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { FundTransaction } from '../../types';

interface FundTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<FundTransaction, 'id'>) => Promise<void>;
}

const FundTransactionModal: React.FC<FundTransactionModalProps> = ({ isOpen, onClose, onSave }) => {
  const [transaction, setTransaction] = useState<Partial<Omit<FundTransaction, 'id'>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        amount: 0,
        description: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setTransaction(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction.date || !transaction.type || !transaction.amount || transaction.amount <= 0 || !transaction.description?.trim()) {
      setError("Все поля обязательны, сумма должна быть больше нуля.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(transaction as Omit<FundTransaction, 'id'>);
    } catch (err) {
      setError((err as Error).message || "Ошибка сохранения транзакции.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новая транзакция фонда">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Input id="tx-date" name="date" type="date" label="Дата *" value={transaction.date || ''} onChange={handleInputChange} required />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tx-type" className="block text-sm font-medium text-brand-text-primary mb-1">Тип *</label>
            <select id="tx-type" name="type" value={transaction.type || 'expense'} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
              <option value="expense">Расход</option>
              <option value="contribution">Поступление</option>
            </select>
          </div>
          <Input id="tx-amount" name="amount" type="number" label="Сумма (₽) *" value={String(transaction.amount || '')} onChange={handleInputChange} required min="0.01" step="0.01" />
        </div>
        <Input id="tx-description" name="description" label="Описание *" value={transaction.description || ''} onChange={handleInputChange} required />

        <div className="pt-2 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
          <Button type="submit" isLoading={isSaving}>Сохранить</Button>
        </div>
      </form>
    </Modal>
  );
};

export default FundTransactionModal;