
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { StrategicPlan, StrategicSubTask, User } from '../../types';
import { getAssigneeColor } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { LinkIcon } from '../UI/Icons';
import Button from '../UI/Button';

interface StrategicPlanTimelineViewProps {
  plan: StrategicPlan;
  users: User[];
}

type TimeScale = 'days' | 'weeks' | 'months';

const StrategicPlanTimelineView: React.FC<StrategicPlanTimelineViewProps> = ({ plan, users }) => {
  const [timeScale, setTimeScale] = useState<TimeScale>('weeks');
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const taskNameColumnRef = useRef<HTMLDivElement>(null); // Ref for the task name column
  const taskNameHeaderRef = useRef<HTMLDivElement>(null); // Ref for the task name header

  const ROW_HEIGHT = 40; // px, increased for better readability
  const TASK_NAME_COLUMN_WIDTH = '18rem'; // Tailwind w-72

  const getAllSubtasksFlat = useCallback((subTasks: StrategicSubTask[], depth = 0): (StrategicSubTask & { depth: number })[] => {
    let flatList: (StrategicSubTask & { depth: number })[] = [];
    subTasks.forEach(task => {
      flatList.push({ ...task, depth });
      if (task.subTasks && task.subTasks.length > 0) {
        flatList = flatList.concat(getAllSubtasksFlat(task.subTasks, depth + 1));
      }
    });
    return flatList;
  }, []);

  const allTasksWithDepth = useMemo(() => getAllSubtasksFlat(plan.subTasks || []), [plan.subTasks, getAllSubtasksFlat]);

  const { overallMinDate, overallMaxDate } = useMemo(() => {
    if (allTasksWithDepth.length === 0) {
      const today = new Date();
      return { overallMinDate: today, overallMaxDate: new Date(new Date(today).setDate(today.getDate() + 30)) };
    }
    let minTimestamp = Infinity;
    let maxTimestamp = -Infinity;

    allTasksWithDepth.forEach(task => {
      const taskStart = task.createdAt ? new Date(task.createdAt).getTime() : null;
      const taskEnd = task.dueDate ? new Date(task.dueDate).getTime() : null;

      if (taskStart) minTimestamp = Math.min(minTimestamp, taskStart);
      if (taskEnd) maxTimestamp = Math.max(maxTimestamp, taskEnd);
      
      // If a task only has a start or end date, ensure it's included in the range
      if (taskStart && !taskEnd) maxTimestamp = Math.max(maxTimestamp, taskStart);
      if (!taskStart && taskEnd) minTimestamp = Math.min(minTimestamp, taskEnd);

    });
    
    const defaultMin = new Date();
    let defaultMax = new Date(new Date().setDate(defaultMin.getDate() + 30)); // Default 30 days range

    const finalMinDate = minTimestamp === Infinity ? defaultMin : new Date(minTimestamp);
    let finalMaxDate = maxTimestamp === -Infinity ? defaultMax : new Date(maxTimestamp);

    // Ensure there's at least a minimal range (e.g., 7 days for tasks without due dates)
    if (finalMinDate.getTime() === finalMaxDate.getTime()) {
        finalMaxDate = new Date(new Date(finalMinDate).setDate(finalMinDate.getDate() + 7));
    }
    if (finalMinDate.getTime() > finalMaxDate.getTime()) { // Should not happen if logic above is correct
        finalMaxDate = new Date(new Date(finalMinDate).setDate(finalMinDate.getDate() + 7));
    }


    return {
      overallMinDate: finalMinDate,
      overallMaxDate: finalMaxDate,
    };
  }, [allTasksWithDepth]);

  const getScaleUnitWidth = useCallback((): number => {
    switch (timeScale) {
      case 'days': return 50;
      case 'weeks': return 140;
      case 'months': return 300;
      default: return 140;
    }
  }, [timeScale]);

  const timeUnits = useMemo(() => {
    const units: { label: string; startDate: Date; endDate: Date }[] = [];
    let current = new Date(overallMinDate);
    current.setUTCHours(0, 0, 0, 0);

    const endDateLimit = new Date(overallMaxDate);
    endDateLimit.setUTCHours(23, 59, 59, 999);

    if (timeScale === 'days') {
      current.setUTCDate(current.getUTCDate() - 3); // Padding start
      let tempEndDate = new Date(endDateLimit);
      tempEndDate.setUTCDate(tempEndDate.getUTCDate() + 3); // Padding end

      while (current <= tempEndDate) {
        units.push({
          label: current.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
          startDate: new Date(current),
          endDate: new Date(current),
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }
    } else if (timeScale === 'weeks') {
      let startOfWeek = new Date(current);
      startOfWeek.setUTCDate(current.getUTCDate() - (current.getUTCDay() === 0 ? 6 : current.getUTCDay() - 1)); // Monday
      startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7); // Padding start (one week before)
      
      let tempEndDate = new Date(endDateLimit);
      tempEndDate.setUTCDate(tempEndDate.getUTCDate() + 7); // Padding end

      current = startOfWeek;
      while (current <= tempEndDate) {
        const weekEnd = new Date(current);
        weekEnd.setUTCDate(current.getUTCDate() + 6);
        units.push({
          label: `Нед ${current.toLocaleDateString('ru-RU', { day: '2-digit' })} - ${weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}`,
          startDate: new Date(current),
          endDate: weekEnd,
        });
        current.setUTCDate(current.getUTCDate() + 7);
      }
    } else { // months
      current = new Date(Date.UTC(overallMinDate.getUTCFullYear(), overallMinDate.getUTCMonth() -1 , 1)); // Padding start
      let tempEndDate = new Date(Date.UTC(endDateLimit.getUTCFullYear(), endDateLimit.getUTCMonth() + 2, 0)); // Padding end

      while (current <= tempEndDate) {
        const monthEnd = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0));
        units.push({
          label: current.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
          startDate: new Date(current),
          endDate: monthEnd,
        });
        current.setUTCMonth(current.getUTCMonth() + 1);
      }
    }
    return units;
  }, [overallMinDate, overallMaxDate, timeScale]);

  const getTaskPositionAndWidth = useCallback((task: StrategicSubTask) => {
    const taskStart = task.createdAt ? new Date(task.createdAt) : new Date();
    let taskEnd = task.dueDate ? new Date(task.dueDate) : null;

    taskStart.setUTCHours(0,0,0,0);
    if (!taskEnd) { // If no due date, make it a 1-unit duration based on current scale
        taskEnd = new Date(taskStart);
        if (timeScale === 'days') taskEnd.setUTCDate(taskStart.getUTCDate()); // Effectively 1 day wide minimum
        else if (timeScale === 'weeks') taskEnd.setUTCDate(taskStart.getUTCDate() + 6);
        else taskEnd.setUTCMonth(taskStart.getUTCMonth() + 1, 0);
    }
    taskEnd.setUTCHours(23,59,59,999);


    const timelineStartMs = timeUnits[0].startDate.getTime();
    const totalTimelineDurationMs = timeUnits[timeUnits.length -1].endDate.getTime() - timelineStartMs +1; // +1 to include full end day

    const taskStartMs = taskStart.getTime();
    const taskEndMs = taskEnd.getTime();

    const unitWidthPx = getScaleUnitWidth();
    let left = 0;
    let width = 0;

    if (timeScale === 'days') {
        const dayDurationMs = 24 * 60 * 60 * 1000;
        left = ((taskStartMs - timelineStartMs) / dayDurationMs) * unitWidthPx;
        width = Math.max(unitWidthPx * 0.2, ((taskEndMs - taskStartMs + dayDurationMs) / dayDurationMs) * unitWidthPx); // Minimum width of 20% of a day cell
    } else if (timeScale === 'weeks') {
        const weekDurationMs = 7 * 24 * 60 * 60 * 1000;
        left = ((taskStartMs - timelineStartMs) / weekDurationMs) * unitWidthPx;
        width = Math.max(unitWidthPx * 0.2, ((taskEndMs - taskStartMs + weekDurationMs) / weekDurationMs) * unitWidthPx);
    } else { // months
        // Average month duration isn't precise, so calculate based on unit start/end
        const monthIndexStart = timeUnits.findIndex(u => taskStartMs <= u.endDate.getTime());
        const monthIndexEnd = timeUnits.findIndex(u => taskEndMs <= u.endDate.getTime());

        if (monthIndexStart !== -1) {
            const startUnit = timeUnits[monthIndexStart];
            const startFraction = (taskStartMs - startUnit.startDate.getTime()) / (startUnit.endDate.getTime() - startUnit.startDate.getTime() + 1);
            left = (monthIndexStart + startFraction) * unitWidthPx;
        }

        if (monthIndexEnd !== -1) {
            const endUnit = timeUnits[monthIndexEnd];
            const endFraction = (taskEndMs - endUnit.startDate.getTime() + 1) / (endUnit.endDate.getTime() - endUnit.startDate.getTime() + 1);
            width = Math.max(unitWidthPx * 0.2, ((monthIndexEnd + endFraction) * unitWidthPx) - left);
        } else if (taskEndMs > timeUnits[timeUnits.length -1].endDate.getTime()){ // If task ends after last unit
             width = Math.max(unitWidthPx * 0.2, (timeUnits.length * unitWidthPx) - left);
        }
    }
    
    return { left: Math.max(0,left), width: Math.max(unitWidthPx * 0.15, width) }; // Ensure positive width and min width
  }, [timeUnits, timeScale, getScaleUnitWidth]);


  useEffect(() => {
    const syncScroll = () => {
      if (headerScrollRef.current && contentScrollRef.current) {
        headerScrollRef.current.scrollLeft = contentScrollRef.current.scrollLeft;
      }
    };
    contentScrollRef.current?.addEventListener('scroll', syncScroll);
    return () => contentScrollRef.current?.removeEventListener('scroll', syncScroll);
  }, []);

  return (
    <div className="space-y-3 flex flex-col h-full text-xs">
      <div className="flex justify-end space-x-2 items-center flex-shrink-0">
        <span className="text-xs text-brand-text-muted">Масштаб:</span>
        {(['days', 'weeks', 'months'] as TimeScale[]).map(scale => (
          <Button key={scale} size="sm" variant={timeScale === scale ? 'primary' : 'secondary'} onClick={() => setTimeScale(scale)}>
            {scale === 'days' ? 'Дни' : scale === 'weeks' ? 'Недели' : 'Месяцы'}
          </Button>
        ))}
      </div>

      <div className="flex-grow grid grid-rows-[auto_1fr] border border-brand-border rounded-md overflow-hidden bg-brand-surface">
        {/* Header Row */}
        <div className="grid grid-cols-[minmax(0,_auto)_1fr] sticky top-0 z-30 bg-brand-card border-b border-brand-border shadow-sm" style={{height: `${ROW_HEIGHT}px`}}>
          <div ref={taskNameHeaderRef} className="font-semibold p-2 border-r border-brand-border sticky left-0 bg-brand-card z-40 flex items-center" style={{width: TASK_NAME_COLUMN_WIDTH}}>
            Задача
          </div>
          <div ref={headerScrollRef} className="overflow-x-hidden"> {/* This will be scrolled by JS */}
            <div className="flex h-full" style={{ width: `${timeUnits.length * getScaleUnitWidth()}px` }}>
              {timeUnits.map((unit, index) => (
                <div key={index} className="text-center p-1 border-r border-brand-border text-brand-text-muted flex items-center justify-center"
                     style={{ width: `${getScaleUnitWidth()}px`, minWidth: `${getScaleUnitWidth()}px` }}>
                  {unit.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area (Tasks + Timeline Grid) */}
        <div className="grid grid-cols-[minmax(0,_auto)_1fr] overflow-auto custom-scrollbar-thin">
          {/* Task Names Column (Sticky) */}
          <div ref={taskNameColumnRef} className="sticky left-0 bg-brand-surface z-20 border-r border-brand-border" style={{width: TASK_NAME_COLUMN_WIDTH}}>
            {allTasksWithDepth.map(task => (
              <div key={`${task.id}-name`} className="h-10 truncate py-1 pr-2 border-b border-brand-border flex items-center group hover:bg-brand-secondary"
                   style={{ paddingLeft: `${task.depth * 15 + 10}px`, height: `${ROW_HEIGHT}px` }} title={task.title}>
                {task.title}
              </div>
            ))}
          </div>

          {/* Timeline Bars Area (Scrollable) */}
          <div ref={contentScrollRef} className="overflow-x-auto custom-scrollbar-thin relative">
            <div style={{ width: `${timeUnits.length * getScaleUnitWidth()}px`, height: `${allTasksWithDepth.length * ROW_HEIGHT}px` }} className="relative">
              {/* Vertical grid lines */}
              {timeUnits.map((_, index) => (
                <div key={`vline-${index}`} className="absolute top-0 bottom-0 border-r border-brand-border/50"
                     style={{ left: `${(index + 1) * getScaleUnitWidth()}px`, width: '1px' }}>
                </div>
              ))}
              {/* Horizontal grid lines & Task Bars */}
              {allTasksWithDepth.map((task, taskIndex) => {
                const { left, width } = getTaskPositionAndWidth(task);
                const assignee = users.find(u => u.id === task.assigneeId);
                const assigneeColor = getAssigneeColor(task.assigneeId);
                const progress = task.completed ? 100 : task.progress || 0;
                const topPosition = taskIndex * ROW_HEIGHT;

                return (
                  <React.Fragment key={`${task.id}-row`}>
                    <div className="absolute left-0 right-0 border-b border-brand-border/50" 
                         style={{ top: `${topPosition + ROW_HEIGHT -1}px`, height: '1px' }}> {/* -1 to align with bottom border */}
                    </div>
                     <Tooltip text={`${task.title} (Прогресс: ${progress}%) ${assignee ? `Исп: ${assignee.name || assignee.email}` : ''}${task.dueDate ? ` Срок: ${new Date(task.dueDate).toLocaleDateString()}` : ''}`}>
                        <div
                          className={`absolute h-6 rounded flex items-center px-1.5 text-white text-[10px] shadow-sm transition-all duration-150 ease-in-out ${task.completed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-sky-600 hover:bg-sky-500'}`}
                          style={{ top: `${topPosition + (ROW_HEIGHT - 24) / 2}px`, left: `${left}px`, width: `${width}px` }}
                        >
                          <div className={`absolute top-0 left-0 h-full rounded ${task.completed ? 'bg-emerald-700/70' : 'bg-sky-700/70'}`} style={{width: `${progress}%`}}></div>
                          <span className="relative truncate z-10 flex items-center">
                            {assignee && (
                              <span className={`w-3 h-3 rounded-full ${assigneeColor} flex items-center justify-center text-white text-[8px] font-semibold mr-1 flex-shrink-0`}>
                                {assignee.name ? assignee.name.substring(0,1).toUpperCase() : assignee.email.substring(0,1).toUpperCase()}
                              </span>
                            )}
                            {task.title}
                            {task.kanbanTaskId && <LinkIcon className="h-2.5 w-2.5 ml-0.5 text-sky-200 inline-block flex-shrink-0"/>}
                          </span>
                        </div>
                    </Tooltip>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategicPlanTimelineView;

