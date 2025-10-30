import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { KnowledgeBaseItem } from '../../types';

interface RenameItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  item: KnowledgeBaseItem;
  isLoading: boolean;
}

const RenameItemModal: React.FC<RenameItemModalProps> = ({ isOpen, onClose, onRename, item, isLoading }) => {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setNewName(item.name);
      setError(null);
    }
  }, [isOpen, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError(`Новое название не может быть пустым.`);
      return;
    }
    if (item.itemType === 'file' && item.fileType === 'markdown' && !newName.trim().toLowerCase().endsWith('.md') ) {
        if (newName.trim().toLowerCase().includes('.')) { // if user provided extension other than .md
             onRename(newName.trim());
        } else {
             onRename(newName.trim() + '.md'); // Add .md if no extension or wrong one
        }
    } else {
      onRename(newName.trim());
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Переименовать ${item.itemType === 'folder' ? 'папку' : 'файл'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Input
          id="newItemName"
          name="newItemName"
          label="Новое название"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
          autoFocus
        />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Переименовать
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RenameItemModal;
