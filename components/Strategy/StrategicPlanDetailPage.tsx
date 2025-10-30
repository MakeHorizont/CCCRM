import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Card from '../UI/Card';
import { StrategicPlan, StrategicSubTask, User, SortableStrategicSubTaskKeys } from '../../types';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { ArrowLeftIcon, PlusIcon, ArrowsUpDownIcon, ArrowPathIcon, ChevronRightIcon } from '../UI/Icons';
import { ROUTE_PATHS } from '../../constants';
import SubTaskModal from './SubTaskModal';
import StrategicPlanTimelineView from './StrategicPlanTimelineView';
import { useAuth } from '../../hooks/useAuth';
import { RecursiveSubTaskItem } from './RecursiveSubTaskItem';

type ViewType = 'list' | 'timeline';

const StrategicPlanDetailPage: React.FC = () => {
    const { planId } = useParams<{ planId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    
    const [plan, setPlan] = useState<StrategicPlan | null>(null);
    const [usersForAssigning, setUsersForAssigning] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInteracting, setIsInteracting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewType, setViewType] = useState<ViewType>('list');

    const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
    const [editingSubTaskData, setEditingSubTaskData] = useState<Partial<StrategicSubTask> | null>(null);
    
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: SortableStrategicSubTaskKeys, direction: 'asc' | 'desc' } | null>(null);
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }), useSensor(KeyboardSensor));

    const fetchPlanAndUsers = useCallback(async () => {
        if (!planId) {
            setError("ID плана не найден.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const [planData, usersData] = await Promise.all([
                apiService.getStrategicPlanById(planId),
                currentUser ? apiService.getUsersForAssignee(currentUser.id) : Promise.resolve([])
            ]);
            if (planData) {
                setPlan(planData);
                if (breadcrumbs.length === 0) {
                    setBreadcrumbs([{ id: null, name: planData.title }]);
                }
            } else {
                setError("Стратегический план не найден.");
            }
            setUsersForAssigning(usersData);
        } catch (err) {
            setError("Ошибка загрузки данных плана.");
        } finally {
            setIsLoading(false);
        }
    }, [planId, currentUser, breadcrumbs.length]);

    useEffect(() => {
        fetchPlanAndUsers();
    }, [fetchPlanAndUsers]);

    const handleOpenSubTaskModal = (parentSubTask?: StrategicSubTask) => {
        setEditingSubTaskData({ parentId: parentSubTask?.id || currentParentId });
        setIsSubTaskModalOpen(true);
    };

    const handleSaveSubTask = async (subTaskData: Partial<StrategicSubTask>) => {
        if (!planId) return;
        setIsInteracting(true);
        try {
            let updatedPlan;
            if (subTaskData.id) {
                updatedPlan = await apiService.updateStrategicSubTask(planId, subTaskData as StrategicSubTask);
            } else {
                updatedPlan = await apiService.addStrategicSubTask(planId, subTaskData as any);
            }
            setPlan(updatedPlan);
            setIsSubTaskModalOpen(false);
            setEditingSubTaskData(null);
        } catch (err) {
            setError((err as Error).message);
            throw err;
        } finally {
            setIsInteracting(false);
        }
    };
    
    const handleDragStart = (event: DragEndEvent) => setActiveDragId(event.active.id);

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragId(null);
        if (!plan) return;
        setIsInteracting(true);
        setError(null);
        try {
            const updatedPlan = await apiService.handleSubTaskDragEnd(event, plan, currentParentId);
            setPlan(updatedPlan);
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsInteracting(false);
        }
    };
    
    const handleNavigateToChildren = (subTask: StrategicSubTask) => {
        setCurrentParentId(subTask.id);
        setBreadcrumbs(prev => [...prev, { id: subTask.id, name: subTask.title }]);
    };
    
    const handleBreadcrumbClick = (index: number) => {
        setBreadcrumbs(prev => prev.slice(0, index + 1));
        setCurrentParentId(breadcrumbs[index].id);
    };


    const displayedSubTasks = useMemo(() => {
        if (!plan) return [];
        return apiService.getAndSortDisplayedSubTasks(plan, currentParentId, sortConfig);
    }, [plan, currentParentId, sortConfig]);

    if (isLoading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
    if (error) return <p className="text-red-500 text-center p-4">{error}</p>;
    if (!plan) return <p className="text-center p-4">План не найден.</p>;
    
    const draggedItem = activeDragId ? apiService.findSubTaskInPlan(plan, activeDragId as string) : null;

    return (
        <div className="space-y-4">
             <Button onClick={() => navigate(ROUTE_PATHS.STRATEGY)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку планов
            </Button>
            
            <Card>
                <h1 className="text-2xl font-bold">{plan.title}</h1>
                <p className="text-sm text-brand-text-secondary">{plan.description}</p>
                 <div className="mt-2 text-xs">
                    <p><strong>Статус:</strong> {plan.status}</p>
                    <p><strong>Ответственный:</strong> {plan.owner}</p>
                    <p><strong>Сроки:</strong> {plan.timeline}</p>
                </div>
            </Card>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Задачи плана</h2>
                <div className="flex space-x-2">
                     <Button variant={viewType === 'list' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewType('list')}>Список</Button>
                     <Button variant={viewType === 'timeline' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewType('timeline')}>Временная шкала</Button>
                </div>
            </div>

            {viewType === 'timeline' ? (
                <Card>
                    <StrategicPlanTimelineView plan={plan} users={usersForAssigning} />
                </Card>
            ) : (
                <Card>
                    <div className="flex items-center justify-between mb-2">
                        <nav aria-label="Breadcrumbs" className="text-sm text-brand-text-muted flex items-center flex-wrap">
                          {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.id || 'root'}>
                              {index > 0 && <ChevronRightIcon className="h-4 w-4 mx-1" />}
                              <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={`hover:underline ${index === breadcrumbs.length - 1 ? 'font-semibold text-brand-text-primary' : ''}`}
                                disabled={index === breadcrumbs.length - 1 || isInteracting}
                              >
                                {crumb.name}
                              </button>
                            </React.Fragment>
                          ))}
                        </nav>
                        <Button onClick={() => handleOpenSubTaskModal()} size="sm" leftIcon={<PlusIcon className="h-4 w-4"/>} disabled={plan.isArchived || isInteracting}>
                            Добавить подзадачу
                        </Button>
                    </div>
                     <div className="min-h-[400px]">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <SortableContext items={displayedSubTasks.map(st => st.id)} strategy={verticalListSortingStrategy}>
                            {displayedSubTasks.map((subTask, index) => (
                               <RecursiveSubTaskItem
                                  key={subTask.id}
                                  subTask={subTask}
                                  planId={plan.id}
                                  planIsArchived={plan.isArchived}
                                  onUpdate={async (pId, task) => setPlan(await apiService.updateStrategicSubTask(pId, task))}
                                  onDelete={async (pId, taskId) => setPlan(await apiService.deleteStrategicSubTask(pId, taskId))}
                                  onSendToKanban={async (pId, taskId) => {
                                    setIsInteracting(true);
                                    await apiService.createKanbanTaskFromStrategicSubTask(pId, taskId);
                                    await fetchPlanAndUsers();
                                    setIsInteracting(false);
                                  }}
                                  onAddNestedSubTask={(pId, parentTask) => handleOpenSubTaskModal(parentTask)}
                                  onNavigateToChildren={handleNavigateToChildren}
                                  usersForAssigning={usersForAssigning}
                                  currentUserId={currentUser?.id}
                                  depth={0} // Relative depth for this view is always 0
                                  isDraggable={true}
                               />
                            ))}
                            </SortableContext>
                            <DragOverlay dropAnimation={null}>
                                {draggedItem ? <RecursiveSubTaskItem subTask={draggedItem} planId={plan.id} planIsArchived={plan.isArchived} onUpdate={async()=>{}} onDelete={async()=>{}} onSendToKanban={()=>{}} onAddNestedSubTask={()=>{}} usersForAssigning={usersForAssigning} currentUserId={currentUser?.id} depth={0} isDraggable={false} isOverlay/> : null}
                            </DragOverlay>
                        </DndContext>
                     </div>
                </Card>
            )}
             {isSubTaskModalOpen && (
                <SubTaskModal
                    isOpen={isSubTaskModalOpen}
                    onClose={() => setIsSubTaskModalOpen(false)}
                    onSave={handleSaveSubTask}
                    editingSubTaskData={editingSubTaskData || {}}
                    usersForAssigning={usersForAssigning}
                    isSaving={isInteracting}
                />
            )}
        </div>
    );
};

export default StrategicPlanDetailPage;