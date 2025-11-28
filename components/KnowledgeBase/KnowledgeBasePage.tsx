

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { KnowledgeBaseItem, KnowledgeBaseFolder, KnowledgeBaseFile } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { BrainCircuitIcon, FolderIcon, DocumentIcon, PlusCircleIcon, ArrowUpIcon, PencilIcon as EditIcon, ArchiveBoxArrowDownIcon, ArrowPathIcon as RestoreIcon, TrashIcon, ViewArchiveIcon, ChevronRightIcon, SaveIcon, DocumentArrowUpIcon } from '../UI/Icons';
import CreateItemModal from './CreateItemModal';
import EditItemDetailsModal from './EditItemDetailsModal'; // Updated import
import ConfirmationModal from '../UI/ConfirmationModal';
import KnowledgeBaseItemRow from './KnowledgeBaseItemRow';
import MarkdownEditor from './MarkdownEditor'; 

// Ensure marked and DOMPurify are available globally via CDN
declare global {
    interface Window {
        marked: {
            parse: (markdown: string, options?: any) => string;
        };
        DOMPurify: {
            sanitize: (html: string, options?: any) => string;
        };
    }
}


type KBViewMode = 'active' | 'archived';

const KnowledgeBasePage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<KnowledgeBaseItem[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<KnowledgeBaseItem | null>(null);
  const [viewingFileContentHtml, setViewingFileContentHtml] = useState<string | null>(null);
  const [editingFileMarkdown, setEditingFileMarkdown] = useState<string>('');
  const [isEditingMarkdown, setIsEditingMarkdown] = useState<boolean>(false);


  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false); // For general interactions like save, delete, archive
  const [isUploading, setIsUploading] = useState(false); // Specifically for file uploads
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);


  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'База знаний' }]);
  const [viewMode, setViewMode] = useState<KBViewMode>('active');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'folder' | 'file' | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Renamed state
  const [itemToEdit, setItemToEdit] = useState<KnowledgeBaseItem | null>(null); // Renamed state

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBaseItem | null>(null);
  
  const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
  const [isDraggingOverZone, setIsDraggingOverZone] = useState<boolean>(false);


  const fetchItems = useCallback(async (parentId: string | null, mode: KBViewMode) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    setUploadError(null);
    setUploadSuccessMessage(null);
    try {
      const data = await apiService.getKnowledgeBaseItems(parentId, user.id, user.role ? [user.role] : [], mode);
      setItems(data);
    } catch (err) {
      setError('Не удалось загрузить элементы Базы знаний.');
      console.error(err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItems(currentParentId, viewMode);
  }, [fetchItems, currentParentId, viewMode]);

  const handleRefreshCurrentView = useCallback(() => {
    fetchItems(currentParentId, viewMode);
    if (selectedItem && selectedItem.itemType === 'file') {
        handleItemClick(selectedItem, true); 
    }
  }, [fetchItems, currentParentId, viewMode, selectedItem]);

  const handleItemClick = async (item: KnowledgeBaseItem, forceReloadContent = false) => {
    setError(null);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setIsEditingMarkdown(false);

    if (item.itemType === 'folder') {
      setCurrentParentId(item.id);
      setBreadcrumbs(prev => [...prev, { id: item.id, name: item.name }]);
      setSelectedItem(null);
      setViewingFileContentHtml(null);
      setEditingFileMarkdown('');
    } else if (item.itemType === 'file') {
      if (item.id !== selectedItem?.id || forceReloadContent) {
        setIsLoading(true);
        setSelectedItem(item);
        setViewingFileContentHtml(null); 
        try {
          if (!user) throw new Error("User not authenticated");
          const fileData = await apiService.getKnowledgeBaseFileContent(item.id, user.id, user.role ? [user.role] : []);
          
          setEditingFileMarkdown(fileData?.content || ''); 

          if (fileData?.fileType === 'markdown') {
              if (window.marked && window.DOMPurify) {
                  const rawHtml = window.marked.parse(fileData.content || '', { gfm: true, breaks: true });
                  const sanitizedHtml = window.DOMPurify.sanitize(rawHtml);
                  setViewingFileContentHtml(sanitizedHtml);
              } else {
                   setViewingFileContentHtml("<p><em>Ошибка: Библиотеки для отображения Markdown не загружены.</em></p><pre>" + (fileData.content || '') + "</pre>");
              }
          } else {
            setViewingFileContentHtml(`<p class="text-brand-text-muted">Просмотр файла типа "${fileData?.fileType}" не поддерживается в полном объеме. <a href="${fileData?.url}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline">Скачать файл</a></p>`);
          }
        } catch (err) {
          setError(`Не удалось загрузить содержимое файла: ${(err as Error).message}`);
          setViewingFileContentHtml(`<p class="text-red-500">Ошибка загрузки содержимого.</p>`);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };
  
  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setCurrentParentId(breadcrumbs[index].id);
    setSelectedItem(null);
    setViewingFileContentHtml(null);
    setEditingFileMarkdown('');
    setIsEditingMarkdown(false);
  };

  const handleCreateItem = async (name: string, content?: string, fileType?: KnowledgeBaseFile['fileType'], tags?: string[]) => {
    if (!user || !createModalType) return;
    setIsLoadingInteraction(true);
    setError(null);
    try {
      if (createModalType === 'folder') {
        await apiService.createKnowledgeBaseFolder({ name, parentId: currentParentId, tags: tags || [], accessRules: [] });
      } else if (createModalType === 'file') {
        await apiService.createKnowledgeBaseFile({ name, folderId: currentParentId, content: content || '', fileType: fileType || 'markdown', size: content?.length || 0, tags: tags || [], accessRules: [] });
      }
      fetchItems(currentParentId, viewMode);
      setIsCreateModalOpen(false);
    } catch (err) {
      setError(`Ошибка создания ${createModalType === 'folder' ? 'папки' : 'файла'}: ${(err as Error).message}`);
    } finally {
      setIsLoadingInteraction(false);
    }
  };
  
  const handleSaveItemDetails = async (updates: { name: string; tags: string[] }) => {
    if (!itemToEdit || !user) return;
    setIsLoadingInteraction(true);
    setError(null);
    try {
        await apiService.updateKnowledgeBaseItem(itemToEdit.id, updates);
        fetchItems(currentParentId, viewMode);
        if (selectedItem?.id === itemToEdit.id) {
            setSelectedItem(prev => prev ? {...prev, ...updates} : null);
        }
        const newBreadcrumbs = breadcrumbs.map(bc => bc.id === itemToEdit.id ? {...bc, name: updates.name} : bc);
        setBreadcrumbs(newBreadcrumbs);

        setIsEditModalOpen(false);
        setItemToEdit(null);
    } catch (err) {
        setError(`Ошибка обновления элемента: ${(err as Error).message}`);
    } finally {
        setIsLoadingInteraction(false);
    }
  };

  const handleArchiveItem = async (item: KnowledgeBaseItem) => {
    if (!user) return;
    setIsLoadingInteraction(true);
    setError(null);
    try {
      await apiService.archiveKnowledgeBaseItem(item.id, true);
      fetchItems(currentParentId, viewMode);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        setViewingFileContentHtml(null);
        setEditingFileMarkdown('');
        setIsEditingMarkdown(false);
      }
    } catch (err) {
      setError(`Ошибка архивации: ${(err as Error).message}`);
    } finally {
      setIsLoadingInteraction(false);
    }
  };

  const handleRestoreItem = async (item: KnowledgeBaseItem) => {
    if (!user) return;
    setIsLoadingInteraction(true);
    setError(null);
    try {
      await apiService.archiveKnowledgeBaseItem(item.id, false);
      fetchItems(currentParentId, viewMode);
    } catch (err) {
      setError(`Ошибка восстановления: ${(err as Error).message}`);
    } finally {
      setIsLoadingInteraction(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || !user) return;
    setIsLoadingInteraction(true);
    setError(null);
    try {
      await apiService.deleteKnowledgeBaseItem(itemToDelete.id);
      fetchItems(currentParentId, viewMode);
       if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null);
        setViewingFileContentHtml(null);
        setEditingFileMarkdown('');
        setIsEditingMarkdown(false);
      }
      setIsConfirmDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      setError(`Ошибка удаления: ${(err as Error).message}`);
    } finally {
      setIsLoadingInteraction(false);
    }
  };
  
  const handleSaveMarkdown = async () => {
    if (!selectedItem || selectedItem.itemType !== 'file' || !user) return;
    setIsLoadingInteraction(true);
    setError(null);
    try {
        await apiService.updateKnowledgeBaseItem(selectedItem.id, { content: editingFileMarkdown });
        setIsEditingMarkdown(false);
        // Re-render content
        if (window.marked && window.DOMPurify) {
            const rawHtml = window.marked.parse(editingFileMarkdown, { gfm: true, breaks: true });
            const sanitizedHtml = window.DOMPurify.sanitize(rawHtml);
            setViewingFileContentHtml(sanitizedHtml);
        } else {
            setViewingFileContentHtml("<p><em>Ошибка: Библиотеки для отображения Markdown не загружены.</em></p><pre>" + editingFileMarkdown + "</pre>");
        }
    } catch (err) {
        setError(`Ошибка сохранения файла: ${(err as Error).message}`);
    } finally {
        setIsLoadingInteraction(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;
    
    const draggedItem = items.find(item => item.id === active.id);
    const targetItem = items.find(item => item.id === over.id);

    if (!draggedItem) return;

    let newParentId = currentParentId; // Default to current folder if not dropping on a folder
    if (targetItem && targetItem.itemType === 'folder') {
      newParentId = targetItem.id;
    } else if (over.id === 'drop-zone-file-list' || over.id === 'drop-zone-content-view') { // Dropped on main area
      newParentId = currentParentId;
    } else if (targetItem && targetItem.itemType === 'file') { // Dropped on a file, use its parent
      newParentId = targetItem.folderId;
    } else {
      // If 'over' is one of the drop zones directly (and not a sortable item within them)
      if (over.id === 'drop-zone-file-list' || over.id === 'drop-zone-content-view') {
        newParentId = currentParentId;
      } else {
         return; // Invalid drop target or not a folder
      }
    }

    if ((draggedItem.itemType === 'folder' && draggedItem.id === newParentId) || (draggedItem.itemType === 'file' && draggedItem.folderId === newParentId)) {
      return; // Trying to drop into itself or current parent (no change)
    }

    setIsLoadingInteraction(true);
    setError(null);
    try {
      const updatePayload = draggedItem.itemType === 'file' ? { folderId: newParentId } : { parentId: newParentId };
      await apiService.updateKnowledgeBaseItem(draggedItem.id, updatePayload);
      fetchItems(currentParentId, viewMode); // Refresh current view
    } catch (err) {
      setError(`Ошибка перемещения: ${(err as Error).message}`);
    } finally {
      setIsLoadingInteraction(false);
    }
  };
  
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, targetFolderId: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOverZone(false);
    if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) {
        return;
    }
    if (!user) {
        setUploadError("Пользователь не аутентифицирован.");
        return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

    // FIX: Explicitly type `files` as `File[]` to resolve TS errors about `unknown` type.
    const files: File[] = Array.from(event.dataTransfer.files);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
        try {
            let fileType: KnowledgeBaseFile['fileType'] = 'other';
            let content: string | undefined = undefined;
            const fileNameLower = file.name.toLowerCase();

            if (fileNameLower.endsWith('.md')) {
                fileType = 'markdown';
                content = await file.text();
            } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].some(ext => fileNameLower.endsWith(ext))) {
                fileType = 'image';
            } else if (fileNameLower.endsWith('.pdf')) {
                fileType = 'pdf';
            }

            await apiService.createKnowledgeBaseFile({
                name: file.name,
                folderId: targetFolderId,
                fileType: fileType,
                content: content, // only for markdown
                url: fileType !== 'markdown' ? `/mock-files/${file.name}` : undefined, // Mock URL for non-markdown
                size: file.size,
                accessRules: [],
            });
            successCount++;
        } catch (err) {
            console.error("File upload error:", err);
            errorCount++;
            setUploadError(prev => (prev ? prev + "\n" : "") + `Ошибка загрузки файла ${file.name}: ${(err as Error).message}`);
        }
    }
    setIsUploading(false);
    if (successCount > 0) {
        setUploadSuccessMessage(`Успешно загружено файлов: ${successCount}.`);
        handleRefreshCurrentView(); // Refresh view after upload
    }
    if (errorCount > 0 && !uploadError) { // if specific errors were set, don't overwrite with generic
        setUploadError(`Не удалось загрузить файлов: ${errorCount}.`);
    }
     setTimeout(() => { // Clear messages after a few seconds
        setUploadError(null);
        setUploadSuccessMessage(null);
    }, 5000);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.types.includes('Files')) {
        setIsDraggingOverZone(true);
      }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOverZone(false);
  };

  const dropZoneBaseClasses = "border-2 border-dashed rounded-lg p-4 transition-colors duration-200 ease-in-out";
  const dropZoneInactiveClasses = "border-brand-border";
  const dropZoneActiveClasses = "border-sky-500 bg-sky-500/10";


  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] gap-4 p-1 md:p-2">
      {/* Left Panel: File List */}
      <Card 
        className={`w-full md:w-1/3 lg:w-1/4 flex flex-col overflow-y-auto custom-scrollbar-thin relative ${isDraggingOverZone ? dropZoneActiveClasses : dropZoneInactiveClasses}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, currentParentId)}
        id="drop-zone-file-list" // Make sure this ID is unique or identifiable
      >
        {isDraggingOverZone && (
            <div className="absolute inset-0 bg-sky-500/20 flex flex-col items-center justify-center pointer-events-none z-10 rounded-lg">
                <DocumentArrowUpIcon className="h-12 w-12 text-sky-300 mb-2" />
                <p className="text-sky-300 text-sm font-medium">Отпустите файлы для загрузки сюда</p>
            </div>
        )}
        <div className="flex items-center justify-between mb-3 p-2 border-b border-brand-border sticky top-0 bg-brand-card z-20">
            <div className="flex items-center">
                <BrainCircuitIcon className="h-6 w-6 mr-2 text-brand-primary" />
                <h2 className="text-lg font-semibold text-brand-text-primary">
                    {breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].name : 'База знаний'}
                </h2>
            </div>
            <div className="flex space-x-1">
                <Button
                    variant="ghost" size="sm"
                    onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
                    title={viewMode === 'active' ? 'Показать архив' : 'Показать активные'}
                    disabled={isLoading || isLoadingInteraction}
                >
                    <ViewArchiveIcon className="h-5 w-5" />
                </Button>
                 <Button
                    variant="ghost" size="sm"
                    onClick={() => { setCreateModalType('folder'); setIsCreateModalOpen(true); }}
                    title="Создать папку"
                    disabled={isLoading || isLoadingInteraction || viewMode === 'archived'}
                >
                    <FolderIcon className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost" size="sm"
                    onClick={() => { setCreateModalType('file'); setIsCreateModalOpen(true); }}
                    title="Создать файл"
                    disabled={isLoading || isLoadingInteraction || viewMode === 'archived'}
                >
                    <DocumentIcon className="h-5 w-5" />
                </Button>
            </div>
        </div>

        <nav aria-label="Breadcrumbs" className="mb-2 px-2 text-xs text-brand-text-muted flex items-center flex-wrap">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id || 'root'}>
              {index > 0 && <ChevronRightIcon className="h-3 w-3 mx-1" />}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:underline ${index === breadcrumbs.length - 1 ? 'font-semibold text-brand-text-primary' : ''}`}
                disabled={index === breadcrumbs.length - 1 || isLoading || isLoadingInteraction}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>
        
        {uploadError && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-md mx-2 mb-2">{uploadError}</p>}
        {uploadSuccessMessage && <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-md mx-2 mb-2">{uploadSuccessMessage}</p>}
        {isUploading && <div className="px-2 mb-2"><LoadingSpinner size="sm" /><p className="text-xs text-sky-400 text-center">Загрузка файлов...</p></div>}


        {isLoading && !isUploading ? <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div> : items.length === 0 && !isUploading ? (
            <p className="text-sm text-brand-text-muted p-4 text-center">
                {viewMode === 'archived' ? 'Архив пуст.' : (currentParentId ? 'Папка пуста.' : 'База знаний пуста.')}
            </p>
        ) : (
          <ul className="space-y-0.5 px-1">
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <KnowledgeBaseItemRow
                key={item.id}
                item={item}
                onItemClick={handleItemClick}
                onRename={itemToEdit => { setItemToEdit(itemToEdit); setIsEditModalOpen(true); }}
                onArchive={handleArchiveItem}
                onRestore={handleRestoreItem}
                onDelete={itemToDelete => { setItemToDelete(itemToDelete); setIsConfirmDeleteModalOpen(true); }}
                isLoadingInteraction={isLoadingInteraction}
                viewMode={viewMode}
              />
            ))}
            </SortableContext>
          </ul>
        )}
      </Card>

      {/* Right Panel: Content View / Editor */}
      <Card 
        className={`w-full md:w-2/3 lg:w-3/4 flex flex-col overflow-hidden relative ${isDraggingOverZone ? dropZoneActiveClasses : dropZoneInactiveClasses}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, currentParentId)} 
        id="drop-zone-content-view" // Make sure this ID is unique or identifiable
      >
         {isDraggingOverZone && ( 
            <div className="absolute inset-0 bg-sky-500/20 flex flex-col items-center justify-center pointer-events-none z-10 rounded-lg">
                <DocumentArrowUpIcon className="h-16 w-16 text-sky-300 mb-2" />
                <p className="text-sky-300 text-lg font-medium">Отпустите файлы для загрузки в текущую папку</p>
            </div>
        )}
        {selectedItem && selectedItem.itemType === 'file' ? (
            <>
            <div className="p-3 border-b border-brand-border flex justify-between items-center sticky top-0 bg-brand-card z-10">
                <h3 className="text-md font-semibold text-brand-text-primary truncate" title={selectedItem.name}>{selectedItem.name}</h3>
                <div>
                {selectedItem.fileType === 'markdown' && !selectedItem.isArchived && (
                    isEditingMarkdown ? (
                    <Button onClick={handleSaveMarkdown} isLoading={isLoadingInteraction} size="sm" variant="primary" leftIcon={<SaveIcon className="h-4 w-4"/>}>
                        Сохранить
                    </Button>
                    ) : (
                    <Button onClick={() => setIsEditingMarkdown(true)} size="sm" variant="secondary" leftIcon={<EditIcon className="h-4 w-4"/>}>
                        Редактировать
                    </Button>
                    )
                )}
                 </div>
            </div>
            <div className="flex-grow overflow-y-auto p-1 md:p-2 custom-scrollbar-thin">
                {isEditingMarkdown ? (
                     <MarkdownEditor initialValue={editingFileMarkdown} onChange={setEditingFileMarkdown} height="calc(100vh - 20rem)"/>
                ) : (
                    viewingFileContentHtml ? (
                        <article className="prose prose-sm md:prose-base prose-invert max-w-none p-2 custom-styled-html" dangerouslySetInnerHTML={{ __html: viewingFileContentHtml }} />
                    ) : (
                         <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>
                    )
                )}
            </div>
            </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-brand-text-muted">
            <BrainCircuitIcon className="h-16 w-16 mb-4 opacity-30" />
            <p>Выберите файл или папку для просмотра.</p>
            <p className="text-xs mt-1">Или перетащите файлы сюда для загрузки в текущую папку.</p>
          </div>
        )}
         {error && <p className="text-sm text-red-400 bg-red-500/10 p-2 m-2 rounded-md">{error}</p>}
      </Card>

        {isCreateModalOpen && createModalType && (
            <CreateItemModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={handleCreateItem}
            itemType={createModalType}
            isLoading={isLoadingInteraction}
            />
        )}
        {isEditModalOpen && itemToEdit && (
            <EditItemDetailsModal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setItemToEdit(null); }}
            onSave={handleSaveItemDetails}
            item={itemToEdit}
            isLoading={isLoadingInteraction}
            />
        )}
        {isConfirmDeleteModalOpen && itemToDelete && (
            <ConfirmationModal
            isOpen={isConfirmDeleteModalOpen}
            onClose={() => { setIsConfirmDeleteModalOpen(false); setItemToDelete(null); }}
            onConfirm={handleDeleteItem}
            title={`Удалить ${itemToDelete.itemType === 'folder' ? 'папку' : 'файл'}?`}
            message={
                <p>Вы уверены, что хотите удалить <strong className="text-brand-text-primary">{itemToDelete.name}</strong>?
                {itemToDelete.itemType === 'folder' && ' Все вложенные файлы и папки также будут удалены (если они архивированы).'} Это действие необратимо.
                </p>
            }
            confirmText="Удалить"
            isLoading={isLoadingInteraction}
            />
        )}
         <DragOverlay>
            {activeDragId && items.find(i => i.id === activeDragId) ? (
                <div className="bg-brand-secondary p-2 rounded-md shadow-lg text-brand-text-primary text-sm">
                     {items.find(i => i.id === activeDragId)?.itemType === 'folder' 
                        ? <FolderIcon className="h-5 w-5 mr-2 inline-block"/> 
                        : <DocumentIcon className="h-5 w-5 mr-2 inline-block"/>}
                    {items.find(i => i.id === activeDragId)?.name}
                </div>
            ) : null}
        </DragOverlay>
    </div>
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
        
        .prose-invert { /* Tailwind typography prose invert for dark mode */
            --tw-prose-body: #d1d5db; /* zinc-300 */
            --tw-prose-headings: #f4f4f5; /* zinc-100 */
            --tw-prose-lead: #a1a1aa; /* zinc-400 */
            --tw-prose-links: #93c5fd; /* sky-300 */
            --tw-prose-bold: #f4f4f5;
            --tw-prose-counters: #a1a1aa;
            --tw-prose-bullets: #71717a; /* zinc-500 */
            --tw-prose-hr: #3f3f46; /* zinc-700 */
            --tw-prose-quotes: #e4e4e7; /* zinc-200 */
            --tw-prose-quote-borders: #3f3f46;
            --tw-prose-captions: #a1a1aa;
            --tw-prose-code: #f4f4f5;
            --tw-prose-pre-code: #d1d5db;
            --tw-prose-pre-bg: #18181b; /* zinc-900 */
            --tw-prose-th-borders: #3f3f46;
            --tw-prose-td-borders: #27272a; /* zinc-800 */
        }
        .custom-styled-html h1, .custom-styled-html h2, .custom-styled-html h3 { 
            margin-top: 0.8em; 
            margin-bottom: 0.4em; 
        }
        .custom-styled-html p { 
            margin-bottom: 0.5em; 
        }
        .custom-styled-html ul, .custom-styled-html ol { 
            margin-bottom: 0.5em; 
            padding-left: 1.5em;
        }
        .custom-styled-html blockquote { 
            border-left-color: #52525b; 
        }
        .custom-styled-html code { 
            background-color: rgba(161, 161, 170, 0.15); 
            padding: 0.1em 0.3em; 
            border-radius: 0.25em; 
            font-size: 0.85em; 
        }
        .custom-styled-html pre > code { 
            background-color: transparent; 
            padding: 0; 
            font-size: 0.85em;
        }
        .custom-styled-html pre { 
            background-color: #18181b; 
            padding: 0.75em; 
            border-radius: 0.375em; 
            overflow-x: auto; 
        }
        .custom-styled-html table { 
            width: 100%; 
            margin-bottom: 1em; 
        }
        .custom-styled-html th, .custom-styled-html td { 
            padding: 0.5em; 
            border: 1px solid #3f3f46; 
        }
        .custom-styled-html img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 0.375em; 
            margin-top: 0.5em; 
            margin-bottom: 0.5em;
        }
    `}</style>
    </DndContext>
  );
};

export default KnowledgeBasePage;