import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KanbanTask, KanbanTaskStatus } from '../../../types';
import { apiService } from '../../../services/apiService'; 
import { calculateReputationScore, calculateTaskCoefficient } from '../../../constants';
import LoadingSpinner from '../../UI/LoadingSpinner';
import Input from '../../UI/Input';
import { ROUTE_PATHS } from '../../../constants';
import { ListBulletIcon, DocumentChartBarIcon as ChartBarIcon, BeakerIcon } from '../../UI/Icons';
import Card from '../../UI/Card';
import Tooltip from '../../UI/Tooltip';

type TaskHistoryPeriod = 'active' | 'lastWeek' | 'lastMonth' | 'allCompleted' | 'customRange';

const TASK_HISTORY_PERIOD_OPTIONS: { value: TaskHistoryPeriod; label: string }[] = [
  { value: 'active', label: 'Активные' },
  { value: 'lastWeek', label: 'За последнюю неделю' },
  { value: 'lastMonth', label: 'За последний месяц' },
  { value: 'customRange', label: 'Выбрать диапазон' },
  { value: 'allCompleted', label: 'Все выполненные' },
];

const ReputationGauge: React.FC<{ score: number }> = ({ score }) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const circumference = 2 * Math.PI * 40; // 2 * PI * radius
    const arcLength = (clampedScore / 100) * circumference;
    
    let colorClass = 'text-emerald-500';
    if (clampedScore < 40) colorClass = 'text-red-500';
    else if (clampedScore < 70) colorClass = 'text-yellow-400';

    return (
        <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="transparent" strokeWidth="10" className="text-brand-surface" />
                <circle
                    cx="50" cy="50" r="40" fill="transparent" strokeWidth="10"
                    className={`transition-all duration-700 ease-in-out ${colorClass}`}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - arcLength}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${colorClass}`}>{clampedScore}</span>
                <span className="text-xs text-brand-text-muted">Репутация</span>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: string | number, icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="p-3 bg-brand-surface rounded-md text-center">
        {icon && <div className="mx-auto mb-1">{icon}</div>}
        <p className="text-2xl font-bold text-brand-text-primary">{value}</p>
        <p className="text-xs text-brand-text-muted">{label}</p>
    </div>
);


interface UserProfileTasksTabProps {
  user: User;
  tasks: KanbanTask[];
  isLoading: boolean;
  error: string | null;
}

const UserProfileTasksTab: React.FC<UserProfileTasksTabProps> = ({ user, tasks, isLoading, error }) => {
  const navigate = useNavigate();
  const [reputationScore, setReputationScore] = useState<number>(0);
  
  // Filters state
  const [taskHistoryPeriod, setTaskHistoryPeriod] = useState<TaskHistoryPeriod>('active');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showSelfAssignedOnly, setShowSelfAssignedOnly] = useState(false);


  useEffect(() => {
    if (user && tasks) {
        try {
            const score = calculateReputationScore(user, tasks);
            setReputationScore(score);
        } catch(e) {
            console.error("Error calculating reputation score:", e);
        }
    }
  }, [user, tasks]);
  
  const filteredTasksForDisplay = useMemo(() => {
    let tasksToFilter = [...tasks];
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    if (taskHistoryPeriod === 'active') {
        tasksToFilter = tasksToFilter.filter(t => t.status !== KanbanTaskStatus.DONE && !t.isArchived);
    } else {
        tasksToFilter = tasksToFilter.filter(t => t.status === KanbanTaskStatus.DONE || t.isArchived);
        if (taskHistoryPeriod === 'lastWeek') {
            const lastWeekDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7).toISOString().split('T')[0];
            tasksToFilter = tasksToFilter.filter(t => (t.movedToDoneAt || t.createdAt) >= lastWeekDate && (t.movedToDoneAt || t.createdAt) <= todayISO);
        } else if (taskHistoryPeriod === 'lastMonth') {
            const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().split('T')[0];
            tasksToFilter = tasksToFilter.filter(t => (t.movedToDoneAt || t.createdAt) >= lastMonthDate && (t.movedToDoneAt || t.createdAt) <= todayISO);
        } else if (taskHistoryPeriod === 'customRange') {
            if (customStartDate) tasksToFilter = tasksToFilter.filter(t => (t.movedToDoneAt || t.createdAt) >= customStartDate);
            if (customEndDate) tasksToFilter = tasksToFilter.filter(t => (t.movedToDoneAt || t.createdAt) <= customEndDate);
        }
    }
    
    if (showSelfAssignedOnly) {
        tasksToFilter = tasksToFilter.filter(t => t.selfAssigned);
    }
    
    return tasksToFilter.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, taskHistoryPeriod, customStartDate, customEndDate, showSelfAssignedOnly]);

  const keyStats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === KanbanTaskStatus.DONE);
    const totalCoefficient = completedTasks.reduce((sum, t) => sum + (t.coefficient || calculateTaskCoefficient(t)), 0);
    return {
      totalCompleted: completedTasks.length,
      tasksInProgress: tasks.filter(t => t.status === KanbanTaskStatus.IN_PROGRESS && !t.isArchived).length,
      avgCoefficient: completedTasks.length > 0 ? (totalCoefficient / completedTasks.length).toFixed(1) : 0,
    };
  }, [tasks]);
  
  const monthlyChartData = useMemo(() => {
      const completedTasks = tasks.filter(t => t.status === KanbanTaskStatus.DONE);
      const monthlyData: Record<string, { count: number; coeffSum: number }> = {};
      
      for(let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
          monthlyData[key] = { count: 0, coeffSum: 0 };
      }

      completedTasks.forEach(task => {
          const date = new Date(task.movedToDoneAt || task.updatedAt);
          const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2,'0')}`;
          if(monthlyData[key]){
              monthlyData[key].count += 1;
              monthlyData[key].coeffSum += (task.coefficient || calculateTaskCoefficient(task));
          }
      });
      
      const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

      return Object.entries(monthlyData).map(([key, value]) => ({
          label: monthNames[parseInt(key.split('-')[1])],
          ...value
      }));

  }, [tasks]);
  
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="flex flex-col items-center justify-center p-4">
              <ReputationGauge score={reputationScore} />
          </Card>
           <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 <StatCard label="Задач в работе" value={keyStats.tasksInProgress}/>
                 <StatCard label="Выполнено всего" value={keyStats.totalCompleted}/>
                 <StatCard label="Средний коэфф." value={keyStats.avgCoefficient}/>
              </div>
              <Card>
                <h5 className="text-sm font-semibold mb-2 text-brand-text-secondary flex items-center"><ChartBarIcon className="h-4 w-4 mr-1"/>Активность (посл. 6 мес.)</h5>
                <div className="flex justify-between items-end h-32 w-full space-x-2">
                    {monthlyChartData.map((month, index) => {
                        const maxCount = Math.max(...monthlyChartData.map(d => d.count), 1);
                        const maxCoeff = Math.max(...monthlyChartData.map(d => d.coeffSum), 1);
                        const countHeight = `${(month.count / maxCount) * 100}%`;
                        const coeffHeight = `${(month.coeffSum / maxCoeff) * 100}%`;
                        return (
                            <Tooltip key={index} text={`${month.label}: ${month.count} задач, коэфф. ${month.coeffSum}`} position="top">
                                <div className="flex-1 h-full flex items-end justify-center space-x-1">
                                    <div className="w-1/2 bg-sky-800/50 rounded-t-sm" style={{height: countHeight}}></div>
                                    <div className="w-1/2 bg-purple-800/50 rounded-t-sm" style={{height: coeffHeight}}></div>
                                </div>
                            </Tooltip>
                        )
                    })}
                </div>
                 <div className="flex justify-between text-xs text-brand-text-muted mt-1">
                    {monthlyChartData.map((month, index) => <span key={index} className="flex-1 text-center">{month.label}</span>)}
                </div>
                 <div className="text-xs mt-2 flex items-center space-x-3">
                    <span className="flex items-center"><span className="h-2 w-2 rounded-sm bg-sky-500 mr-1"></span>Кол-во</span>
                    <span className="flex items-center"><span className="h-2 w-2 rounded-sm bg-purple-500 mr-1"></span>Коэфф.</span>
                </div>
              </Card>
           </div>
      </div>
      
      {/* Divider and Task List Section */}
      <div className="border-t border-brand-border pt-6">
        <h4 className="text-md font-semibold text-brand-text-primary flex items-center mb-3">
            <ListBulletIcon className="h-5 w-5 mr-2 text-sky-400"/>История Задач
        </h4>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2 mb-3 items-center">
            <select
                id="task-history-period-select"
                value={taskHistoryPeriod}
                onChange={(e) => setTaskHistoryPeriod(e.target.value as TaskHistoryPeriod)}
                className="bg-brand-surface border border-brand-border rounded-md p-1.5 text-xs text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
            >
                {TASK_HISTORY_PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {taskHistoryPeriod === 'customRange' && (
                <div className="flex gap-2 items-center">
                    <Input
                        type="date" id="customStartDate" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
                        className="p-1.5 text-xs max-w-[150px]" label="С:" smallLabel
                    />
                    <Input
                        type="date" id="customEndDate" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} min={customStartDate || undefined}
                        className="p-1.5 text-xs max-w-[150px]" label="По:" smallLabel
                    />
                </div>
            )}
            <label className="flex items-center text-xs text-brand-text-secondary">
                <input
                    type="checkbox" id="show-self-assigned-tasks" checked={showSelfAssignedOnly} onChange={(e) => setShowSelfAssignedOnly(e.target.checked)}
                    className="mr-1.5 h-3.5 w-3.5 text-sky-500 border-brand-border rounded focus:ring-sky-400"
                />
                Только взятые на себя
            </label>
        </div>
        
        {filteredTasksForDisplay.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar-thin pr-1">
                {filteredTasksForDisplay.map(task => (
                    <div key={task.id} className="p-2 bg-brand-surface rounded-md text-xs border-l-2 border-sky-500/50">
                        <div className="flex justify-between items-center">
                            <span
                                className="font-medium text-brand-text-primary hover:text-sky-400 cursor-pointer truncate"
                                title={task.title}
                                onClick={() => navigate(`${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${task.id}`)}
                            >{task.title}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${task.status === KanbanTaskStatus.DONE ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' : task.status === KanbanTaskStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-400'}`}>{task.status}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-brand-text-muted">
                            <span>Коэфф: {task.coefficient || calculateTaskCoefficient(task)} | Срок: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : 'Нет'}</span>
                            {task.selfAssigned && <span className="px-1 bg-teal-500/20 text-teal-400 rounded text-[9px]">Сам взял</span>}
                        </div>
                    </div>
                ))}
            </div>
        ) : <p className="text-xs text-brand-text-muted italic">Задачи за выбранный период не найдены.</p>}
      </div>
    </div>
  );
};

export default UserProfileTasksTab;