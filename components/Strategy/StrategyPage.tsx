import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../UI/Card';
import { StrategicPlan, StrategicSubTask, User } from '../../types';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import ConfirmationModal from '../UI/ConfirmationModal';
import { useAuth } from '../../hooks/useAuth';
import {
    PlusCircleIcon, ClipboardDocumentListIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, ViewArchiveIcon
} from '../UI/Icons';
import { STRATEGY_STATUS_COLOR_MAP, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import SubTaskModal from './SubTaskModal';

type ViewMode = 'active' | 'archived';

const StrategyPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<StrategicPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<StrategicPlan | null>(null);

  const fetchPlansAndAssignableUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansData, assignableUsersData] = await Promise.all([
        apiService.getStrategicPlans({ viewMode }),
        currentUser ? apiService.getUsersForAssignee(currentUser.id) : Promise.resolve([])
      ]);
      setPlans(plansData);
      setUsersForAssigning(assignableUsersData);
    } catch (err) {
      setError(`Не удалось загрузить данные (${viewMode === 'active' ? 'активные планы' : 'архив планов'}).`);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, currentUser]);

  useEffect(() => {
    fetchPlansAndAssignableUsers();
  }, [fetchPlansAndAssignableUsers]);

  const handleCreatePlan = async () => {
      // For now, let's assume creating a plan goes to a dedicated page too
      // or uses a simple name prompt then navigates.
      // For simplicity, we'll create a placeholder and navigate.
      if (!currentUser) return;
      setIsSaving(true);
      try {
          const newPlan = await apiService.addStrategicPlan({
              title: 'Новый стратегический план',
              description: 'Опишите главную цель этого плана...',
              status: 'Планируется',
              owner: currentUser.name || currentUser.email || '',
              timeline: `${new Date().getFullYear()}`
          });
          navigate(`${ROUTE_PATHS.STRATEGY}/${newPlan.id}`);
      } catch (err) {
          setError('Не удалось создать новый план.');
      } finally {
          setIsSaving(false);
      }
  };
  
  const handleArchiveTogglePlan = async (plan: StrategicPlan) => {
    setIsSaving(true);
    try {
      await apiService.archiveStrategicPlan(plan.id, !plan.isArchived);
      await fetchPlansAndAssignableUsers();
    } catch (err) { setError('Ошибка архивации/восстановления плана.');
    } finally { setIsSaving(false); }
  };

  const handleDeletePlanInitiate = (plan: StrategicPlan) => {
    if (plan.isArchived) { setPlanToDelete(plan); setIsDeleteConfirmOpen(true); }
  };

  const handleDeletePlanConfirm = async () => {
    if (!planToDelete) return;
    setIsSaving(true);
    try {
      await apiService.deleteStrategicPlan(planToDelete.id);
      setIsDeleteConfirmOpen(false); setPlanToDelete(null);
      await fetchPlansAndAssignableUsers();
    } catch (err) { setError((err as Error).message || 'Ошибка удаления плана.');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary">
            {viewMode === 'active' ? 'Стратегические планы' : 'Архив планов'}
        </h1>
        <div className="flex space-x-3">
            <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}>
                {viewMode === 'active' ? 'Перейти в архив' : 'Активные планы'}
            </Button>
            {viewMode === 'active' && (
                <Button onClick={handleCreatePlan} isLoading={isSaving} leftIcon={<PlusCircleIcon className="h-5 w-5 mr-2"/>}>Создать план</Button>
            )}
        </div>
      </div>

      {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 text-center p-4">{error}</p>}

      {!isLoading && !error && (
        plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`border-l-4 ${STRATEGY_STATUS_COLOR_MAP[plan.status] || STRATEGY_STATUS_COLOR_MAP.default}`}>
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold text-brand-text-primary mb-2 flex-grow">{plan.title}</h2>
                    <div className="flex space-x-1">
                        <Tooltip text={plan.isArchived ? "Восстановить" : "Архивировать"}><Button variant="ghost" size="sm" onClick={() => handleArchiveTogglePlan(plan)} className="p-1">{plan.isArchived ? <ArrowUturnLeftIcon className="h-5 w-5"/> : <ArchiveBoxArrowDownIcon className="h-5 w-5"/>}</Button></Tooltip>
                    </div>
                </div>
                <p className="text-sm text-brand-text-secondary mb-3 h-20 overflow-y-auto custom-scrollbar-thin">{plan.description}</p>
                <div className="text-xs text-brand-text-muted space-y-1">
                  <p><strong>Статус:</strong> <span className={`px-2 py-0.5 rounded-full text-xs ${STRATEGY_STATUS_COLOR_MAP[plan.status].replace('border-l-4', '')}`}>{plan.status}</span></p>
                  <p><strong>Ответственный:</strong> {plan.owner}</p>
                  <p><strong>Сроки:</strong> {plan.timeline}</p>
                  <p><strong>Подзадачи:</strong> {plan.subTasks.length} ({plan.subTasks.filter(st => st.completed).length} выполнено)</p>
                </div>
                <div className="mt-4 flex justify-end">
                   <Button variant="secondary" size="sm" onClick={() => navigate(`${ROUTE_PATHS.STRATEGY}/${plan.id}`)}>Подробнее</Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-8">
            <ClipboardDocumentListIcon className="h-16 w-16 mx-auto mb-4 text-brand-text-muted" />
            <h2 className="text-xl font-semibold text-brand-text-primary mb-2">{viewMode === 'active' ? 'Активные планы отсутствуют' : 'Архив планов пуст'}</h2>
            {viewMode === 'active' && <p className="text-brand-text-secondary">Начните с создания нового стратегического плана.</p>}
          </Card>
        )
      )}

    {isDeleteConfirmOpen && planToDelete && (<ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDeletePlanConfirm} title="Подтверждение удаления плана" message={<p>Вы уверены, что хотите окончательно удалить план <strong className="text-brand-text-primary">{planToDelete.title}</strong> и все его подзадачи? Это действие необратимо.</p>} confirmText="Удалить" isLoading={isSaving}/>)}

       <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
    </div>
  );
};

export default StrategyPage;