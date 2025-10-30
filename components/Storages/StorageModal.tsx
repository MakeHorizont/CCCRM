import React, { useState, useEffect, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { StorageLocation, StorageTag } from '../../types';
import { XCircleIcon, CubeIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, TrashIcon } from '../UI/Icons';
import { getRandomTagColor, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';

type ModalMode = 'view' | 'edit';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInitiate: (storage: Partial<StorageLocation>) => void;
  editingStorage: Partial<StorageLocation> | null;
  isSaving: boolean;
  availableSystemTags: StorageTag[];
  onAddNewSystemTag: (tagName: string) => void;
  modalMode: ModalMode;
  setModalMode: (mode: ModalMode) => void;
  onArchiveInitiate: (item: StorageLocation) => void;
  onDeleteInitiate: (item: StorageLocation) => void;
}

const StorageModal: React.FC<StorageModalProps> = ({
  isOpen, onClose, onSaveInitiate, editingStorage: initialStorage, isSaving,
  availableSystemTags, onAddNewSystemTag, modalMode, setModalMode,
  onArchiveInitiate, onDeleteInitiate
}) => {
  const [storageData, setStorageData] = useState<Partial<StorageLocation>>(initialStorage || {});
  const [newTagName, setNewTagName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setStorageData(initialStorage || { name: '', description: '', tags: [] });
    setModalError(null);
  }, [initialStorage, isOpen]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStorageData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = (tag: StorageTag) => {
    setStorageData(prev => ({
      ...prev,
      tags: [...(prev?.tags || []), tag].filter((t, index, self) => self.findIndex(s => s.id === t.id) === index)
    }));
  };
  
  const handleCreateAndAddTag = () => {
    if (newTagName.trim() === '') return;
    const existingTag = availableSystemTags.find(t => t.name.toLowerCase() === newTagName.trim().toLowerCase()) || 
                        (storageData.tags || []).find(t => t.name.toLowerCase() === newTagName.trim().toLowerCase());

    if (existingTag) {
       if(!(storageData.tags || []).some(t => t.id === existingTag.id)){
          handleAddTag(existingTag);
       }
    } else {
        const newTag: StorageTag = { id: `tag-${Date.now()}`, name: newTagName.trim(), color: getRandomTagColor() };
        onAddNewSystemTag(newTag.name);
        handleAddTag(newTag);
    }
    setNewTagName('');
  };

  const handleRemoveTag = (tagId: string) => {
    setStorageData(prev => ({
      ...prev,
      tags: (prev?.tags || []).filter(t => t.id !== tagId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storageData.name?.trim()) {
      setModalError("Название хранилища обязательно.");
      return;
    }
    setModalError(null);
    onSaveInitiate(storageData);
  };
  
  const isViewMode = modalMode === 'view';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={storageData.id ? (isViewMode ? `Хранилище: ${storageData.name}`: `Редактировать: ${storageData.name}`) : 'Добавить Хранилище'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] flex flex-col">
        {modalError && <p className="text-red-500 text-sm">{modalError}</p>}
        
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar-thin space-y-4">
            {storageData.equipmentId && (
                <div className="p-2 rounded-md text-sm bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700/50">
                    Это хранилище также является оборудованием. <Link to={`${ROUTE_PATHS.EQUIPMENT}?equipId=${storageData.equipmentId}`} className="font-semibold hover:underline text-indigo-600 dark:text-indigo-300">Перейти к карточке оборудования →</Link>
                </div>
            )}
            <Input id="storage-name" name="name" label="Название Хранилища *" value={storageData.name || ''} onChange={handleInputChange} required disabled={storageData.isArchived || isViewMode || isSaving || !!storageData.equipmentId}/>
            <div>
              <label htmlFor="storage-description" className="block text-sm font-medium text-brand-text-primary mb-1">Описание</label>
              <textarea id="storage-description" name="description" value={storageData.description || ''} onChange={handleInputChange} rows={3} disabled={storageData.isArchived || isViewMode || isSaving || !!storageData.equipmentId}
                className="block w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg shadow-sm placeholder-brand-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary text-brand-text-primary" />
            </div>
            
            {!storageData.isArchived && (
              <div>
                <label className="block text-sm font-medium text-brand-text-primary mb-1">Теги</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(storageData.tags || []).map(tag => (
                    <span key={tag.id} className={`px-2 py-1 text-xs rounded-full flex items-center ${tag.color || 'bg-zinc-600 text-zinc-100'}`}>
                      {tag.name}
                      {!isViewMode &&
                        <button type="button" onClick={() => handleRemoveTag(tag.id)} className="ml-1.5 text-current hover:text-red-400" aria-label={`Удалить тег ${tag.name}`} disabled={isSaving}>
                          <XCircleIcon className="h-3.5 w-3.5"/>
                        </button>
                      }
                    </span>
                  ))}
                </div>
                {!isViewMode &&
                <>
                  <div className="flex items-end space-x-2">
                    <Input id="new-tag-name" name="newTagName" label="Новый тег" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Введите название тега" className="flex-grow" disabled={isSaving}/>
                    <Button type="button" size="sm" onClick={handleCreateAndAddTag} disabled={!newTagName.trim() || isSaving}>Добавить тег</Button>
                  </div>
                  {availableSystemTags.filter(st => !(storageData.tags || []).find(t => t.id === st.id)).length > 0 && (
                      <div className="mt-2">
                          <label htmlFor="select-existing-tag" className="block text-xs font-medium text-brand-text-muted mb-0.5">Или выберите существующий:</label>
                          <select 
                              id="select-existing-tag" 
                              value="" 
                              onChange={(e) => {
                                  const selectedTag = availableSystemTags.find(t => t.id === e.target.value);
                                  if(selectedTag) handleAddTag(selectedTag);
                              }}
                              className="w-full bg-brand-card border border-brand-border rounded-md p-1.5 text-xs text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
                              disabled={isSaving}
                          >
                              <option value="" disabled>Выберите тег...</option>
                              {availableSystemTags.filter(st => !(storageData.tags || []).find(t => t.id === st.id)).map(tag => (
                                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                              ))}
                          </select>
                      </div>
                  )}
                </>
                }
              </div>
            )}
        </div>

        <div className="flex-shrink-0 pt-5 flex justify-between items-center border-t border-brand-border">
            <div>
                {storageData.id && !isViewMode && !storageData.equipmentId && (
                     storageData.isArchived ? (
                         <div className="flex space-x-2">
                            <Button type="button" variant="secondary" onClick={() => onArchiveInitiate(storageData as StorageLocation)} leftIcon={<ArrowUturnLeftIcon className="h-5 w-5"/>}>Восстановить</Button>
                            <Button type="button" variant="danger" onClick={() => onDeleteInitiate(storageData as StorageLocation)} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить</Button>
                         </div>
                     ) : (
                         <Button type="button" variant="secondary" onClick={() => onArchiveInitiate(storageData as StorageLocation)} leftIcon={<ArchiveBoxArrowDownIcon className="h-5 w-5"/>}>Архивировать</Button>
                     )
                 )}
            </div>
            <div className="flex justify-end space-x-3">
                {isViewMode ? (
                  <>
                    <Button type="button" variant="secondary" onClick={onClose}>Закрыть</Button>
                    {!storageData.isArchived && <Button type="button" onClick={(e) => { e.preventDefault(); setModalMode('edit'); }}>Редактировать</Button>}
                  </>
                ) : (
                  <>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                    <Button type="submit" isLoading={isSaving}>{storageData.id ? 'Сохранить' : 'Создать'}</Button>
                  </>
                )}
            </div>
        </div>
      </form>
       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #3f3f46; 
          border-radius: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #52525b; 
        }
      `}</style>
    </Modal>
  );
};

export default StorageModal;