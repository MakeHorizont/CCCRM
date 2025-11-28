
import React, { useState, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { User, AttendanceEntry } from '../../../types';
import Button from '../../UI/Button';
import Input from '../../UI/Input'; 
import { ATTENDANCE_TYPE_LABELS, ATTENDANCE_TYPE_COLORS } from '../../../constants';
import { ArrowLeftIcon, ChevronRightIcon } from '../../UI/Icons';
import Tooltip from '../../UI/Tooltip';

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const dates: string[] = [];
    const startParts = startDateStr.split('-').map(Number);
    const endParts = endDateStr.split('-').map(Number);

    let currentDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    let finalEndDate = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

    if (currentDate.getTime() > finalEndDate.getTime()) {
        [currentDate, finalEndDate] = [finalEndDate, currentDate]; 
    }

    while (currentDate.getTime() <= finalEndDate.getTime()) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    return dates;
};

interface UserProfileAttendanceTabProps {
  currentAttendanceData: AttendanceEntry[];
  onAttendanceChange: (newAttendance: AttendanceEntry[]) => void;
  user: User;
  canAdminEdit: boolean;
}

export const UserProfileAttendanceTab: React.FC<UserProfileAttendanceTabProps> = ({
  currentAttendanceData,
  onAttendanceChange,
  user,
  canAdminEdit,
}) => {
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDateForEdit, setSelectedCalendarDateForEdit] = useState<string | null>(null);
  const [multiSelectedDates, setMultiSelectedDates] = useState<Set<string>>(new Set());
  const [shiftSelectionAnchorDate, setShiftSelectionAnchorDate] = useState<string | null>(null);
  const [isFiveTwoFillArmed, setIsFiveTwoFillArmed] = useState<boolean>(false);
  
  const [isFill52ConfirmOpen, setIsFill52ConfirmOpen] = useState(false);
  const [pendingFillTypeFor52, setPendingFillTypeFor52] = useState<AttendanceEntry['type'] | null>(null);
  
  useEffect(() => {
    setCurrentCalendarDate(new Date()); 
    setSelectedCalendarDateForEdit(null);
    setMultiSelectedDates(new Set());
    setShiftSelectionAnchorDate(null);
    setIsFiveTwoFillArmed(false);
    setPendingFillTypeFor52(null);
    setIsFill52ConfirmOpen(false);
  }, [user.id, currentAttendanceData.length]);


  const handleCalendarDayInteraction = (dateStr: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!canAdminEdit) return;

    if (event.ctrlKey || event.metaKey) { 
        setMultiSelectedDates(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(dateStr)) newSelection.delete(dateStr);
            else newSelection.add(dateStr);
            return newSelection;
        });
        setSelectedCalendarDateForEdit(null); setShiftSelectionAnchorDate(null); setIsFiveTwoFillArmed(false); 
    } else if (event.shiftKey) {
        setSelectedCalendarDateForEdit(null); setIsFiveTwoFillArmed(false); 
        if (!shiftSelectionAnchorDate) {
            setShiftSelectionAnchorDate(dateStr); setMultiSelectedDates(new Set([dateStr]));
        } else {
            const datesInRange = getDatesInRange(shiftSelectionAnchorDate, dateStr);
            setMultiSelectedDates(new Set(datesInRange));
        }
    } else { 
        setSelectedCalendarDateForEdit(dateStr); setMultiSelectedDates(new Set()); setShiftSelectionAnchorDate(null); setIsFiveTwoFillArmed(false);
    }
  };

  const handleBulkFillWeekdays = (fillType: AttendanceEntry['type'], overwrite: boolean) => {
    if (!canAdminEdit) return;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let updatedAttendance = [...currentAttendanceData];
    for (let day = 1; day <= daysInMonth; day++) {
        const utcDate = new Date(Date.UTC(year, month, day));
        const dayOfWeek = utcDate.getUTCDay(); // Sunday = 0, Monday = 1
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { 
            const dateString = utcDate.toISOString().split('T')[0];
            const entryIndex = updatedAttendance.findIndex(entry => entry.date === dateString);
            if (entryIndex === -1) { 
                updatedAttendance.push({ date: dateString, type: fillType });
            } else if (overwrite) { 
                updatedAttendance[entryIndex].type = fillType;
                updatedAttendance[entryIndex].notes = undefined; 
            }
        }
    }
    onAttendanceChange(updatedAttendance.sort((a,b) => a.date.localeCompare(b.date)));
  };

  const handleClearWeekdays = () => {
    if (!canAdminEdit) return;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const updatedAttendance = (currentAttendanceData || []).filter(entry => {
        const entryDate = new Date(entry.date + 'T00:00:00Z');
        if (entryDate.getUTCFullYear() === year && entryDate.getUTCMonth() === month) {
            const dayOfWeek = entryDate.getUTCDay(); 
            return !(dayOfWeek >= 1 && dayOfWeek <= 5); // Don't keep if it's a weekday
        }
        return true; 
    });
    onAttendanceChange(updatedAttendance.sort((a,b) => a.date.localeCompare(b.date)));
};

  const handleAttendanceTypeButtonClick = (type: AttendanceEntry['type'] | 'clear' | 'fill_5_2' | 'clear_all_month') => {
    if (!canAdminEdit) return;

    if (type === 'clear_all_month') { 
        // Simplified: just clear for current month directly for now or use a confirm if needed
        const year = currentCalendarDate.getFullYear(); const month = currentCalendarDate.getMonth();
        onAttendanceChange((currentAttendanceData || []).filter(entry => {
            const entryDate = new Date(entry.date);
            return !(entryDate.getUTCFullYear() === year && entryDate.getUTCMonth() === month);
        }));
        return; 
    }
    
    if (type === 'fill_5_2') {
        setIsFiveTwoFillArmed(prev => !prev);
        setSelectedCalendarDateForEdit(null); setMultiSelectedDates(new Set()); setShiftSelectionAnchorDate(null); setPendingFillTypeFor52(null);
        return;
    }

    if (isFiveTwoFillArmed) {
        if (type === 'clear') { 
            handleClearWeekdays();
        } else { 
            setPendingFillTypeFor52(type as AttendanceEntry['type']);
            // Simplified: trigger immediate fill for now
            handleBulkFillWeekdays(type as AttendanceEntry['type'], true);
        }
        setIsFiveTwoFillArmed(false); 
        return;
    }
    
    const datesToUpdate: string[] = [];
    if (multiSelectedDates.size > 0) {
        multiSelectedDates.forEach(date => datesToUpdate.push(date));
    } else if (selectedCalendarDateForEdit) {
        datesToUpdate.push(selectedCalendarDateForEdit);
    }

    if (datesToUpdate.length === 0 && type !== 'clear') return;

    let updatedAttendance = [...currentAttendanceData];
    if (type === 'clear') {
        updatedAttendance = updatedAttendance.filter(entry => !datesToUpdate.includes(entry.date));
    } else {
        datesToUpdate.forEach(dateStr => {
            const entryIndex = updatedAttendance.findIndex(entry => entry.date === dateStr);
            if (entryIndex > -1) {
                updatedAttendance[entryIndex].type = type as AttendanceEntry['type'];
                updatedAttendance[entryIndex].notes = undefined; 
            } else {
                updatedAttendance.push({ date: dateStr, type: type as AttendanceEntry['type'] });
            }
        });
    }
    onAttendanceChange(updatedAttendance.sort((a,b) => a.date.localeCompare(b.date)));
    
    setMultiSelectedDates(new Set()); setShiftSelectionAnchorDate(null);
    if (multiSelectedDates.size > 0) setSelectedCalendarDateForEdit(null);
  };
  
  const handleAttendanceNotesChange = (dateStr: string | null, notes: string) => {
    if (!canAdminEdit || !dateStr) return;
    const newAttendance = [...currentAttendanceData];
    const entryIndex = newAttendance.findIndex(e => e.date === dateStr);
    if (entryIndex > -1) {
        newAttendance[entryIndex].notes = notes || undefined; 
    }
    onAttendanceChange(newAttendance);
  };

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth(); 
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const dayCells = [];
  const displayFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth -1; 

  for (let i = 0; i < displayFirstDay; i++) dayCells.push(<div key={`blank-${i}`} className="p-1.5 border border-brand-surface"></div>);

  for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
      const attendanceEntry = (currentAttendanceData || []).find(a => a.date === dateStr);
      const type = attendanceEntry?.type;
      const colorInfo = type ? ATTENDANCE_TYPE_COLORS[type] : null;
      const isCurrentDay = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isSingleSelectedForEdit = dateStr === selectedCalendarDateForEdit;
      const isMultiSelected = multiSelectedDates.has(dateStr);
      const isShiftAnchor = dateStr === shiftSelectionAnchorDate;

      let dayClasses = `h-10 w-full flex items-center justify-center text-xs border transition-all rounded-sm `;
      dayClasses += colorInfo ? `${colorInfo.bg} ${colorInfo.text} ` : `bg-brand-surface hover:bg-brand-secondary `;
      dayClasses += isCurrentDay ? `ring-2 ring-offset-1 ring-offset-brand-card ring-blue-400 ` : `border-brand-border `;
      if (isSingleSelectedForEdit || isMultiSelected || isShiftAnchor) dayClasses += `ring-2 ring-offset-1 ring-offset-brand-card ${isSingleSelectedForEdit ? 'ring-sky-400' : isMultiSelected ? 'ring-indigo-400' : 'ring-pink-400'} scale-105 z-10 `;
      dayClasses += !canAdminEdit ? `cursor-default ` : `cursor-pointer `;

      dayCells.push(
          <Tooltip key={day} text={attendanceEntry ? `${ATTENDANCE_TYPE_LABELS[type!]} ${attendanceEntry.notes ? `(${attendanceEntry.notes})` : ''}` : 'Нет данных'} position="top">
              <button type="button" onClick={(e) => handleCalendarDayInteraction(dateStr, e)} disabled={!canAdminEdit} className={dayClasses} aria-label={`Выбрать ${day} ${MONTH_NAMES[month]}`} aria-pressed={isSingleSelectedForEdit || isMultiSelected}>
                  {day}
              </button>
          </Tooltip>
      );
  }

  const attendanceButtonsConfig = [
      ...Object.entries(ATTENDANCE_TYPE_LABELS).map(([typeKey, label]: [string, string]) => ({
          id: typeKey as AttendanceEntry['type'], 
          label: label,
          action: () => handleAttendanceTypeButtonClick(typeKey as AttendanceEntry['type']),
          style: `${ATTENDANCE_TYPE_COLORS[typeKey as AttendanceEntry['type']].pill} hover:opacity-80 hover:ring-1 hover:ring-current`, 
          isTypeButton: true,
      })),
      { id: 'clear' as const, label: 'Пусто', action: () => handleAttendanceTypeButtonClick('clear'), style: 'bg-zinc-700/30 text-zinc-200 hover:bg-zinc-600/50 hover:ring-1 hover:ring-zinc-400', isTypeButton: false },
      { id: 'fill_5_2' as const, label: 'Заполнить 5/2', action: () => handleAttendanceTypeButtonClick('fill_5_2'), style: isFiveTwoFillArmed ? 'bg-sky-500 text-white ring-2 ring-sky-300' : 'bg-teal-500/30 text-teal-300 hover:bg-teal-500/50 hover:ring-1 hover:ring-teal-200', isTypeButton: false },
      { id: 'clear_all_month' as const, label: 'Стереть весь месяц', action: () => handleAttendanceTypeButtonClick('clear_all_month'), style: 'bg-red-700/30 text-red-200 hover:bg-red-600/50 hover:ring-1 hover:ring-red-300', isTypeButton: false },
  ];

  return (
      <div>
          <div className="flex justify-between items-center mb-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))} aria-label="Предыдущий месяц"><ArrowLeftIcon className="h-5 w-5"/></Button>
              <h5 className="text-md font-semibold text-brand-text-primary">{MONTH_NAMES[month]} {year}</h5>
              <Button variant="ghost" size="sm" onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))} aria-label="Следующий месяц"><ChevronRightIcon className="h-5 w-5"/></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-brand-text-muted mb-1">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">{dayCells}</div>
          {canAdminEdit && (
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  {attendanceButtonsConfig.map(btn => (
                      <Button key={btn.id} type="button" onClick={btn.action} disabled={!canAdminEdit} className={`px-3 py-1.5 rounded-md transition-colors ${btn.style} ${(!canAdminEdit || (btn.isTypeButton && !isFiveTwoFillArmed && selectedCalendarDateForEdit === null && multiSelectedDates.size === 0 && btn.id !== 'fill_5_2' && btn.id !== 'clear_all_month')) ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label={btn.label} aria-pressed={(btn.id === 'fill_5_2' && isFiveTwoFillArmed) || undefined}>
                          {btn.label}
                      </Button>
                  ))}
              </div>
          )}
           {(selectedCalendarDateForEdit || multiSelectedDates.size > 0 || isFiveTwoFillArmed) && canAdminEdit && (
              <p className="text-xs text-sky-400 mt-1">
                  {isFiveTwoFillArmed ? "Режим 'Заполнить 5/2' активен. Выберите тип дня для заполнения или нажмите 'Пусто' для очистки будней, или 'Заполнить 5/2' снова для отмены." : 
                   multiSelectedDates.size > 0 ? `Выбрано дней: ${multiSelectedDates.size}. ` : 
                   selectedCalendarDateForEdit ? `Выбрана дата: ${new Date(selectedCalendarDateForEdit + "T00:00:00Z").toLocaleDateString('ru-RU', {timeZone: 'UTC'})}. ` : ''}
                  {(!isFiveTwoFillArmed && (selectedCalendarDateForEdit || multiSelectedDates.size > 0)) && "Нажмите на тип выше. (Ctrl/Shift+клик для выбора нескольких)"}
              </p>
          )}
          {selectedCalendarDateForEdit && canAdminEdit && (
              <div className="mt-3">
                  <label htmlFor={`notes-${selectedCalendarDateForEdit}`} className="block text-sm font-medium text-brand-text-primary mb-1">Заметка к {new Date(selectedCalendarDateForEdit + "T00:00:00Z").toLocaleDateString('ru-RU', {timeZone: 'UTC'})}:</label>
                  <Input 
                      id={`notes-${selectedCalendarDateForEdit}`} 
                      type="text" 
                      value={(currentAttendanceData || []).find(e => e.date === selectedCalendarDateForEdit)?.notes || ''} 
                      onChange={(e) => handleAttendanceNotesChange(selectedCalendarDateForEdit, e.target.value)} 
                      placeholder="Причина опоздания, детали командировки и т.д."
                      className="text-sm"
                  />
              </div>
          )}
      </div>
  );
};
