import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { KnowledgeBaseFile } from '../../types';
import MarkdownEditor from './MarkdownEditor'; // Import the editor

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, content?: string, fileType?: KnowledgeBaseFile['fileType'], tags?: string[]) => void;
  itemType: 'folder' | 'file';
  isLoading: boolean;
}

const CreateItemModal: React.FC<CreateItemModalProps> = ({ isOpen, onClose, onCreate, itemType, isLoading }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState(''); // For Markdown files
  const [fileType, setFileType] = useState<KnowledgeBaseFile['fileType']>('markdown');
  const [tags, setTags] = useState(''); // New state for tags input
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setContent('');
      setFileType('markdown');
      setTags(''); // Reset tags
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Название ${itemType === 'folder' ? 'папки' : 'файла'} не может быть пустым.`);
      return;
    }
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    let finalName = name.trim();
    if (itemType === 'file' && fileType === 'markdown' && !finalName.toLowerCase().endsWith('.md')) {
        if (!finalName.includes('.')) { // Only add .md if no other extension is present
            finalName += '.md';
        }
    }
    onCreate(finalName, content, fileType, tagsArray);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Создать новую ${itemType === 'folder' ? 'папку' : 'файл'}`}
      size={(itemType === 'file' && fileType === 'markdown') ? 'xl' : 'lg'} // Larger modal for editor or if tags present
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Input
          id="itemName"
          name="itemName"
          label={`Название ${itemType === 'folder' ? 'папки' : 'файла'}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        
        {itemType === 'file' && (
          <>
            <div>
                <label htmlFor="fileType" className="block text-sm font-medium text-brand-text-primary mb-1">Тип файла</label>
                <select 
                    id="fileType" 
                    name="fileType" 
                    value={fileType} 
                    onChange={(e) => setFileType(e.target.value as KnowledgeBaseFile['fileType'])}
                    className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
                >
                    <option value="markdown">Markdown (.md)</option>
                    {/* <option value="image">Изображение</option>
                    <option value="pdf">PDF</option>
                    <option value="other">Другой</option> */}
                </select>
                 <p className="text-xs text-brand-text-muted mt-1">На данный момент полноценно поддерживается только Markdown. Для других типов файлов функциональность ограничена.</p>
            </div>
            {fileType === 'markdown' && (
              <div>
                <label htmlFor="itemContent" className="block text-sm font-medium text-brand-text-primary mb-1">Содержимое (Markdown)</label>
                <div className="min-h-[300px] border border-brand-border rounded-md overflow-hidden">
                  <MarkdownEditor
                    initialValue={content}
                    onChange={setContent}
                    height="300px" // Adjust as needed
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <Input
            id="itemTags"
            label="Теги (через запятую)"
            name="itemTags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="например: марксизм, план, отчет"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Создать
          </Button>
        </div>
      </form>
       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </Modal>
  );
};

export default CreateItemModal;