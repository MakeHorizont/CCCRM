import React, { useState, useEffect, ChangeEvent } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { RotationScheduleEntry, RotationArea, User } from '../../types';
import ConfirmationModal from '../UI/ConfirmationModal';
import { TrashIcon } from '../UI/Icons';

const ROTATION_AREAS: RotationArea[] = ['Производство', 'Коммуникации', 'Стратегия', 'Администрирование'];

interface RotationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RotationScheduleEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  scheduleData: Partial<RotationScheduleEntry> | null;
  isSaving: boolean;
  users: User[];
}

const RotationScheduleModal: React.FC<RotationScheduleModalProps> = ({
  isOpen, onClose, onSave, onDelete, scheduleData, isSaving, users
}) => {
  const [data, setData] = useState<Partial<RotationScheduleEntry>>({});
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setData(scheduleData || { userId: null, area: ROTATION_AREAS[0], startDate: new Date().toISOString().split('T')[0] });
      setError(null);
    }
  }, [isOpen, scheduleData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.area || !data.startDate || !data.endDate) {
      setError("Все поля, кроме сотрудника, обязательны.");
      return;
    }
    if (new Date(data.startDate) > new Date(data.endDate)) {
      setError("Дата начала не может быть позже даты окончания.");
      return;
    }
    setError(null);
    try {
      await onSave(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={data.id ? "Редактировать ротацию" : "Запланировать ротацию"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <div>
            <label htmlFor="userId" className="block text-sm font-medium mb-1">Сотрудник</label>
            <select id="userId" name="userId" value={data.userId || ''} onChange={handleInputChange} required className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
              <option value="">Не назначено</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="area" className="block text-sm font-medium mb-1">Сфера деятельности</label>
            <select id="area" name="area" value={data.area || ''} onChange={handleInputChange} required className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5">
              {ROTATION_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="startDate" name="startDate" type="date" label="Дата начала" value={data.startDate || ''} onChange={handleInputChange} required />
            <Input id="endDate" name="endDate" type="date" label="Дата окончания" value={data.endDate || ''} onChange={handleInputChange} required />
          </div>

          <div className="flex justify-between items-center pt-3">
             <div>
                {data.id && (
                    <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isSaving} leftIcon={<TrashIcon className="h-4 w-4"/>}>
                        Удалить
                    </Button>
                )}
             </div>
             <div className="flex space-x-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                <Button type="submit" isLoading={isSaving}>{data.id ? "Сохранить" : "Создать"}</Button>
             </div>
          </div>
        </form>
      </Modal>
      {isDeleteConfirmOpen && data.id && (
        <ConfirmationModal
            isOpen={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={() => onDelete(data.id!)}
            title="Удалить запись о ротации?"
            message="Вы уверены, что хотите удалить эту запись из графика?"
            confirmText="Да, удалить"
            isLoading={isSaving}
        />
      )}
    </>
  );
};

export default RotationScheduleModal;
