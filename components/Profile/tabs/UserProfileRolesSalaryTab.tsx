import React, { useState, useMemo, ChangeEvent, useEffect, useCallback } from 'react';
import { User, KanbanTaskStatus } from '../../../types';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import { EyeIcon, EyeSlashIcon, UserGroupIcon, PlusIcon, TrashIcon, ArrowLeftIcon, ChevronRightIcon } from '../../UI/Icons';
import { apiService } from '../../../services/apiService';
import { BONUS_PER_COEFFICIENT_POINT } from '../../../constants';
import LoadingSpinner from '../../UI/LoadingSpinner';

interface UserProfileRolesSalaryTabProps {
  profileData: Partial<User>;
  setProfileData: React.Dispatch<React.SetStateAction<Partial<User>>>;
  user: User;
  canAdminEdit: boolean;
  isSelfView: boolean;
  allSystemRoles: string[];
}

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];


const UserProfileRolesSalaryTab: React.FC<UserProfileRolesSalaryTabProps> = ({
  profileData,
  setProfileData,
  user,
  canAdminEdit,
  isSelfView,
  allSystemRoles,
}) => {
  const [newFunctionalRoleText, setNewFunctionalRoleText] = useState('');

  // State for salary calculation
  const [currentSalaryDate, setCurrentSalaryDate] = useState(new Date());
  const [calculatedSalaries, setCalculatedSalaries] = useState<{baseSalary: number, remotePay: number, taskBonus: number, tripBonus: number, totalSalary: number} | null>(null);
  const [isLoadingSalaryCalc, setIsLoadingSalaryCalc] = useState(false);


  const calculateMonthlySalaryData = useCallback(async (targetMonthDate: Date) => {
    if (!user || profileData.dailyRate === undefined) {
      setCalculatedSalaries(null);
      return;
    }
    setIsLoadingSalaryCalc(true);

    const currentDailyRate = profileData.dailyRate || 0;
    const userRemoteWorkRate = profileData.remoteWorkRate;
    const userTripBonusPerDay = profileData.tripBonusPerDay || 0;

    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth(); 

    const attendanceForMonth = (profileData.attendance || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() === year && entryDate.getMonth() === month;
    });

    let workDaysForBaseSalary = 0;
    let remoteDaysWithSpecialRate = 0;
    let tripDaysCount = 0;

    attendanceForMonth.forEach(e => {
        if (e.type === 'work' || e.type === 'late') {
            workDaysForBaseSalary++;
        } else if (e.type === 'trip') {
            workDaysForBaseSalary++; 
            tripDaysCount++;
        } else if (e.type === 'remote') {
            if (userRemoteWorkRate && userRemoteWorkRate > 0) {
                remoteDaysWithSpecialRate++;
            } else {
                workDaysForBaseSalary++; 
            }
        }
    });
    
    const baseSalaryCalculated = currentDailyRate * workDaysForBaseSalary;
    const remotePayCalculated = (userRemoteWorkRate || 0) * remoteDaysWithSpecialRate;
    const tripBonusCalculated = userTripBonusPerDay * tripDaysCount;

    const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    let taskBonusCalculated = 0;
    try {
        const completedTasksInMonth = await apiService.getKanbanTasks({
            assigneeId: user.id,
            status: [KanbanTaskStatus.DONE],
            startDate: firstDayOfMonth,
            endDate: lastDayOfMonth,
        });
        taskBonusCalculated = completedTasksInMonth.reduce((sum, task) => {
            const coefficient = task.coefficient || 0; 
            return sum + (coefficient * BONUS_PER_COEFFICIENT_POINT);
        }, 0);
    } catch (e) {
        console.error("Error fetching tasks for bonus calculation:", e);
    }

    setCalculatedSalaries({
        baseSalary: baseSalaryCalculated,
        remotePay: remotePayCalculated,
        taskBonus: taskBonusCalculated,
        tripBonus: tripBonusCalculated,
        totalSalary: baseSalaryCalculated + remotePayCalculated + taskBonusCalculated + tripBonusCalculated,
    });
    setIsLoadingSalaryCalc(false);
  }, [user, profileData.dailyRate, profileData.attendance, profileData.remoteWorkRate, profileData.tripBonusPerDay]);

  useEffect(() => {
      if(profileData.dailyRate !== undefined) { 
          calculateMonthlySalaryData(currentSalaryDate);
      } else {
          setCalculatedSalaries(null);
      }
  }, [currentSalaryDate, calculateMonthlySalaryData, profileData.attendance, profileData.dailyRate, profileData.remoteWorkRate, profileData.tripBonusPerDay]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
     if (type === 'number') {
        setProfileData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
        setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSalaryVisibilityToggle = () => {
    if (isSelfView) {
        setProfileData(prev => ({
            ...prev,
            salaryVisibility: prev?.salaryVisibility === 'visible' ? 'hidden' : 'visible'
        }));
    }
  };

  const handleFunctionalRoleChange = (role: string, action: 'add' | 'remove') => {
    if (!canAdminEdit) return;
    setProfileData(prev => {
        const currentRoles = prev?.functionalRoles || [];
        let newRoles: string[];
        if (action === 'add') {
            newRoles = currentRoles.includes(role) ? currentRoles : [...currentRoles, role];
        } else {
            newRoles = currentRoles.filter(r => r !== role);
        }
        return { ...prev, functionalRoles: newRoles.sort() };
    });
  };

  const availableRolesToAddUserTo = useMemo(() => {
      const currentRoles = profileData.functionalRoles || [];
      return allSystemRoles.filter(role => !currentRoles.includes(role)).sort();
  }, [allSystemRoles, profileData.functionalRoles]);
  
  const pastGroupMemberships = useMemo(() => {
    return (profileData.groupMembershipHistory || [])
        .filter(entry => entry.leaveDate) // Only show entries with a leaveDate
        .sort((a, b) => new Date(b.leaveDate!).getTime() - new Date(a.joinDate).getTime());
  }, [profileData.groupMembershipHistory]);


  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-md font-semibold text-brand-text-primary mb-2">Оплата Труда</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-3">
            { (isSelfView || canAdminEdit) && profileData.dailyRate !== undefined && profileData.salaryVisibility === 'visible' ? (
                <Input
                    id="dailyRate" 
                    name="dailyRate" 
                    type="number"
                    label="Оклад за рабочий день (₽)" 
                    value={profileData.dailyRate === undefined ? '' : String(profileData.dailyRate)}
                    onChange={handleInputChange}
                    disabled={!canAdminEdit}
                    className={!canAdminEdit ? "disabled:opacity-100 disabled:bg-brand-card" : ""}
                />
            ) : (isSelfView || canAdminEdit) && profileData.dailyRate !== undefined ? (
                <div className="text-sm text-brand-text-muted italic p-2 bg-brand-surface rounded-md">Оклад за день скрыт</div>
            ) : null }

            {isSelfView && user.dailyRate !== undefined && ( // Ensure dailyRate exists on original user to show toggle
                <div className="flex items-center space-x-2">
                    <Button
                        type="button"
                        onClick={handleSalaryVisibilityToggle}
                        variant="ghost"
                        size="sm"
                        leftIcon={profileData.salaryVisibility === 'visible' ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                    >
                        {profileData.salaryVisibility === 'visible' ? 'Скрыть оклад за день' : 'Показать оклад за день'}
                    </Button>
                </div>
            )}
        </div>
        {user.dailyRate === undefined && canAdminEdit && (
            <Input
                id="dailyRate-initial" 
                name="dailyRate" 
                type="number"
                label="Установить оклад за рабочий день (₽)" 
                value={profileData.dailyRate === undefined ? '' : String(profileData.dailyRate)}
                onChange={handleInputChange}
            />
        )}
        {canAdminEdit && (
            <>
                <Input
                    id="tripBonusPerDay" name="tripBonusPerDay" type="number"
                    label="Надбавка за командировку (в день, ₽)"
                    value={profileData.tripBonusPerDay === undefined ? '' : String(profileData.tripBonusPerDay)}
                    onChange={handleInputChange}
                    className="mt-2"
                />
                <Input
                    id="remoteWorkRate" name="remoteWorkRate" type="number"
                    label="Ставка за удаленный день (₽, 0 = базовая)"
                    value={profileData.remoteWorkRate === undefined ? '' : String(profileData.remoteWorkRate)}
                    onChange={handleInputChange}
                    className="mt-2"
                />
            </>
        )}
        {user.dailyRate === undefined && isSelfView && !canAdminEdit && (
            <p className="text-sm text-brand-text-muted mt-1">Данные об окладе за день не указаны.</p>
        )}
      </div>

       {/* Payslip Section */}
       {(profileData.salaryVisibility === 'visible' || canAdminEdit) && profileData.dailyRate !== undefined && (
         <div className="border-t border-brand-border pt-4">
             <h4 className="text-md font-semibold text-brand-text-primary mb-2">Расчетный лист</h4>
              <div className="flex justify-between items-center mb-2">
                <Button variant="ghost" size="sm" onClick={() => setCurrentSalaryDate(new Date(currentSalaryDate.getFullYear(), currentSalaryDate.getMonth() - 1, 1))} aria-label="Предыдущий месяц"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <h5 className="text-md font-semibold text-brand-text-primary">{MONTH_NAMES[currentSalaryDate.getMonth()]} {currentSalaryDate.getFullYear()}</h5>
                <Button variant="ghost" size="sm" onClick={() => setCurrentSalaryDate(new Date(currentSalaryDate.getFullYear(), currentSalaryDate.getMonth() + 1, 1))} aria-label="Следующий месяц"><ChevronRightIcon className="h-5 w-5"/></Button>
            </div>
            
            {isLoadingSalaryCalc ? (
                <div className="my-2 flex justify-center"><LoadingSpinner size="sm"/></div>
            ) : calculatedSalaries ? (
                <div className="mt-3 p-3 bg-brand-surface rounded-md space-y-1 text-sm border border-brand-border">
                  <p><strong className="text-brand-text-muted">Базовая ЗП (оклад):</strong> {calculatedSalaries.baseSalary.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
                  {calculatedSalaries.remotePay > 0 && <p><strong className="text-brand-text-muted">Оплата удаленных дней:</strong> {calculatedSalaries.remotePay.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>}
                  {calculatedSalaries.tripBonus > 0 && <p><strong className="text-brand-text-muted">Надбавки за командировки:</strong> {calculatedSalaries.tripBonus.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>}
                  <p><strong className="text-brand-text-muted">Премия за задачи:</strong> {calculatedSalaries.taskBonus.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
                  <p className="font-semibold text-brand-text-primary pt-1 border-t border-brand-border/50 mt-1"><strong className="text-brand-text-muted">Итого ЗП за месяц:</strong> {calculatedSalaries.totalSalary.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</p>
              </div>
            ) : (
                <p className="text-sm text-brand-text-muted text-center py-2">Недостаточно данных для расчета.</p>
            )}
         </div>
       )}

      <div className="border-t border-brand-border pt-4">
        <h4 className="text-md font-semibold text-brand-text-primary mb-2 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2 text-sky-400"/>Участие в группах (Функциональные роли)
        </h4>
        <div className="mb-3">
          <h5 className="text-sm font-medium text-brand-text-secondary mb-1">Текущие группы:</h5>
          {(profileData.functionalRoles || []).length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {(profileData.functionalRoles || []).map(role => (
                <li key={role} className="flex items-center bg-sky-500/20 text-sky-300 text-xs px-2 py-1 rounded-full">
                  {role}
                  {canAdminEdit && (
                    <Button variant="ghost" size="sm" onClick={() => handleFunctionalRoleChange(role, 'remove')} className="p-0 ml-1.5 leading-none text-sky-300 hover:text-red-400" aria-label={`Удалить из группы ${role}`}>
                      <TrashIcon className="h-3 w-3"/>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-brand-text-muted italic">Не состоит в группах.</p>}
        </div>

        {canAdminEdit && availableRolesToAddUserTo.length > 0 && (
          <div className="flex items-end space-x-2 mb-3">
            <div className="flex-grow">
              <label htmlFor="add-to-group-select" className="sr-only">Добавить в группу</label>
              <select
                id="add-to-group-select"
                value="" 
                onChange={(e) => { if (e.target.value) {handleFunctionalRoleChange(e.target.value, 'add'); e.target.value = "";}}}
                className="w-full bg-brand-surface border border-brand-border rounded-md p-1.5 text-xs text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="" disabled >Добавить в существующую группу...</option>
                {availableRolesToAddUserTo.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {canAdminEdit && (
          <div className="flex items-end space-x-2 mb-3">
            <Input
              id="new-functional-role-text"
              type="text"
              placeholder="Или ввести название новой группы..."
              value={newFunctionalRoleText}
              onChange={(e) => setNewFunctionalRoleText(e.target.value)}
              className="flex-grow text-xs p-1.5"
            />
            <Button type="button" size="sm" onClick={() => {if(newFunctionalRoleText.trim()){handleFunctionalRoleChange(newFunctionalRoleText.trim(), 'add'); setNewFunctionalRoleText('');}}} disabled={!newFunctionalRoleText.trim()} leftIcon={<PlusIcon className="h-3.5 w-3.5"/>}>
              Добавить
            </Button>
          </div>
        )}
        <div className="mt-2">
          <h5 className="text-sm font-medium text-brand-text-secondary mb-1">История участия:</h5>
          {pastGroupMemberships.length > 0 ? (
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar-thin pr-1">
              {pastGroupMemberships.map(entry => (
                <div key={`${entry.roleName}-${entry.joinDate}`} className="p-1.5 bg-brand-surface rounded-md text-xs border-l-2 border-zinc-600/50">
                  <p className="font-medium text-brand-text-primary">{entry.roleName}</p>
                  <p className="text-brand-text-muted">
                    {new Date(entry.joinDate).toLocaleDateString('ru-RU')} - {entry.leaveDate ? new Date(entry.leaveDate).toLocaleDateString('ru-RU') : 'Наст. время'}
                  </p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-brand-text-muted italic">Нет истории участия в прошлых группах.</p>}
        </div>
      </div>
    </div>
  );
};

export default UserProfileRolesSalaryTab;
