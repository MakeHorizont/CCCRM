import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { PersonalDashboardSummary, DevelopmentPlanItem, UserAchievement, KanbanTask } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { ROUTE_PATHS, PRIORITY_ICON_MAP } from '../../constants';
import { SparklesIcon, ListBulletIcon, ArrowTrendingUpIcon, FireIcon, StarIcon, HashtagIcon, ExclamationTriangleIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';


const ReputationGauge: React.FC<{ score: number }> = ({ score }) => {
    const clampedScore = Math.max(0, Math.min(100, score || 0));
    const circumference = 2 * Math.PI * 40; // 2 * PI * radius
    const arcLength = (clampedScore / 100) * circumference;
    
    let colorClass = 'text-emerald-500';
    if (clampedScore < 40) colorClass = 'text-red-500';
    else if (clampedScore < 70) colorClass = 'text-yellow-400';

    return (
        <div className="relative w-48 h-48 mx-auto">
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
                <span className={`text-5xl font-bold ${colorClass}`}>{clampedScore}</span>
                <span className="text-sm text-brand-text-muted">Репутация</span>
            </div>
        </div>
    );
};

const WelcomeHeader: React.FC<{ name?: string, badge?: UserAchievement | null }> = ({ name, badge }) => (
    <div className="flex justify-between items-center bg-brand-card p-4 rounded-lg shadow-lg">
        <div>
            <h1 className="text-2xl font-bold text-brand-text-primary">Добро пожаловать, {name}!</h1>
            <p className="text-sm text-brand-text-secondary">Ваша личная сводка по вкладу в общее дело.</p>
        </div>
        {badge && (
            <Tooltip text={badge.description}>
                <div className="text-center">
                    <span className="text-4xl block" role="img">{badge.icon || '🏆'}</span>
                    <p className="text-xs font-semibold text-sky-400">{badge.name}</p>
                </div>
            </Tooltip>
        )}
    </div>
);

const MyTasksWidget: React.FC<{ tasks: KanbanTask[], activeCount: number, overdueCount: number }> = ({ tasks, activeCount, overdueCount }) => {
    const navigate = useNavigate();
    return (
        <Card className="flex flex-col h-full">
            <h2 className="text-lg font-semibold text-brand-text-primary mb-2">Мои Задачи</h2>
            <div className="flex justify-between text-xs text-brand-text-muted mb-2">
                <span>Активных: {activeCount}</span>
                {overdueCount > 0 && <span className="text-red-400 flex items-center"><ExclamationTriangleIcon className="h-4 w-4 mr-1"/> Просрочено: {overdueCount}</span>}
            </div>
            <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar-thin pr-1">
                {tasks.length > 0 ? tasks.map(task => {
                    const priorityInfo = task.priority ? PRIORITY_ICON_MAP[task.priority as '1'|'2'|'3'] : null;
                    const IconComponent = priorityInfo?.icon;
                    return (
                        <div key={task.id} onClick={() => navigate(`${ROUTE_PATHS.KANBAN_TASK_DETAIL}/${task.id}`)}
                             className="p-2 bg-brand-surface rounded-md cursor-pointer hover:bg-brand-secondary border-l-2 border-sky-500">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-brand-text-primary truncate">{task.title}</p>
                                {priorityInfo && IconComponent && <IconComponent className={`h-4 w-4 ${priorityInfo.color}`} />}
                            </div>
                            <p className="text-xs text-brand-text-muted">{task.status}</p>
                        </div>
                    );
                }) : <p className="text-sm text-brand-text-muted text-center py-4">Нет активных задач.</p>}
            </div>
            <Button onClick={() => navigate(ROUTE_PATHS.KANBAN_MY_TASKS)} variant="secondary" size="sm" className="mt-3 w-full">Все мои задачи</Button>
        </Card>
    );
};

const MyDevelopmentWidget: React.FC<{ goals: DevelopmentPlanItem[] }> = ({ goals }) => {
     const navigate = useNavigate();
    return (
        <Card className="flex flex-col h-full">
            <h2 className="text-lg font-semibold text-brand-text-primary mb-3">План Развития</h2>
             <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar-thin pr-1">
                {goals.length > 0 ? goals.map(goal => (
                    <div key={goal.id} className="p-2 bg-brand-surface rounded-md">
                        <p className="text-sm font-medium text-brand-text-primary">{goal.goal}</p>
                        <p className="text-xs text-brand-text-muted">Статус: В процессе</p>
                    </div>
                )) : <p className="text-sm text-brand-text-muted text-center py-4">Нет целей в процессе.</p>}
            </div>
            <Button onClick={() => navigate(ROUTE_PATHS.PROFILE)} variant="secondary" size="sm" className="mt-3 w-full">К полному профилю</Button>
        </Card>
    );
};

const MyStatsWidget: React.FC<{ achievements: UserAchievement[] }> = ({ achievements }) => {
    return (
        <Card className="flex flex-col h-full">
            <h2 className="text-lg font-semibold text-brand-text-primary mb-3">Последние Достижения</h2>
            <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar-thin pr-1">
                 {achievements.length > 0 ? achievements.map(ach => (
                     <div key={ach.id} className="flex items-center space-x-2 p-1.5 bg-brand-surface rounded">
                         <span className="text-lg" role="img">{ach.icon || '🏆'}</span>
                         <p className="text-sm text-brand-text-primary truncate">{ach.name}</p>
                     </div>
                 )) : <p className="text-sm text-brand-text-muted text-center py-4">Нет недавних достижений.</p>}
            </div>
        </Card>
    );
};


const MyProfileDashboardPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [summary, setSummary] = useState<PersonalDashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            if (!currentUser) {
                setError("Не удалось определить пользователя.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const data = await apiService.getPersonalDashboardSummary(currentUser.id);
                setSummary(data);
            } catch (err) {
                setError("Не удалось загрузить сводку по профилю.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSummary();
    }, [currentUser]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
    }

    if (error || !summary) {
        return <div className="text-red-500 text-center p-8">{error || "Нет данных для отображения."}</div>;
    }

    const { tasks, development, achievements, user } = summary;

    return (
        <div className="space-y-6">
            <WelcomeHeader name={user.name} badge={achievements.displayedBadge} />
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="lg:col-span-1 xl:col-span-1">
                    <Card className="h-full flex flex-col items-center justify-center">
                         <ReputationGauge score={user.reputationScore || 0} />
                    </Card>
                </div>
                <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 h-80">
                         <MyTasksWidget tasks={tasks.topTasks} activeCount={tasks.activeCount} overdueCount={tasks.overdueCount} />
                    </div>
                    <div className="md:col-span-1 h-80">
                        <MyDevelopmentWidget goals={development.inProgressGoals} />
                    </div>
                    <div className="md:col-span-1 h-80">
                        <MyStatsWidget achievements={achievements.recentAchievements} />
                    </div>
                </div>
            </div>
             <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
        </div>
    );
};

export default MyProfileDashboardPage;