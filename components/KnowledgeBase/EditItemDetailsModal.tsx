
import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { KnowledgeBaseItem } from '../../types';

interface EditItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { name: string; tags: string[] }) => void;
  item: KnowledgeBaseItem;
  isLoading: boolean;
}

const EditItemDetailsModal: React.FC<EditItemDetailsModalProps> = ({ isOpen, onClose, onSave, item, isLoading }) => {
  const [newName, setNewName] = useState('');
  const [tagsString, setTagsString] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setNewName(item.name);
      setTagsString((item.tags || []).join(', '));
      setError(null);
    }
  }, [isOpen, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError(`Новое название не может быть пустым.`);
      return;
    }
    
    const tagsArray = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    let finalName = newName.trim();

    if (item.itemType === 'file' && item.fileType === 'markdown' && !finalName.toLowerCase().endsWith('.md')) {
      if (!finalName.includes('.')) { // Only add .md if no other extension is present and user didn't type one
        finalName += '.md';
      }
    }
    onSave({ name: finalName, tags: tagsArray });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Редактировать: ${item.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Input
          id="editItemName"
          name="editItemName"
          label="Новое название"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          autoFocus
          disabled={item.isArchived || isLoading}
        />
        <div>
          <label htmlFor="editItemTags" className="block text-sm font-medium text-brand-text-primary mb-1">Теги (через запятую)</label>
          <Input
            id="editItemTags"
            name="editItemTags"
            value={tagsString}
            onChange={(e) => setTagsString(e.target.value)}
            placeholder="например: марксизм, план, отчет"
            disabled={item.isArchived || isLoading}
          />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          {!item.isArchived && (
            <Button type="submit" isLoading={isLoading}>
              Сохранить
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default EditItemDetailsModal;
