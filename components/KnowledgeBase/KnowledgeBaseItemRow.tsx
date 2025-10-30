
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KnowledgeBaseItem } from '../../types';
import { FolderIcon, DocumentIcon, PencilIcon as EditIcon, ArchiveBoxArrowDownIcon, ArrowPathIcon as RestoreIcon, TrashIcon } from '../UI/Icons';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';

interface KnowledgeBaseItemRowProps {
  item: KnowledgeBaseItem;
  onItemClick: (item: KnowledgeBaseItem) => void;
  onRename: (item: KnowledgeBaseItem) => void; // Renamed from onEdit, now triggers opening EditItemDetailsModal
  onArchive: (item: KnowledgeBaseItem) => void;
  onRestore: (item: KnowledgeBaseItem) => void;
  onDelete: (item: KnowledgeBaseItem) => void;
  isLoadingInteraction: boolean;
  viewMode: 'active' | 'archived';
}

const KnowledgeBaseItemRow: React.FC<KnowledgeBaseItemRowProps> = ({
  item,
  onItemClick,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  isLoadingInteraction,
  viewMode,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { type: 'kb-item', item: item }, resizeObserverConfig: { disabled: true } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    zIndex: isDragging ? 100 : 'auto',
  };

  const itemIcon = item.itemType === 'folder' 
    ? <FolderIcon className="h-5 w-5 mr-3 text-sky-400 flex-shrink-0" />
    : <DocumentIcon className="h-5 w-5 mr-3 text-brand-text-muted flex-shrink-0" />;

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // Prevent onItemClick when clicking an action button
    action();
  };

  return (
    <li 
        ref={setNodeRef} 
        style={style}
        className={`group flex items-start justify-between p-2 rounded-md hover:bg-brand-surface transition-colors ${item.isArchived ? 'opacity-70' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => onItemClick(item)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(item);}}
        aria-label={`Открыть ${item.name}`}
    >
      <div className="flex-grow min-w-0">
        <div className="flex items-center">
          <span {...attributes} {...listeners} className="cursor-grab touch-none mr-1 p-1 opacity-50 group-hover:opacity-100">⠿</span>
          {itemIcon}
          <span className="truncate text-sm text-brand-text-primary group-hover:text-sky-300">{item.name}</span>
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className="mt-1 ml-8 flex flex-wrap gap-1">
            {item.tags.map(tag => (
              <span 
                key={tag} 
                className="px-1.5 py-0.5 text-[10px] bg-brand-surface border border-brand-border text-brand-text-secondary rounded-full"
                title={`Тег: ${tag}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity mt-0.5"> {/* Adjusted margin for alignment */}
        <Tooltip text="Редактировать">
            <Button variant="ghost" size="sm" onClick={(e) => handleActionClick(e, () => onRename(item))} disabled={isLoadingInteraction} className="p-1">
                <EditIcon className="h-4 w-4" />
            </Button>
        </Tooltip>
        {viewMode === 'active' && (
          <Tooltip text="Архивировать">
            <Button variant="ghost" size="sm" onClick={(e) => handleActionClick(e, () => onArchive(item))} disabled={isLoadingInteraction} className="p-1">
              <ArchiveBoxArrowDownIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        {viewMode === 'archived' && (
          <>
            <Tooltip text="Восстановить">
              <Button variant="ghost" size="sm" onClick={(e) => handleActionClick(e, () => onRestore(item))} disabled={isLoadingInteraction} className="p-1">
                <RestoreIcon className="h-4 w-4" />
              </Button>
            </Tooltip>
            <Tooltip text="Удалить навсегда">
              <Button variant="ghost" size="sm" onClick={(e) => handleActionClick(e, () => onDelete(item))} disabled={isLoadingInteraction} className="p-1 text-red-500 hover:text-red-400">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </Tooltip>
          </>
        )}
      </div>
    </li>
  );
};

export default KnowledgeBaseItemRow;
