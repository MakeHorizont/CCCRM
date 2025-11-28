

import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import MarkdownEditor from '../KnowledgeBase/MarkdownEditor';
import { DiscussionType, RationalizationDetails } from '../../types';
import { LightBulbIcon } from '../UI/Icons';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, tags: string, type: DiscussionType, ratDetails?: Partial<RationalizationDetails>) => Promise<void>;
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [type, setType] = useState<DiscussionType>('general');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    
    // Rationalization specific
    const [ratProblem, setRatProblem] = useState('');
    const [ratSolution, setRatSolution] = useState('');
    const [ratEconomy, setRatEconomy] = useState('');

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Тема обсуждения не может быть пустой.");
            return;
        }
        if (type === 'rationalization' && (!ratProblem.trim() || !ratSolution.trim())) {
            setError("Для рацпредложения обязательно заполнить поля 'Проблема' и 'Решение'.");
            return;
        }
        setError(null);
        setIsCreating(true);
        try {
            const ratDetails: Partial<RationalizationDetails> | undefined = type === 'rationalization' ? {
                problem: ratProblem,
                solution: ratSolution,
                expectedEconomy: ratEconomy,
                status: 'proposed'
            } : undefined;
            
            // If rationalization, construct description from parts
            const finalDesc = type === 'rationalization' 
                ? `### Проблема\n${ratProblem}\n\n### Предлагаемое решение\n${ratSolution}\n\n### Ожидаемый эффект\n${ratEconomy}\n\n---\n${description}`
                : description;

            await onCreate(title, finalDesc, tags, type, ratDetails);
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
            setType('general');
            setRatProblem('');
            setRatSolution('');
            setRatEconomy('');
            setError(null);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Создать новую тему" size="xl">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar-thin">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <div className="flex space-x-4 mb-4">
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors flex-1 ${type === 'general' ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-brand-border'}`}>
                        <input type="radio" name="topicType" value="general" checked={type === 'general'} onChange={() => setType('general')} className="sr-only"/>
                        <span className="font-semibold text-brand-text-primary">Общее обсуждение</span>
                    </label>
                    <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors flex-1 ${type === 'rationalization' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-brand-border'}`}>
                        <input type="radio" name="topicType" value="rationalization" checked={type === 'rationalization'} onChange={() => setType('rationalization')} className="sr-only"/>
                         <LightBulbIcon className="h-5 w-5 mr-2 text-amber-500"/>
                        <span className="font-semibold text-brand-text-primary">Рацпредложение</span>
                    </label>
                </div>

                <Input
                    id="topicTitle"
                    label={type === 'rationalization' ? "Название идеи *" : "Тема обсуждения *"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                
                {type === 'rationalization' ? (
                    <div className="space-y-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                        <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center"><LightBulbIcon className="h-4 w-4 mr-1"/> Детали предложения</h4>
                        <div>
                             <label className="block text-xs font-medium text-brand-text-secondary mb-1">Какую проблему решаем? (Противоречие) *</label>
                             <textarea value={ratProblem} onChange={e => setRatProblem(e.target.value)} rows={3} className="w-full p-2 text-sm bg-brand-card border border-brand-border rounded-md"/>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-brand-text-secondary mb-1">Суть предложения (Решение) *</label>
                             <textarea value={ratSolution} onChange={e => setRatSolution(e.target.value)} rows={3} className="w-full p-2 text-sm bg-brand-card border border-brand-border rounded-md"/>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-brand-text-secondary mb-1">Ожидаемый экономический эффект (Сумма/Ресурсы)</label>
                             <Input id="ratEconomy" value={ratEconomy} onChange={e => setRatEconomy(e.target.value)} className="text-sm"/>
                        </div>
                    </div>
                ) : (
                     <div className="space-y-1">
                        <label htmlFor="topicDescription" className="block text-sm font-medium text-brand-text-primary">Описание (Markdown)</label>
                        <div className="h-64 border border-brand-border rounded-md">
                             <MarkdownEditor
                                initialValue={description}
                                onChange={setDescription}
                                height="250px"
                             />
                        </div>
                    </div>
                )}
                
                {type === 'rationalization' && (
                    <div>
                        <label className="block text-sm font-medium text-brand-text-primary mb-1">Дополнительные детали (необязательно)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 bg-brand-card border border-brand-border rounded-md text-sm" placeholder="Любые другие пояснения..."/>
                    </div>
                )}

                 <Input
                    id="topicTags"
                    label="Теги (через запятую)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="например: производство, маркетинг, план"
                />
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isCreating}>Отмена</Button>
                    <Button type="submit" isLoading={isCreating}>{type === 'rationalization' ? 'Подать идею' : 'Создать обсуждение'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateTopicModal;
