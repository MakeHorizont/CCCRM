import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { KanbanTask, KanbanTaskStatus, User, KanbanBoard, KanbanChecklistItem } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { ROUTE_PATHS } from '../../constants';
import { ArrowLeftIcon, PencilSquareIcon, SaveIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, ListBulletIcon, BeakerIcon, SparklesIcon } from '../UI/Icons';
import ConfirmationModal from '../UI/ConfirmationModal';
import TaskDetailsTab from './tabs/TaskDetailsTab';
import TaskChecklistTab from './tabs/TaskChecklistTab';
import TaskDialecticsTab from './tabs/TaskDialecticsTab';

type EditorMode = 'view' | 'edit';
type ActiveTab = 'details' | 'checklist' | 'dialectics';

const KanbanTaskEditorPage: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const isNew = location.pathname.endsWith('/new');
    
    const [task, setTask] = useState<Partial<KanbanTask> | null>(null);
    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('details');

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allBoards, setAllBoards] = useState<KanbanBoard[]>([]);

    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchTaskData = async () => {
            if (!currentUser) return;
            setIsLoading(true);
            setError(null);
            try {
                const [usersData, boardsData] = await Promise.all([
                    apiService.getUsersForAssignee(currentUser.id),
                    apiService.getKanbanBoards(currentUser.id, currentUser.functionalRoles || [])
                ]);
                setAllUsers(usersData);
                setAllBoards(boardsData);

                if (isNew) {
                    const params = new URLSearchParams(location.search);
                    const boardId = params.get('boardId');
                    setTask({
                        title: '', description: '', status: KanbanTaskStatus.TODO,
                        boardIds: boardId ? [boardId] : [],
                        checklist: [], showInMyTasks: false,
                    });
                    setMode('edit');
                } else {
                    const taskData = await apiService.getKanbanTaskById(taskId!);
                    if (taskData) {
                        setTask(taskData);
                    } else {
                        setError("Задача не найдена.");
                    }
                    setMode('view');
                }
            } catch (err) {
                setError("Ошибка загрузки данных задачи.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTaskData();
    }, [taskId, isNew, location.search, currentUser]);

    const handleConfirmSave = async () => {
        if(!task || !task.title?.trim()) {
            setError("Название задачи обязательно.");
            setIsSaveConfirmOpen(false);
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            let savedTask;
            if (isNew) {
                savedTask = await apiService.addKanbanTask(task as any);
            } else {
                savedTask = await apiService.updateKanbanTask(task as KanbanTask);
            }
            const boardId = savedTask?.boardIds?.[0];
            navigate(boardId ? `${ROUTE_PATHS.KANBAN_BOARD}/${boardId}` : ROUTE_PATHS.KANBAN_MY_TASKS);
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };

    const handleArchiveToggle = async () => {
        if (!task || !task.id) return;
        setIsSaving(true);
        try {
            await apiService.archiveKanbanTask(task.id, !task.isArchived);
            navigate(-1);
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsArchiveConfirmOpen(false);
        }
    };

    const handleDelete = async () => {
        if (!task || !task.id) return;
        setIsSaving(true);
        try {
            await apiService.deleteKanbanTask(task.id);
            navigate(-1);
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsDeleteConfirmOpen(false);
        }
    };

    const handleAddStageEntry = async (stage: 'potential' | 'contradictions' | 'solution', text: string) => {
        if (!task || !task.id) return;
        setIsSaving(true);
        try {
            const updatedTask = await apiService.addTaskStageEntry(task.id, stage, text, []);
            setTask(updatedTask);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;
    if (error && !task) return <p className="text-red-500 text-center p-4">{error}</p>;
    if (!task) return null;

    const pageTitle = isNew ? 'Новая задача' : (mode === 'edit' ? `Редактирование: ${task.title}` : task.title);

    const tabConfig = [
        { id: 'details' as ActiveTab, label: 'Детали', icon: PencilSquareIcon },
        { id: 'checklist' as ActiveTab, label: `Чек-лист (${task.checklist?.length || 0})`, icon: ListBulletIcon },
        { id: 'dialectics' as ActiveTab, label: 'Диалектика', icon: SparklesIcon },
    ];

    return (
        <div className="space-y-4">
            <Button onClick={() => navigate(-1)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                Назад
            </Button>
            <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold truncate pr-4">{pageTitle}</h1>
                    <div className="flex space-x-2">
                        {mode === 'view' && !task.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !task.isArchived && (
                            <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>

                <div className="border-b border-brand-border mb-4">
                    <nav className="-mb-px flex space-x-2">
                        {tabConfig.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-sky-500 text-sky-400' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'}`}
                            >
                                <tab.icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? 'text-sky-400' : 'text-brand-text-muted'}`}/>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {error && <p className="text-red-500 text-sm p-2 bg-red-500/10 rounded-md mb-2">{error}</p>}
                
                <div className={activeTab === 'details' ? 'block' : 'hidden'}>
                    <TaskDetailsTab taskData={task} setTaskData={setTask} isEditing={mode==='edit'} allUsers={allUsers} allBoards={allBoards} />
                </div>
                <div className={activeTab === 'checklist' ? 'block' : 'hidden'}>
                    <TaskChecklistTab taskData={task} setTaskData={setTask} isEditing={mode==='edit'} />
                </div>
                <div className={activeTab === 'dialectics' ? 'block' : 'hidden'}>
                    <TaskDialecticsTab taskData={task} onAddEntry={handleAddStageEntry} isSaving={isSaving} />
                </div>
                
                <div className="flex space-x-2 mt-4">
                    {task.id && mode === 'view' && (
                        task.isArchived ? (
                            <>
                                <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                                <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                            </>
                        ) : (
                            <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} isLoading={isSaving} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                        )
                    )}
                </div>
            </form>
            {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения в задаче?" confirmText="Сохранить" isLoading={isSaving} />}
            {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title={task.isArchived ? "Восстановить?" : "Архивировать?"} message={`Вы уверены?`} confirmText={task.isArchived ? "Восстановить" : "Архивировать"} isLoading={isSaving} />}
            {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить навсегда?" message="Это действие необратимо." confirmText="Удалить" confirmButtonVariant="danger" isLoading={isSaving} />}
        </div>
    );
};

export default KanbanTaskEditorPage;