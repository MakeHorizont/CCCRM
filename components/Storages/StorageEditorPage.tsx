import React, { useState, useEffect, ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../UI/Button';
import Input from '../UI/Input';
import ConfirmationModal from '../UI/ConfirmationModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import Card from '../UI/Card';
import { StorageLocation, StorageTag } from '../../types';
import { apiService } from '../../services/apiService';
import { XCircleIcon, CubeIcon, ArchiveBoxIcon, ArrowUturnLeftIcon, TrashIcon, ArrowLeftIcon, PencilSquareIcon, SaveIcon } from '../UI/Icons';
import { getRandomTagColor, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';

type EditorMode = 'view' | 'edit';

const StorageEditorPage: React.FC = () => {
    const { storageId } = useParams<{ storageId: string }>();
    const navigate = useNavigate();
    const isNew = !storageId;

    const [mode, setMode] = useState<EditorMode>(isNew ? 'edit' : 'view');
    const [storageData, setStorageData] = useState<Partial<StorageLocation>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [availableSystemTags, setAvailableSystemTags] = useState<StorageTag[]>([]);
    const [newTagName, setNewTagName] = useState('');

    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

    useEffect(() => {
        const fetchPageData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const tagsData = await apiService.getAvailableStorageTags();
                setAvailableSystemTags(tagsData);

                if (isNew) {
                    setStorageData({ name: '', description: '', tags: [], isArchived: false });
                    setMode('edit');
                } else {
                    const allStorages = await apiService.getStorageLocations({ viewMode: 'all' });
                    const storage = allStorages.find(s => s.id === storageId);
                    if (storage) {
                        setStorageData(storage);
                    } else {
                        setError("Хранилище не найдено.");
                    }
                    setMode('view');
                }
            } catch (err) {
                setError("Не удалось загрузить данные.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPageData();
    }, [storageId, isNew]);

    const handleConfirmSave = async () => {
        if (!storageData.name?.trim()) {
            setError("Название хранилища обязательно.");
            setIsSaveConfirmOpen(false);
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            if (storageData.id) {
                await apiService.updateStorageLocation(storageData as StorageLocation);
            } else {
                await apiService.addStorageLocation(storageData as any);
            }
            navigate(ROUTE_PATHS.STORAGES);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };

    const handleArchiveToggle = async () => {
        if (!storageData.id) return;
        setIsSaving(true);
        try {
            await apiService.archiveStorageLocation(storageData.id, !storageData.isArchived);
            navigate(ROUTE_PATHS.STORAGES);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsArchiveConfirmOpen(false);
        }
    };
    
    const handleDelete = async () => {
        if (!storageData.id) return;
        setIsSaving(true);
        try {
            await apiService.deleteStorageLocation(storageData.id);
            navigate(ROUTE_PATHS.STORAGES);
        } catch (err) {
             setError((err as Error).message);
        } finally {
            setIsSaving(false);
            setIsDeleteConfirmOpen(false);
        }
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setStorageData(prev => ({ ...prev, [name]: value }));
    };
    
    // Tag handlers...
    const handleAddTag = (tag: StorageTag) => {
        setStorageData(prev => ({
        ...prev,
        tags: [...(prev?.tags || []), tag].filter((t, index, self) => self.findIndex(s => s.id === t.id) === index)
        }));
    };
    const handleRemoveTag = (tagId: string) => {
        setStorageData(prev => ({
        ...prev,
        tags: (prev?.tags || []).filter(t => t.id !== tagId)
        }));
    };
    const handleCreateAndAddTag = () => { /* ... */ };

    if (isLoading) return <LoadingSpinner />;
    if (error && !storageData.id) return <p className="text-red-500 text-center">{error}</p>;
    if (!storageData) return null;

    const pageTitle = isNew ? 'Новое хранилище' : (mode === 'edit' ? `Редактирование: ${storageData.name}` : `Хранилище: ${storageData.name}`);
    const isFormDisabled = mode === 'view' || isSaving;

    return (
        <div className="space-y-4">
             <Button onClick={() => navigate(ROUTE_PATHS.STORAGES)} variant="secondary" size="sm" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                К списку хранилищ
            </Button>
            <form onSubmit={(e) => { e.preventDefault(); setIsSaveConfirmOpen(true); }}>
                 <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                    <div className="flex space-x-2">
                        {mode === 'view' && !storageData.isArchived && (
                            <Button type="button" onClick={() => setMode('edit')} variant="primary" leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>Редактировать</Button>
                        )}
                        {mode === 'edit' && !storageData.isArchived && (
                             <Button type="submit" isLoading={isSaving} variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить</Button>
                        )}
                    </div>
                </div>
                <Card>
                   <div className="space-y-4">
                        <Input id="storage-name" name="name" label="Название Хранилища *" value={storageData.name || ''} onChange={handleInputChange} required disabled={isFormDisabled || !!storageData.equipmentId}/>
                        <textarea id="storage-description" name="description" value={storageData.description || ''} onChange={handleInputChange} rows={3} disabled={isFormDisabled || !!storageData.equipmentId}
                            placeholder="Описание..."
                            className="block w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-brand-text-primary" />
                        
                        {/* Tag Management UI */}
                        {!isFormDisabled && (
                            <div>
                                <label className="block text-sm font-medium text-brand-text-primary mb-1">Теги</label>
                                {/* UI for adding/removing tags */}
                            </div>
                        )}
                   </div>
                </Card>

                <div className="flex space-x-2 mt-4">
                    {storageData.id && mode === 'view' && !storageData.isArchived && !storageData.equipmentId && (
                        <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                    )}
                    {storageData.id && storageData.isArchived && !storageData.equipmentId && (
                         <>
                           <Button type="button" variant="secondary" onClick={() => handleArchiveToggle()} isLoading={isSaving} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                           <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} isLoading={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                        </>
                    )}
                </div>
            </form>
            {isSaveConfirmOpen && <ConfirmationModal isOpen={isSaveConfirmOpen} onClose={() => setIsSaveConfirmOpen(false)} onConfirm={handleConfirmSave} title="Подтвердить сохранение" message="Сохранить изменения?" confirmText="Сохранить" isLoading={isSaving} />}
            {isArchiveConfirmOpen && <ConfirmationModal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} onConfirm={handleArchiveToggle} title="Архивировать?" message="Вы уверены?" confirmText="Да, архивировать" confirmButtonVariant="danger" isLoading={isSaving} />}
            {isDeleteConfirmOpen && <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Удалить?" message="Это действие необратимо." confirmText="Удалить" confirmButtonVariant="danger" isLoading={isSaving} />}
        </div>
    );
};

export default StorageEditorPage;