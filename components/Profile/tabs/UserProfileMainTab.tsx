
import React, { useMemo, useState } from 'react';
import { User, KanbanTask, KanbanTaskStatus, KTUDetails } from '../../../types';
import Input from '../../UI/Input';
import { USER_STATUS_OPTIONS, USER_STATUS_COLOR_MAP } from '../../../constants';
import { BriefcaseIcon, BeakerIcon, ListBulletIcon, CalculatorIcon, CheckCircleIcon } from '../../UI/Icons';
import Card from '../../UI/Card';
import Button from '../../UI/Button';
import { apiService } from '../../../services/apiService';
import Modal from '../../UI/Modal';

interface ReputationGaugeProps {
    score: number;
}

const ReputationGauge: React.FC<ReputationGaugeProps> = ({ score }) => {
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

const KTUDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, ktu: KTUDetails }> = ({ isOpen, onClose, ktu }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Расчет КТУ за ${ktu.period}`}>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-2xl font-bold p-4 bg-brand-surface rounded-lg border border-brand-border">
                    <span>Итоговый КТУ:</span>
                    <span className={ktu.total >= 1 ? 'text-emerald-500' : 'text-red-500'}>{ktu.total}</span>
                </div>
                <div className="space-y-2">
                    {ktu.components.map((comp, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 border-b border-brand-border last:border-0">
                            <div>
                                <p className="font-medium text-brand-text-primary">{comp.label}</p>
                                <p className="text-xs text-brand-text-muted">{comp.description}</p>
                            </div>
                            <span className={`font-mono font-bold ${comp.type === 'bonus' ? 'text-emerald-500' : comp.type === 'penalty' ? 'text-red-500' : 'text-brand-text-secondary'}`}>
                                {comp.value > 0 && comp.type !== 'base' ? '+' : ''}{comp.value}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="text-xs text-brand-text-muted text-right pt-2">
                    Рассчитано: {new Date(ktu.calculatedAt).toLocaleString('ru-RU')}
                </div>
                <div className="flex justify-end">
                    <Button onClick={onClose}>Закрыть</Button>
                </div>
            </div>
        </Modal>
    );
}


interface UserProfileMainTabProps {
  profileData: Partial<User>;
  setProfileData: React.Dispatch<React.SetStateAction<Partial<User>>>;
  user: User;
  allUsers: User[];
  canAdminEdit: boolean;
  allTasks: KanbanTask[];
}

const UserProfileMainTab: React.FC<UserProfileMainTabProps> = ({
  profileData,
  setProfileData,
  user,
  allUsers,
  canAdminEdit,
  allTasks,
}) => {
  const [isKTUCalculating, setIsKTUCalculating] = useState(false);
  const [showKTUModal, setShowKTUModal] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
  };
  
  const managerOptions = allUsers.filter(u => u.id !== user.id && u.role !== 'employee' && u.status !== 'fired');
  
  const keyStats = useMemo(() => {
    const completedTasks = allTasks.filter(t => t.status === KanbanTaskStatus.DONE);
    const totalCoefficient = completedTasks.reduce((sum, t) => sum + (t.coefficient || 0), 0);
    return {
      totalCompleted: completedTasks.length,
      avgCoefficient: completedTasks.length > 0 ? (totalCoefficient / completedTasks.length).toFixed(1) : 0,
    };
  }, [allTasks]);

  const handleCalculateKTU = async () => {
      setIsKTUCalculating(true);
      try {
          const result = await apiService.calculateUserKTU(user.id);
          setProfileData(prev => ({...prev, currentMonthKTU: result}));
          setShowKTUModal(true);
      } catch (error) {
          console.error("KTU Calc error", error);
      } finally {
          setIsKTUCalculating(false);
      }
  };


  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 flex flex-col items-center justify-center p-4">
                <ReputationGauge score={profileData.reputationScore || 0} />
                {/* KTU Widget */}
                <div className="mt-6 w-full border-t border-brand-border pt-4">
                    <div className="flex justify-between items-center mb-2">
                         <h5 className="text-sm font-semibold text-brand-text-primary flex items-center"><CalculatorIcon className="h-4 w-4 mr-1 text-sky-400"/> Текущий КТУ</h5>
                         <Button size="sm" variant="ghost" onClick={handleCalculateKTU} isLoading={isKTUCalculating} className="text-xs">Обновить</Button>
                    </div>
                    {profileData.currentMonthKTU ? (
                         <div className="bg-brand-surface p-3 rounded-lg cursor-pointer hover:bg-brand-secondary transition-colors" onClick={() => setShowKTUModal(true)}>
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-brand-text-muted">За {profileData.currentMonthKTU.period}</span>
                                <span className={`text-2xl font-bold ${profileData.currentMonthKTU.total >= 1.0 ? 'text-emerald-500' : 'text-red-500'}`}>{profileData.currentMonthKTU.total}</span>
                            </div>
                             <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 dark:bg-gray-700">
                                <div className={`h-1.5 rounded-full ${profileData.currentMonthKTU.total >= 1.0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min((profileData.currentMonthKTU.total / 2) * 100, 100)}%` }}></div>
                            </div>
                            <p className="text-[10px] text-center mt-1 text-brand-text-muted">Нажмите для детализации</p>
                        </div>
                    ) : (
                         <div className="text-center p-3 bg-brand-surface rounded-lg">
                             <p className="text-xs text-brand-text-muted">Данные не рассчитаны</p>
                             <Button size="sm" variant="secondary" onClick={handleCalculateKTU} className="mt-2 w-full">Рассчитать</Button>
                         </div>
                    )}
                </div>
            </Card>
            <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                    <StatCard label="Выполнено задач" value={keyStats.totalCompleted} icon={<ListBulletIcon className="h-6 w-6 text-emerald-400"/>}/>
                    <StatCard label="Средний коэфф. задач" value={keyStats.avgCoefficient} icon={<BeakerIcon className="h-6 w-6 text-purple-400"/>}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                    <label htmlFor="modal-managerId" className="block text-sm font-medium text-brand-text-primary mb-1">Руководитель</label>
                    <select
                        id="modal-managerId"
                        name="managerId"
                        value={profileData.managerId === null ? 'null' : profileData.managerId || ''}
                        onChange={handleInputChange}
                        disabled={!canAdminEdit || user.role === 'ceo'}
                        className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
                    >
                        <option value="null">Нет руководителя</option>
                        {managerOptions.map(manager => (
                        <option key={manager.id} value={manager.id}>
                            {manager.name || manager.email}
                        </option>
                        ))}
                    </select>
                    </div>
                    <div>
                    <label htmlFor="modal-status" className="block text-sm font-medium text-brand-text-primary mb-1">Статус сотрудника</label>
                    <select
                        id="modal-status"
                        name="status"
                        value={profileData.status || 'active'}
                        onChange={handleInputChange}
                        disabled={!canAdminEdit || (user.role === 'ceo' && profileData.status === 'fired')}
                        className={`w-full bg-brand-card border rounded-lg p-2 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60 ${USER_STATUS_COLOR_MAP[profileData.status || 'active']?.replace('bg-', 'border-')}`}
                    >
                        {USER_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={user.role === 'ceo' && opt.value === 'fired'}>{opt.label}</option>
                        ))}
                    </select>
                    </div>
                </div>
            </div>
        </div>

      <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
        <h5 className="text-sm font-medium text-brand-text-primary flex items-center mb-1">
            <BriefcaseIcon className="h-4 w-4 mr-2 text-indigo-400"/>История должностей (Пример)
        </h5>
        {(user.groupMembershipHistory && user.groupMembershipHistory.length > 0) ? (
             <ul className="list-disc list-inside pl-2 text-xs space-y-0.5">
                {user.groupMembershipHistory.sort((a,b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()).map(entry => (
                    <li key={`${entry.roleName}-${entry.joinDate}`} className="text-brand-text-secondary">
                        {entry.roleName} ({new Date(entry.joinDate).toLocaleDateString('ru-RU')} - {entry.leaveDate ? new Date(entry.leaveDate).toLocaleDateString('ru-RU') : 'Наст. время'})
                    </li>
                ))}
            </ul>
        ): <p className="text-xs text-brand-text-muted italic">Нет данных об истории должностей.</p>}
        <p className="text-xs text-brand-text-muted mt-2 italic">Примечание: Управление историей должностей будет добавлено в будущих обновлениях.</p>
      </div>
       {/* Placeholder for Disciplinary Actions */}
        <div className="p-3 bg-brand-surface rounded-md border border-brand-border">
            <h5 className="text-sm font-medium text-brand-text-primary mb-1">Дисциплинарные взыскания</h5>
            {(profileData.disciplinaryActions || []).length > 0 ? (
                 <ul className="list-disc list-inside pl-2 text-xs space-y-0.5">
                    {(profileData.disciplinaryActions || []).map(action => (
                        <li key={action.id} className="text-brand-text-secondary">
                           {new Date(action.date).toLocaleDateString('ru-RU')}: {action.type} - {action.reason} (Серьезность: {action.severity})
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-brand-text-muted italic">Дисциплинарные взыскания отсутствуют.</p>
            )}
            {canAdminEdit && <p className="text-xs text-brand-text-muted mt-2 italic">Управление взысканиями доступно администратору.</p>}
        </div>

        {profileData.currentMonthKTU && (
            <KTUDetailModal 
                isOpen={showKTUModal} 
                onClose={() => setShowKTUModal(false)} 
                ktu={profileData.currentMonthKTU} 
            />
        )}
    </div>
  );
};

export default UserProfileMainTab;
