import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HouseholdItem, HouseholdCategory } from '../../types';
import { apiService } from '../../services/apiService';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import { ArrowLeftIcon, PencilSquareIcon, SaveIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon } from '../UI/Icons';
import { HOUSEHOLD_CATEGORIES, ROUTE_PATHS } from '../../constants';

type EditorMode = 'view' | 'edit';

const HouseholdItemEditorPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const isNew = !itemId;

  const [item, setItem] = useState<Partial<HouseholdItem>>({});
  const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setIsLoading(true);
      if (isNew) {
        setItem({ name: '', category: HOUSEHOLD_CATEGORIES[0], quantity: 0, price: 0, unit: 'шт', notes: '', lowStockThreshold: 0 });
        setMode('edit');
      } else {
        try {
          const allItems = await apiService.getHouseholdItems({ viewMode: 'all' });
          const foundItem = allItems.find(i => i.id === itemId);
          if (foundItem) {
            setItem(foundItem);
          } else {
            setError("Позиция не найдена.");
          }
        } catch (err) {
          setError("Ошибка загрузки данных.");
        }
      }
      setIsLoading(false);
    };
    fetchItem();
  }, [itemId, isNew]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val: string | number | undefined = value;
    if (type === 'number') {
        const parsed = parseFloat(value);
        val = isNaN(parsed) ? undefined : parsed;
    }
    setItem(prev => ({ ...prev, [name]: val }));
  };

  const handleConfirmSave = async () => {
    if (!item.name || !item.category || item.quantity === undefined || !item.unit || item.price === undefined) {
      setError("Все поля (кроме заметок) обязательны.");
      setIsSaveConfirmOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      if (item.id) {
        await apiService.updateHouseholdItem(item as HouseholdItem);
      } else {
        await apiService.addHouseholdItem(item as any);
      }
      navigate(ROUTE_PATHS.HOUSEHOLD_ACCOUNTING);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
      setIsSaveConfirmOpen(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!item.id) return;
    setIsSaving(true);
    await apiService.archiveHouseholdItem(item.id, !item.isArchived);
    navigate(ROUTE_PATHS.HOUSEHOLD_ACCOUNTING);
  };
  
  const handleDelete = async () => {
    if (!item.id) return;
    setIsSaving(true);
    await apiService.deleteHouseholdItem(item.id);
    navigate(ROUTE_PATHS.HOUSEHOLD_ACCOUNTING);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error && !item.id) return <p className="text-red-500">{error}</p>;
  if (!item) return null;

  const pageTitle = isNew ? 'Новая позиция' : mode === 'edit' ? `Редактирование: ${item.name}` : `Просмотр: ${item.name}`;
  const isFormDisabled = mode === 'view' || isSaving;

  return (
    <div className="space-y-4">
      <Button onClick={() => navigate(ROUTE_PATHS.HOUSEHOLD_ACCOUNTING)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
        К списку хоз. учёта
      </Button>
      <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold">{pageTitle}</h1>
             <div className="flex space-x-2">
                {mode === 'view' && !item.isArchived && (
                    <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                )}
                {mode === 'edit' && (
                     <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                )}
            </div>
        </div>
        
        <Card>
            <div className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input id="name" name="name" label="Название *" value={item.name || ''} onChange={handleInputChange} required disabled={isFormDisabled}/>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-brand-text-primary mb-1">Категория *</label>
                    <select id="category" name="category" value={item.category || ''} onChange={handleInputChange} required disabled={isFormDisabled}
                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                    {HOUSEHOLD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input id="quantity" name="quantity" label="Количество *" type="number" step="0.001" value={String(item.quantity ?? '')} onChange={handleInputChange} required disabled={isFormDisabled}/>
                    <Input id="unit" name="unit" label="Ед. изм. *" value={item.unit || ''} onChange={handleInputChange} required disabled={isFormDisabled}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input id="price" name="price" label="Цена за ед. (₽) *" type="number" step="0.01" value={String(item.price ?? '')} onChange={handleInputChange} required disabled={isFormDisabled}/>
                    <Input id="lowStockThreshold" name="lowStockThreshold" label="Порог низкого остатка" type="number" value={String(item.lowStockThreshold ?? '')} onChange={handleInputChange} disabled={isFormDisabled}/>
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-brand-text-primary mb-1">Заметки</label>
                    <textarea id="notes" name="notes" rows={3} value={item.notes || ''} onChange={handleInputChange} disabled={isFormDisabled}
                    className="block w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg placeholder-brand-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary sm:text-sm text-brand-text-primary"/>
                </div>
            </div>
        </Card>
        <div className="flex space-x-2 mt-4">
            {item.id && mode === 'view' && !item.isArchived && (
                <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
            )}
            {item.id && item.isArchived && (
                    <>
                    <Button type="button" variant="secondary" onClick={() => handleArchiveToggle()} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                    <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                </>
            )}
        </div>
      </form>

      {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения?" confirmText="Сохранить" isLoading={isSaving}/>}
      {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать?" message="Вы уверены?" confirmText="Да, архивировать" confirmButtonVariant="danger" isLoading={isSaving}/>}
      {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить?" message="Это действие необратимо." confirmText="Удалить" confirmButtonVariant="danger" isLoading={isSaving}/>}
    </div>
  );
};

export default HouseholdItemEditorPage;