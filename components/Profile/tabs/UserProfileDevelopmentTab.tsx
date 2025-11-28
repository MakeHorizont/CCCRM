import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { DevelopmentPlanItem, TrainingCourse, TrainingApplication, User } from '../../../types';
import { apiService } from '../../../services/apiService';
import Button from '../../UI/Button';
import Input from '../../UI/Input';
import Modal from '../../UI/Modal';
import LoadingSpinner from '../../UI/LoadingSpinner';
import { PlusIcon, TrashIcon, CheckCircleIcon, ClockIcon, XCircleIcon, SparklesIcon, PencilIcon, CalendarDaysIcon } from '../../UI/Icons';
import { generateId } from '../../../utils/idGenerators';

interface UserProfileDevelopmentTabProps {
  profileData: Partial<User>;
  setProfileData: React.Dispatch<React.SetStateAction<Partial<User>>>;
  user: User;
  isSelfView: boolean;
  canAdminEdit: boolean;
}

// Inline form for adding/editing a development goal
const GoalEditForm: React.FC<{
    goalData: Partial<DevelopmentPlanItem>;
    onDataChange: (field: keyof DevelopmentPlanItem, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ goalData, onDataChange, onSave, onCancel, isSaving }) => (
    <div className="p-3 bg-brand-secondary rounded-md border border-brand-primary space-y-3">
        <Input
            id="goal-text"
            label="Цель развития"
            value={goalData.goal || ''}
            onChange={(e) => onDataChange('goal', e.target.value)}
            placeholder="Опишите цель..."
            required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
                id="goal-targetDate"
                label="Целевая дата"
                type="date"
                value={goalData.targetDate || ''}
                onChange={(e) => onDataChange('targetDate', e.target.value)}
            />
             <div className="w-full">
                <label htmlFor="goal-status" className="block text-sm font-medium text-brand-text-primary mb-1">Статус</label>
                <select id="goal-status" value={goalData.status || 'not_started'} onChange={(e) => onDataChange('status', e.target.value as any)}
                    className="bg-brand-card text-sm p-2 rounded border border-brand-border w-full">
                    <option value="not_started">Не начато</option>
                    <option value="in_progress">В процессе</option>
                    <option value="completed">Завершено</option>
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="goal-notes" className="block text-sm font-medium text-brand-text-primary mb-1">Заметки</label>
            <textarea
                id="goal-notes"
                value={goalData.notes || ''}
                onChange={(e) => onDataChange('notes', e.target.value)}
                rows={2}
                placeholder="Дополнительные детали, критерии успеха..."
                className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm"
            />
        </div>
        <div className="flex justify-end space-x-2">
            <Button size="sm" variant="secondary" onClick={onCancel}>Отмена</Button>
            <Button size="sm" onClick={onSave} isLoading={isSaving} disabled={!goalData.goal?.trim()}>Сохранить цель</Button>
        </div>
    </div>
);


