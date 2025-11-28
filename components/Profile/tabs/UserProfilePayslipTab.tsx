
import React, { useState, useEffect, useCallback } from 'react';
import { User, PayslipData } from '../../../types';
import { apiService } from '../../../services/apiService';
import Button from '../../UI/Button';
import LoadingSpinner from '../../UI/LoadingSpinner';
import Card from '../../UI/Card';
import { ArrowLeftIcon, ChevronRightIcon, BanknotesIcon, CalculatorIcon, BeakerIcon } from '../../UI/Icons';

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

interface UserProfilePayslipTabProps {
  user: User;
  canAdminEdit: boolean;
  isSelfView: boolean;
}

const UserProfilePayslipTab: React.FC<UserProfilePayslipTabProps> = ({ user, canAdminEdit, isSelfView }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayslip = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getUserPayslip(user.id, date.getFullYear(), date.getMonth());
      setPayslipData(data);
    } catch (err) {
      setError((err as Error).message || 'Не удалось рассчитать данные по зарплате.');
      setPayslipData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchPayslip(currentDate);
  }, [currentDate, fetchPayslip]);

  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  
  if (!isSelfView && !canAdminEdit && user.salaryVisibility !== 'visible') {
      return (
          <Card>
              <p className="text-sm text-brand-text-muted text-center p-4">Финансовая информация этого пользователя скрыта.</p>
          </Card>
      );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-brand-text-primary flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2 text-emerald-400"/>
                Расчетный лист (Формула Справедливости)
            </h3>
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <span className="text-sm font-medium text-brand-text-primary w-28 text-center">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} aria-label="Следующий месяц"><ChevronRightIcon className="h-5 w-5"/></Button>
            </div>
        </div>

        {isLoading ? (
            <div className="flex justify-center p-8"><LoadingSpinner /></div>
        ) : error ? (
            <p className="text-red-500 text-center p-4">{error}</p>
        ) : payslipData && payslipData.lineItems.length > 0 ? (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold mb-2 flex items-center">
                        <CalculatorIcon className="h-4 w-4 mr-1"/>
                        АЛГОРИТМ НАЧИСЛЕНИЯ:
                    </p>
                    <div className="flex flex-wrap gap-2 items-center text-sm font-mono">
                        <span className="bg-white dark:bg-zinc-800 px-2 py-1 rounded shadow-sm">База</span>
                        <span className="text-brand-text-muted">+</span>
                        <span className="bg-white dark:bg-zinc-800 px-2 py-1 rounded shadow-sm">Сделка (Задачи)</span>
                        <span className="text-brand-text-muted">×</span>
                        <span className="bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded shadow-sm text-emerald-700 dark:text-emerald-300 font-bold" title="Коэффициент Трудового Участия">КТУ</span>
                        <span className="text-brand-text-muted">+</span>
                         <span className="bg-white dark:bg-zinc-800 px-2 py-1 rounded shadow-sm">Премии</span>
                        <span className="text-brand-text-muted">=</span>
                        <span className="font-bold">ИТОГ</span>
                    </div>
                </div>

                <div className="space-y-2 p-3 bg-brand-surface rounded-md border border-brand-border">
                    {payslipData.lineItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm py-2 border-b border-brand-border/50 last:border-b-0">
                            <div className="flex items-center">
                                <span className="text-brand-text-secondary">{item.description}</span>
                                {item.type === 'task_bonus' && (
                                    <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full flex items-center">
                                        <BeakerIcon className="h-3 w-3 mr-1"/>
                                        Умножено на КТУ
                                    </span>
                                )}
                            </div>
                            <span className={`font-medium font-mono ${item.type === 'deduction' ? 'text-red-400' : 'text-brand-text-primary'}`}>
                                {item.amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                            </span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center text-lg font-bold pt-3 border-t-2 border-brand-border/80 mt-2">
                        <span className="text-brand-text-primary">Итого к выплате:</span>
                        <span className="text-emerald-500">
                            {payslipData.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                        </span>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center p-8">
                <p className="text-sm text-brand-text-muted">Нет данных для расчета за выбранный месяц.</p>
                <p className="text-xs text-brand-text-secondary mt-2">Убедитесь, что табель заполнен или есть выполненные задачи.</p>
            </div>
        )}
      </Card>
    </div>
  );
};

export default UserProfilePayslipTab;
