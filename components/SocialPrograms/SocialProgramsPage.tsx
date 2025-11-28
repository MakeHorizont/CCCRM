import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SocialInitiative, SocialInitiativeStatus, User } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { HeartIcon, PlusCircleIcon, PencilIcon, UserGroupIcon, CheckCircleIcon, XMarkIcon, CircleStackIcon } from '../UI/Icons';
import { SOCIAL_INITIATIVE_STATUS_COLOR_MAP } from '../../constants';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import MarkdownEditor from '../KnowledgeBase/MarkdownEditor';
import MarkdownDisplay from '../UI/MarkdownDisplay';
import Tooltip from '../UI/Tooltip';
import { generateId } from '../../utils/idGenerators';
import ConfirmationModal from '../UI/ConfirmationModal';

const STATUS_LABELS: Record<SocialInitiativeStatus, string> = {
  proposal: 'Предложение',
  active: 'Активна',
  funded: 'Сбор средств завершен',
  completed: 'Завершена',
  rejected: 'Отклонена',
};

// Social Initiative Modal (for Create/View/Edit)
const SocialInitiativeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SocialInitiative>) => Promise<void>;
  onSupport: (initiative: SocialInitiative) => Promise<void>;
  onFund: (initiative: SocialInitiative) => Promise<void>; // New prop
  initiative: Partial<SocialInitiative> | null;
  isSaving: boolean;
  currentUser: User;
}> = ({ isOpen, onClose, onSave, onSupport, onFund, initiative, isSaving, currentUser }) => {
  const [data, setData] = useState<Partial<SocialInitiative>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [isFundConfirmOpen, setIsFundConfirmOpen] = useState(false);
  const [fundBalance, setFundBalance] = useState<number | null>(null);

  const isNew = !initiative?.id;
  const canEdit = isNew || (currentUser.role === 'ceo' || currentUser.id === initiative?.authorId);
  const userHasSupported = useMemo(() => initiative?.supporters?.some(s => s.userId === currentUser.id), [initiative, currentUser.id]);
  const canFund = currentUser.role === 'ceo' && (initiative?.status === 'proposal' || initiative?.status === 'active') && initiative.targetAmount && initiative.targetAmount > 0;
  const amountNeeded = (initiative?.targetAmount || 0) - (initiative?.currentAmount || 0);
  const hasSufficientFunds = fundBalance !== null && fundBalance >= amountNeeded;


  useEffect(() => {
    if (isOpen) {
      setData(initiative ? { ...initiative } : { title: '', description: '', status: 'proposal', targetAmount: 0 });
      setModalError(null);
      if (canFund) {
        setFundBalance(null); // Reset on open
        apiService.getCollectiveFund().then(fund => {
            setFundBalance(fund.balance);
        }).catch(() => {
            setModalError("Не удалось загрузить баланс Коллективного Фонда.");
        });
    }
    }
  }, [isOpen, initiative, canFund]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };
  
  const handleDescriptionChange = (markdown: string) => {
    setData(prev => ({ ...prev, description: markdown }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.title?.trim() || !data.description?.trim()) {
      setModalError("Название и описание обязательны.");
      return;
    }
    setModalError(null);
    try {
      await onSave(data);
    } catch (err) {
      setModalError((err as Error).message);
    }
  };

  const handleFund = async () => {
    if (!initiative) return;
    try {
        await onFund(initiative as SocialInitiative);
        setIsFundConfirmOpen(false);
    } catch (err) {
        setModalError((err as Error).message);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={isNew ? "Новая социальная инициатива" : data.title || ''} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] flex flex-col">
        {modalError && <p className="text-red-500 text-sm">{modalError}</p>}
        
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar-thin space-y-4">
          <Input id="title" name="title" label="Название *" value={data.title || ''} onChange={handleInputChange} required disabled={!canEdit || isSaving}/>
          
          <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-1">Описание (Markdown)</label>
            {canEdit ? (
                <div className="min-h-[250px] border border-brand-border rounded-md">
                    <MarkdownEditor initialValue={data.description || ''} onChange={handleDescriptionChange} height="250px"/>
                </div>
            ) : (
                <div className="p-2 bg-brand-surface rounded-md border border-brand-border min-h-[100px]">
                    <MarkdownDisplay markdown={data.description || 'Нет описания.'} />
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="targetAmount" name="targetAmount" label="Финансовая цель (₽)" type="number" value={String(data.targetAmount || '0')} onChange={handleInputChange} disabled={!canEdit || isSaving} />
            {canEdit && (
                <Input id="currentAmount" name="currentAmount" label="Собрано (₽)" type="number" value={String(data.currentAmount || '0')} onChange={handleInputChange} disabled={isSaving}/>
            )}
          </div>
          
          {canEdit && (
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-brand-text-primary mb-1">Статус</label>
                <select id="status" name="status" value={data.status || 'proposal'} onChange={handleInputChange} disabled={isSaving}
                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>
          )}
          
          {!isNew && (
            <div>
                <h4 className="text-sm font-semibold text-brand-text-secondary">Поддержали ({data.supporters?.length || 0}):</h4>
                <div className="flex flex-wrap gap-1 mt-1 text-xs">
                    {(data.supporters || []).length > 0 ? data.supporters?.map(s => (
                        <span key={s.userId} className="px-2 py-1 bg-brand-surface rounded-full">{s.userName}</span>
                    )) : <p className="text-xs text-brand-text-muted italic">Пока никто не поддержал.</p>}
                </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-brand-border flex-shrink-0 flex justify-between items-center">
            <div className="flex space-x-2">
                 {!isNew && (
                    <Button type="button" onClick={() => onSupport(initiative as SocialInitiative)} isLoading={isSaving} variant={userHasSupported ? 'secondary' : 'primary'}
                        leftIcon={userHasSupported ? <XMarkIcon className="h-5 w-5"/> : <HeartIcon className="h-5 w-5"/>}>
                        {userHasSupported ? 'Отменить поддержку' : 'Поддержать'}
                    </Button>
                )}
                {canFund && (
                    <Button type="button" onClick={() => setIsFundConfirmOpen(true)} isLoading={isSaving} variant="primary" className="!bg-emerald-600 hover:!bg-emerald-500" leftIcon={<CircleStackIcon className="h-5 w-5"/>}>
                        Финансировать
                    </Button>
                )}
            </div>
            <div className="flex space-x-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Закрыть</Button>
                {canEdit && <Button type="submit" isLoading={isSaving}>{isNew ? "Создать" : "Сохранить"}</Button>}
            </div>
        </div>
      </form>
    </Modal>
    {isFundConfirmOpen && initiative && (
        <ConfirmationModal
            isOpen={isFundConfirmOpen}
            onClose={() => setIsFundConfirmOpen(false)}
            onConfirm={handleFund}
            title="Подтвердить финансирование"
            message={
              <div>
                <p>Вы уверены, что хотите профинансировать инициативу <strong className="text-brand-text-primary">"{initiative.title}"</strong>?</p>
                <p>Требуемая сумма: <strong className="text-emerald-400">{amountNeeded.toLocaleString()} ₽</strong></p>
                <p>В фонде доступно: <strong className={hasSufficientFunds ? 'text-brand-text-primary' : 'text-red-400'}>{fundBalance !== null ? fundBalance.toLocaleString() + ' ₽' : <LoadingSpinner size="sm"/>}</strong></p>
                {!hasSufficientFunds && fundBalance !== null && (
                    <p className="mt-2 text-red-400 font-semibold">Недостаточно средств в Коллективном Фонде для выполнения операции.</p>
                )}
              </div>
            }
            confirmText="Да, финансировать"
            confirmButtonVariant="primary"
            isLoading={isSaving}
            isConfirmDisabled={!hasSufficientFunds}
        />
    )}
</>
  );
};


const SocialProgramsPage: React.FC = () => {
  const { user } = useAuth();
  const [initiatives, setInitiatives] = useState<SocialInitiative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInteractionLoading, setIsInteractionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState<Partial<SocialInitiative> | null>(null);

  const fetchInitiatives = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getSocialInitiatives();
      setInitiatives(data);
    } catch (err) {
      setError("Не удалось загрузить социальные инициативы.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  const handleOpenModal = (initiative?: SocialInitiative) => {
    setSelectedInitiative(initiative || null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInitiative(null);
  };

  const handleSave = async (data: Partial<SocialInitiative>) => {
    if (!user) return;
    setIsInteractionLoading(true);
    try {
        if (data.id) {
            await apiService.updateSocialInitiative(data as SocialInitiative);
        } else {
            const payload = { ...data, authorId: user.id, authorName: user.name || user.email };
            await apiService.addSocialInitiative(payload as any);
        }
        handleCloseModal();
        await fetchInitiatives();
    } catch (err) {
        throw err;
    } finally {
        setIsInteractionLoading(false);
    }
  };

  const handleSupport = async (initiative: SocialInitiative) => {
    if (!user) return;
    setIsInteractionLoading(true);
    try {
        const updated = await apiService.supportSocialInitiative(initiative.id, { id: user.id, name: user.name || user.email });
        setSelectedInitiative(updated); // Update modal view
        await fetchInitiatives(); // Refresh list view
    } catch (err) {
        // The modal will handle showing this error
        throw err;
    } finally {
        setIsInteractionLoading(false);
    }
  };

  const handleFundInitiative = async (initiative: SocialInitiative) => {
    if (!user) return;
    setIsInteractionLoading(true);
    try {
        const updated = await apiService.fundSocialInitiative(initiative.id, user.id);
        setSelectedInitiative(updated);
        await fetchInitiatives();
    } catch (err) {
        throw err;
    } finally {
        setIsInteractionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5"/>}>
          Предложить инициативу
        </Button>
      </div>

      {isLoading ? <LoadingSpinner/> : error ? <p className="text-red-500 text-center">{error}</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initiatives.map(initiative => (
                <Card key={initiative.id} onClick={() => handleOpenModal(initiative)} className="flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                           <h2 className="text-lg font-semibold text-brand-text-primary">{initiative.title}</h2>
                           <span className={`px-2 py-1 text-xs font-medium rounded-full ${SOCIAL_INITIATIVE_STATUS_COLOR_MAP[initiative.status]}`}>{STATUS_LABELS[initiative.status]}</span>
                        </div>
                        <p className="text-xs text-brand-text-muted">Автор: {initiative.authorName}</p>
                    </div>
                    <div className="mt-4">
                        {initiative.targetAmount && initiative.targetAmount > 0 ? (
                            <div>
                                <div className="flex justify-between text-xs text-brand-text-secondary mb-1">
                                    <span>Собрано: {initiative.currentAmount.toLocaleString()} ₽</span>
                                    <span>Цель: {initiative.targetAmount.toLocaleString()} ₽</span>
                                </div>
                                <div className="w-full bg-brand-surface rounded-full h-2.5">
                                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{width: `${(initiative.currentAmount / initiative.targetAmount) * 100}%`}}></div>
                                </div>
                            </div>
                        ) : <div className="h-[26px]"></div>}
                        <div className="flex items-center justify-between mt-2 text-sm text-brand-text-secondary">
                             <span className="flex items-center"><UserGroupIcon className="h-4 w-4 mr-1"/> {initiative.supporters.length}</span>
                             {initiative.supporters.some(s => s.userId === user?.id) && <Tooltip text="Вы поддержали"><CheckCircleIcon className="h-5 w-5 text-emerald-400"/></Tooltip>}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
      )}

      {isModalOpen && user && (
          <SocialInitiativeModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSave}
            onSupport={handleSupport}
            onFund={handleFundInitiative}
            initiative={selectedInitiative}
            isSaving={isInteractionLoading}
            currentUser={user}
          />
      )}
      <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
    </div>
  );
};

export default SocialProgramsPage;