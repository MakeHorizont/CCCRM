import React, { useState, useEffect } from 'react';
import { PerformanceReview, User, KanbanTask, UserAchievement } from '../../../types';
import Modal from '../../UI/Modal';
import Button from '../../UI/Button';
import Input from '../../UI/Input';
import { PERFORMANCE_RATING_STYLES } from '../../../constants';
import { apiService } from '../../../services/apiService';
import { SparklesIcon } from '../../UI/Icons';
import LoadingSpinner from '../../UI/LoadingSpinner';

interface AddReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newReview: PerformanceReview) => void;
  isSaving: boolean;
  managers: User[];
  currentUserId: string;
  reviewedUser: User;
  userTasks: KanbanTask[];
  userAchievements: UserAchievement[];
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({ isOpen, onClose, onSave, isSaving, managers, currentUserId, reviewedUser, userTasks, userAchievements }) => {
  const [newReview, setNewReview] = useState<Partial<PerformanceReview>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewReview({
        reviewDate: new Date().toISOString().split('T')[0],
        reviewerId: currentUserId,
        overallRating: 'meets_expectations',
        strengths: '',
        areasForImprovement: '',
        goalsForNextPeriod: '',
        employeeFeedback: '',
      });
      setError(null);
    }
  }, [isOpen, currentUserId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewReview(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const completedTasksSummary = userTasks
        .filter(t => t.status === 'Готово')
        .map(t => `- ${t.title} (Коэфф: ${t.coefficient || 'N/A'})`)
        .join('\n');
      
      const achievementsSummary = userAchievements
        .map(a => `- ${a.name}: ${a.description}`)
        .join('\n');

      const context = {
        userName: reviewedUser.name || reviewedUser.email,
        userRole: reviewedUser.functionalRoles?.join(', ') || reviewedUser.role || 'сотрудник',
        completedTasks: completedTasksSummary || "Нет выполненных задач для анализа.",
        positiveFeedback: achievementsSummary || "Нет зафиксированных достижений.",
        challenges: "", // This could be pre-filled from another source in the future
        collectiveGoals: "Увеличение выпуска продукции, повышение качества, снижение издержек." // Example goal
      };

      const draft = await apiService.generatePerformanceReviewDraft(context);
      
      setNewReview(prev => ({
        ...prev,
        strengths: draft.strengths,
        areasForImprovement: draft.areasForImprovement,
        goalsForNextPeriod: draft.goalsForNextPeriod,
      }));

    } catch (err) {
      setError(`Ошибка генерации черновика: ${(err as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (!newReview.reviewDate || !newReview.reviewerId || !newReview.strengths?.trim() || !newReview.areasForImprovement?.trim() || !newReview.goalsForNextPeriod?.trim()) {
      setError("Пожалуйста, заполните все обязательные поля (дата, ревьюер, сильные стороны, зоны роста, цели).");
      return;
    }
    const reviewer = managers.find(m => m.id === newReview.reviewerId);
    if (!reviewer) {
        setError("Выбранный ревьюер не найден.");
        return;
    }
    const finalReview: PerformanceReview = {
        id: `pr-${Date.now()}`,
        reviewDate: newReview.reviewDate!,
        reviewerId: newReview.reviewerId!,
        reviewerName: reviewer.name || reviewer.email,
        overallRating: newReview.overallRating || 'meets_expectations',
        strengths: newReview.strengths!,
        areasForImprovement: newReview.areasForImprovement!,
        goalsForNextPeriod: newReview.goalsForNextPeriod!,
        employeeFeedback: newReview.employeeFeedback || null,
    };
    onSave(finalReview);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Новое ревью для: ${reviewedUser.name}`} size="xl">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar-thin">
        {error && <p className="text-sm text-red-500 p-2 bg-red-500/10 rounded-md">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="reviewDate" name="reviewDate" type="date" label="Дата ревью *" value={newReview.reviewDate || ''} onChange={handleInputChange} />
          <div>
            <label htmlFor="reviewerId" className="block text-sm font-medium text-brand-text-primary mb-1">Ревьюер *</label>
            <select id="reviewerId" name="reviewerId" value={newReview.reviewerId || ''} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
              {managers.map(m => <option key={m.id} value={m.id}>{m.name || m.email}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="overallRating" className="block text-sm font-medium text-brand-text-primary mb-1">Общая оценка *</label>
          <select id="overallRating" name="overallRating" value={newReview.overallRating || 'meets_expectations'} onChange={handleInputChange} className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500">
            {Object.entries(PERFORMANCE_RATING_STYLES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        
        <div className="text-right">
          <Button type="button" onClick={handleGenerateDraft} isLoading={isGenerating} leftIcon={<SparklesIcon className="h-4 w-4"/>} size="sm">
            Сгенерировать черновик с ИИ
          </Button>
        </div>

        <textarea name="strengths" value={newReview.strengths || ''} onChange={handleInputChange} placeholder="Сильные стороны и достижения *" rows={4} className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm" />
        <textarea name="areasForImprovement" value={newReview.areasForImprovement || ''} onChange={handleInputChange} placeholder="Зоны для улучшения *" rows={4} className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm" />
        <textarea name="goalsForNextPeriod" value={newReview.goalsForNextPeriod || ''} onChange={handleInputChange} placeholder="Цели на следующий период *" rows={4} className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm" />
        <textarea name="employeeFeedback" value={newReview.employeeFeedback || ''} onChange={handleInputChange} placeholder="Обратная связь от сотрудника (необязательно)" rows={2} className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm" />
        
        <div className="pt-2 flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving || isGenerating}>Отмена</Button>
          <Button type="submit" isLoading={isSaving || isGenerating}>Сохранить ревью</Button>
        </div>
      </form>
       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </Modal>
  );
};

export default AddReviewModal;
