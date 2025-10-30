import React, { useState, useEffect, useCallback } from 'react';
import { User, PayslipData } from '../../../types';
import { apiService } from '../../../services/apiService';
import Button from '../../UI/Button';
import LoadingSpinner from '../../UI/LoadingSpinner';
import Card from '../../UI/Card';
import { ArrowLeftIcon, ChevronRightIcon, BanknotesIcon } from '../../UI/Icons';

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
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-md font-semibold text-brand-text-primary flex items-center">
            <BanknotesIcon className="h-5 w-5 mr-2 text-green-400"/>
            Расчетный лист
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
        <div className="space-y-2 p-3 bg-brand-surface rounded-md border border-brand-border">
          {payslipData.lineItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-brand-border/50 last:border-b-0">
                <span className="text-brand-text-secondary">{item.description}</span>
                <span className={`font-medium ${item.type === 'deduction' ? 'text-red-400' : 'text-brand-text-primary'}`}>
                    {item.amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                </span>
            </div>
          ))}
          <div className="flex justify-between items-center text-base font-bold pt-2 border-t-2 border-brand-border/80">
            <span className="text-brand-text-primary">Итого к выплате:</span>
            <span className="text-emerald-400">
                {payslipData.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-brand-text-muted text-center p-8">Нет данных для расчета за выбранный месяц.</p>
      )}
    </Card>
  );
};

export default UserProfilePayslipTab;
