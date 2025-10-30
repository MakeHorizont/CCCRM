import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import MarkdownEditor from '../KnowledgeBase/MarkdownEditor';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, tags: string) => Promise<void>;
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Тема обсуждения не может быть пустой.");
            return;
        }
        setError(null);
        setIsCreating(true);
        try {
            await onCreate(title, description, tags);
        } catch(err) {
            setError((err as Error).message || "Не удалось создать тему.");
        } finally {
            setIsCreating(false);
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setTags('');
            setError(null);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Создать новое обсуждение" size="xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input
                    id="topicTitle"
                    label="Тема обсуждения *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <div className="space-y-1">
                    <label htmlFor="topicDescription" className="block text-sm font-medium text-brand-text-primary">Описание (Поддерживает Markdown)</label>
                    <div className="h-64 border border-brand-border rounded-md">
                         <MarkdownEditor
                            initialValue={description}
                            onChange={setDescription}
                            height="250px"
                         />
                    </div>
                </div>
                 <Input
                    id="topicTags"
                    label="Теги (через запятую)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="например: производство, маркетинг, план"
                />
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isCreating}>Отмена</Button>
                    <Button type="submit" isLoading={isCreating}>Создать обсуждение</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateTopicModal;
