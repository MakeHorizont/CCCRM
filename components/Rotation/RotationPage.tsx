import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, RotationScheduleEntry, RotationArea } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../hooks/useView';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ArrowPathIcon, PlusCircleIcon, ArrowLeftIcon, ChevronRightIcon } from '../UI/Icons';
import { ROTATION_AREA_COLOR_MAP } from '../../constants';
import RotationScheduleModal from './RotationScheduleModal';
import ConfirmationModal from '../UI/ConfirmationModal';
import Tooltip from '../UI/Tooltip';

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const RotationPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { isMobileView } = useView();

  const [schedules, setSchedules] = useState<RotationScheduleEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<RotationScheduleEntry> | null>(null);
  const [selfAssignConfirm, setSelfAssignConfirm] = useState<RotationScheduleEntry | null>(null);
  
  const canEdit = currentUser?.role === 'ceo' || currentUser?.role === 'manager';

  const fetchPageData = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const [schedulesData, usersData] = await Promise.all([
        apiService.getRotationSchedules({ startDate, endDate }),
        apiService.getUsersWithHierarchyDetails()
      ]);

      setSchedules(schedulesData);
      setUsers(usersData.filter(u => u.status === 'active' || u.status === 'trip' || u.status === 'vacation'));
    } catch (err) {
      setError("Не удалось загрузить данные по ротациям.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData(currentDate);
  }, [currentDate, fetchPageData]);

  const handleSlotClick = (schedule: RotationScheduleEntry) => {
    if (canEdit) {
      setEditingSchedule(schedule);
      setIsModalOpen(true);
    } else if (!schedule.userId) {
      setSelfAssignConfirm(schedule);
    }
  };
  
  // FIX: Define the missing handleOpenModal function.
  const handleOpenModal = () => {
    setEditingSchedule(null); // Set to null for creating a new entry
    setIsModalOpen(true);
  };

  const handleSelfAssign = async () => {
    if (!selfAssignConfirm || !currentUser) return;
    setIsInteracting(true);
    setError(null);
    try {
      await apiService.assignRotationToSelf(selfAssignConfirm.id, currentUser.id);
      setSelfAssignConfirm(null);
      await fetchPageData(currentDate);
    } catch (err) {
      setError((err as Error).message);
      // Keep modal open to show error
    } finally {
      setIsInteracting(false);
    }
  };

  const handleSaveSchedule = async (data: Partial<RotationScheduleEntry>) => {
    setIsInteracting(true);
    try {
      if (data.id) {
        await apiService.updateRotationSchedule(data as RotationScheduleEntry);
      } else {
        await apiService.addRotationSchedule(data as any);
      }
      setIsModalOpen(false);
      await fetchPageData(currentDate);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsInteracting(false);
    }
  };
  
  const handleDeleteSchedule = async (id: string) => {
    setIsInteracting(true);
    try {
        await apiService.deleteRotationSchedule(id);
        setIsModalOpen(false);
        await fetchPageData(currentDate);
    } catch(err) {
        setError((err as Error).message);
    } finally {
        setIsInteracting(false);
    }
  };


  const changeMonth = (delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  
  const renderTimeline = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allRelevantUsers = [...users, {id: 'unassigned', name: 'Открытые слоты'}];


    return (
      <div className="overflow-x-auto custom-scrollbar-thin relative">
        <div className="grid min-w-max" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, minmax(40px, 1fr))` }}>
          {/* Header Row */}
          <div className="sticky left-0 bg-brand-surface z-20 border-b border-r border-brand-border font-semibold p-2">Сотрудник</div>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
            <div key={day} className="text-center text-xs p-2 border-b border-r border-brand-border">{day}</div>
          ))}

          {/* User Rows */}
          {allRelevantUsers.map(user => {
            const userSchedules = schedules.filter(s => (s.userId === user.id) || (user.id === 'unassigned' && !s.userId));
            if (userSchedules.length === 0 && user.id === 'unassigned') return null;

            return (
              <div key={user.id} className="col-span-full grid" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, minmax(40px, 1fr))`, minHeight: '44px' }}>
                <div className="sticky left-0 bg-brand-surface z-10 border-b border-r border-brand-border text-sm p-2 truncate flex items-center">{user.name}</div>
                <div className="col-start-2 col-span-full relative border-b border-brand-border">
                   {/* Day grid background */}
                   {Array.from({ length: daysInMonth }).map((_, i) => (
                      <div key={i} className={`absolute top-0 bottom-0 border-r border-brand-border/50 ${[5,6].includes(new Date(year,month,i+1).getDay()) ? 'bg-brand-secondary/30' : ''}`} style={{ left: `${i * (100/daysInMonth)}%`, width: `${100/daysInMonth}%` }}></div>
                   ))}
                  {userSchedules.map(schedule => {
                    const start = new Date(schedule.startDate + 'T00:00:00Z');
                    const end = new Date(schedule.endDate + 'T00:00:00Z');
                    
                    const startDay = start.getUTCMonth() === month ? start.getUTCDate() : 1;
                    const endDay = end.getUTCMonth() === month ? end.getUTCDate() : daysInMonth;
                    
                    const duration = endDay - startDay + 1;
                    if(duration <= 0) return null;
                    
                    const isUnassigned = !schedule.userId;
                    const canClick = canEdit || isUnassigned;

                    const barClasses = `absolute h-8 top-1 rounded-md text-white text-xs p-1 flex items-center ${
                        isUnassigned ? `opacity-70 bg-stripes ${ROTATION_AREA_COLOR_MAP[schedule.area]}` : ROTATION_AREA_COLOR_MAP[schedule.area]
                    } ${canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`;

                    return (
                        <div
                            key={schedule.id}
                            className={barClasses}
                            style={{
                                left: `${(startDay - 1) * (100 / daysInMonth)}%`,
                                width: `${duration * (100 / daysInMonth)}%`,
                            }}
                            onClick={() => handleSlotClick(schedule)}
                        >
                            <span className="truncate">{schedule.area}</span>
                        </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
          <ArrowPathIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Ротация Задач
        </h1>
        {canEdit && (
          <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5"/>}>
            Запланировать
          </Button>
        )}
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}><ArrowLeftIcon className="h-5 w-5"/></Button>
            <span className="text-lg font-semibold text-brand-text-primary w-32 text-center">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}><ChevronRightIcon className="h-5 w-5"/></Button>
          </div>
        </div>
        {error && <p className="text-red-500 text-center p-2 mb-2">{error}</p>}
        {isLoading ? <LoadingSpinner/> : (
            isMobileView ? <div>Mobile view not implemented yet</div> : renderTimeline()
        )}
      </Card>

      {isModalOpen && canEdit && (
        <RotationScheduleModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveSchedule}
            onDelete={handleDeleteSchedule}
            scheduleData={editingSchedule}
            isSaving={isInteracting}
            users={users}
        />
      )}
      
      {selfAssignConfirm && (
        <ConfirmationModal
            isOpen={!!selfAssignConfirm}
            onClose={() => setSelfAssignConfirm(null)}
            onConfirm={handleSelfAssign}
            title="Подтверждение"
            message={<p>Взять на себя ротацию в сфере <strong className="text-sky-300">{selfAssignConfirm.area}</strong> с {new Date(selfAssignConfirm.startDate+'T00:00:00Z').toLocaleDateString()} по {new Date(selfAssignConfirm.endDate+'T00:00:00Z').toLocaleDateString()}?</p>}
            confirmText="Да, взять"
            isLoading={isInteracting}
        />
      )}

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
        .bg-stripes {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(0, 0, 0, 0.2),
            rgba(0, 0, 0, 0.2) 10px,
            rgba(0, 0, 0, 0) 10px,
            rgba(0, 0, 0, 0) 20px
          );
        }
      `}</style>
    </div>
  );
};

export default RotationPage;