const UserProfileDevelopmentTab: React.FC<UserProfileDevelopmentTabProps> = ({
  profileData,
  setProfileData,
  user,
  isSelfView,
  canAdminEdit,
}) => {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingGoal, setEditingGoal] = useState<string | 'new' | null>(null);
  const [editingGoalData, setEditingGoalData] = useState<Partial<DevelopmentPlanItem>>({});

  const canEditPlan = isSelfView || canAdminEdit;

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiService.getTrainingCourses();
        setCourses(data);
      } catch (err) {
        setError("Не удалось загрузить список курсов.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleStartAddGoal = () => {
      setEditingGoalData({ goal: '', status: 'not_started', notes: '', targetDate: '' });
      setEditingGoal('new');
  };
  
  const handleStartEditGoal = (goal: DevelopmentPlanItem) => {
      setEditingGoalData(goal);
      setEditingGoal(goal.id);
  };
  
  const handleCancelEdit = () => {
      setEditingGoal(null);
      setEditingGoalData({});
  };

  const handleSaveGoal = () => {
    if (!editingGoalData.goal?.trim()) return;

    if (editingGoal === 'new') {
      // Add new goal
      const newGoal: DevelopmentPlanItem = {
        id: generateId('dp'),
        goal: editingGoalData.goal.trim(),
        status: editingGoalData.status || 'not_started',
        notes: editingGoalData.notes,
        targetDate: editingGoalData.targetDate,
      };
      setProfileData(prev => ({
        ...prev,
        developmentPlan: [...(prev.developmentPlan || []), newGoal],
      }));
    } else {
      // Update existing goal
       setProfileData(prev => ({
        ...prev,
        developmentPlan: (prev.developmentPlan || []).map(g =>
          g.id === editingGoal ? { ...g, ...editingGoalData } : g
        ),
      }));
    }
    handleCancelEdit();
  };

  const handleRemoveGoal = (goalId: string) => {
    setProfileData(prev => ({
        ...prev,
        developmentPlan: (prev.developmentPlan || []).filter(goal => goal.id !== goalId)
    }));
  };
  
  const handleSubmitApplication = async () => {
      if (!selectedCourseForApp || !applicationReason.trim()) {
        setError("Необходимо указать причину для подачи заявки.");
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
          const newApp = await apiService.submitTrainingApplication({
              courseId: selectedCourseForApp.id,
              courseTitle: selectedCourseForApp.title,
              userId: user.id,
              reason: applicationReason,
          });
          setProfileData(prev => ({
            ...prev,
            trainingApplications: [...(prev.trainingApplications || []), newApp],
          }));
          setApplicationModalOpen(false);
          alert("Заявка успешно подана!");
      } catch (err) {
          setError((err as Error).message);
      } finally {
          setIsSubmitting(false);
      }
  };
  
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [selectedCourseForApp, setSelectedCourseForApp] = useState<TrainingCourse | null>(null);
  const [applicationReason, setApplicationReason] = useState('');


  return (
    <div className="space-y-6">
      {/* 1. Individual Development Plan */}
      <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
        <h3 className="text-md font-semibold text-brand-text-primary mb-2">План индивидуального развития (ПИР)</h3>
        <div className="space-y-2">
            {(profileData.developmentPlan || []).map(goal => (
                <div key={goal.id}>
                    {editingGoal === goal.id ? (
                        <GoalEditForm
                            goalData={editingGoalData}
                            onDataChange={(field, value) => setEditingGoalData(prev => ({...prev, [field]: value}))}
                            onSave={handleSaveGoal}
                            onCancel={handleCancelEdit}
                            isSaving={false} // No async saving here, just state update
                        />
                    ) : (
                        <div className="flex items-start justify-between space-x-2 bg-brand-card p-2 rounded">
                            <div className="flex-grow">
                                <p className={`text-sm ${goal.status === 'completed' ? 'line-through text-brand-text-muted' : 'text-brand-text-primary'}`}>{goal.goal}</p>
                                {goal.notes && <p className="text-xs text-brand-text-secondary mt-1 italic whitespace-pre-wrap">{goal.notes}</p>}
                                {goal.targetDate && (
                                    <div className="flex items-center text-xs text-brand-text-muted mt-1">
                                        <CalendarDaysIcon className="h-3 w-3 mr-1"/>
                                        <span>Срок: {new Date(goal.targetDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                           <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                                <div className={`px-2 py-0.5 text-xs rounded-full ${goal.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : goal.status === 'in_progress' ? 'bg-sky-500/20 text-sky-300' : 'bg-zinc-500/20 text-zinc-300'}`}>
                                    {goal.status === 'completed' ? 'Завершено' : goal.status === 'in_progress' ? 'В процессе' : 'Не начато'}
                                </div>
                               {canEditPlan && (
                                 <div className="flex items-center">
                                     <Button variant="ghost" size="sm" onClick={() => handleStartEditGoal(goal)} className="p-1"><PencilIcon className="h-4 w-4"/></Button>
                                    <Button variant="danger" size="sm" onClick={() => handleRemoveGoal(goal.id)} className="p-1"><TrashIcon className="h-4 w-4"/></Button>
                                 </div>
                               )}
                           </div>
                        </div>
                    )}
                </div>
            ))}
            {editingGoal === 'new' && (
                 <GoalEditForm
                    goalData={editingGoalData}
                    onDataChange={(field, value) => setEditingGoalData(prev => ({...prev, [field]: value}))}
                    onSave={handleSaveGoal}
                    onCancel={handleCancelEdit}
                    isSaving={false}
                />
            )}
        </div>
        {canEditPlan && editingGoal === null && (
            <Button size="sm" variant="secondary" onClick={handleStartAddGoal} className="mt-3" leftIcon={<PlusIcon className="h-4 w-4"/>}>Добавить цель</Button>
        )}
      </div>

      {/* 2. Available Courses */}
      <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
        <h3 className="text-md font-semibold text-brand-text-primary mb-2">Доступные курсы и материалы</h3>
        {isLoading ? <LoadingSpinner size="sm"/> : error ? <p className="text-xs text-red-400">{error}</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar-thin pr-2">
                {courses.map(course => (
                    <div key={course.id} className="p-2 bg-brand-card rounded flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-brand-text-primary">{course.title} <span className="text-xs text-brand-text-muted">({course.type === 'internal' ? 'Внутр.' : 'Внешн.'})</span></p>
                            <p className="text-xs text-brand-text-secondary">{course.description}</p>
                        </div>
                        <Button size="sm" onClick={() => { setSelectedCourseForApp(course); setApplicationModalOpen(true); }}>Подать заявку</Button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* 3. Training Applications */}
      <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
        <h3 className="text-md font-semibold text-brand-text-primary mb-2">Мои заявки на обучение</h3>
        {(profileData.trainingApplications || []).length > 0 ? (
            <div className="space-y-1 text-xs max-h-40 overflow-y-auto custom-scrollbar-thin pr-2">
                {(profileData.trainingApplications || []).map(app => (
                    <div key={app.id} className="flex justify-between items-center p-1.5 bg-brand-card rounded">
                        <span>{app.courseTitle}</span>
                        <span className={`flex items-center px-1.5 py-0.5 rounded-full ${
                            app.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                            {app.status === 'approved' ? <CheckCircleIcon className="h-3 w-3 mr-1"/> : app.status === 'rejected' ? <XCircleIcon className="h-3 w-3 mr-1"/> : <ClockIcon className="h-3 w-3 mr-1"/>}
                            {app.status}
                        </span>
                    </div>
                ))}
            </div>
        ) : <p className="text-xs text-brand-text-muted italic">Нет поданных заявок.</p>}
      </div>

      {applicationModalOpen && selectedCourseForApp && (
          <Modal isOpen={applicationModalOpen} onClose={() => setApplicationModalOpen(false)} title={`Заявка на курс: ${selectedCourseForApp.title}`}>
              <div className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <p className="text-sm text-brand-text-secondary">Укажите причину, по которой вы хотите пройти этот курс. Это поможет руководителю принять решение.</p>
                <textarea
                    value={applicationReason}
                    onChange={(e) => setApplicationReason(e.target.value)}
                    rows={4}
                    placeholder="Например: 'Хочу улучшить навыки для проекта X', 'Требуется для выполнения новых обязанностей'..."
                    className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm"
                />
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setApplicationModalOpen(false)} disabled={isSubmitting}>Отмена</Button>
                    <Button onClick={handleSubmitApplication} isLoading={isSubmitting}>Отправить заявку</Button>
                </div>
              </div>
          </Modal>
      )}
    </div>
  );
};

export default UserProfileDevelopmentTab;