import React, { useState, useEffect } from 'react';
import { SalaryHistoryEntry, User } from '../../../types';
import Modal from '../../UI/Modal';
import Button from '../../UI/Button';
import Input from '../../UI/Input';

interface AddSalaryChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newEntry: SalaryHistoryEntry) => void;
  isSaving: boolean;
  currentUser: User;
}

const AddSalaryChangeModal: React.FC<AddSalaryChangeModalProps> = ({ isOpen, onClose, onSave, isSaving, currentUser }) => {
  const [newEntry, setNewEntry] = useState<Partial<Omit<SalaryHistoryEntry, 'id' | 'changedBy'>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewEntry({
        changeDate: new Date().toISOString().split('T')[0],
        newDailyRate: 0,
        reason: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleSubmit = () => {
    if (!newEntry.changeDate || !newEntry.newDailyRate || newEntry.newDailyRate <= 0 || !newEntry.reason?.trim()) {
      setError("Пожалуйста, заполните все поля корректными значениями. Ставка должна быть больше нуля.");
      return;
    }
    const finalEntry: SalaryHistoryEntry = {
      id: `sh-${Date.now()}`,
      changeDate: newEntry.changeDate!,
      newDailyRate: newEntry.newDailyRate!,
      reason: newEntry.reason!,
      changedBy: {
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
      },
    };
    onSave(finalEntry);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить изменение оклада">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        {error && <p className="text-sm text-red-500 p-2 bg-red-500/10 rounded-md">{error}</p>}
        <Input
          id="changeDate"
          name="changeDate"
          type="date"
          label="Дата изменения *"
          value={newEntry.changeDate || ''}
          onChange={handleInputChange}
          required
        />
        <Input
          id="newDailyRate"
          name="newDailyRate"
          type="number"
          label="Новая ставка за день (₽) *"
          value={String(newEntry.newDailyRate || '')}
          onChange={handleInputChange}
          required
          min="1"
          step="0.01"
        />
        <Input
          id="reason"
          name="reason"
          type="text"
          label="Причина/основание *"
          value={newEntry.reason || ''}
          onChange={handleInputChange}
          required
          placeholder="Например: Повышение, годовой пересмотр"
        />
        <div className="pt-2 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
          <Button type="submit" isLoading={isSaving}>Сохранить</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSalaryChangeModal;