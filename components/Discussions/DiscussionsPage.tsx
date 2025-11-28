

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DiscussionTopic, DiscussionPost, User, Vote, DiscussionStatus, DiscussionType, RationalizationDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../hooks/useView';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ChatBubbleOvalLeftEllipsisIcon, PlusCircleIcon, ArrowLeftIcon, TagIcon, ChatBubbleLeftRightIcon, FlagIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, LightBulbIcon, BanknotesIcon } from '../UI/Icons';
import MarkdownDisplay from '../UI/MarkdownDisplay';
import { DISCUSSION_STATUS_COLOR_MAP } from '../../constants';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import MarkdownEditor from '../KnowledgeBase/MarkdownEditor';
import Tooltip from '../UI/Tooltip';
import StartVoteModal from './StartVoteModal';
import VotingWidget from './VotingWidget';
import PostItem from './PostItem';
import ConfirmationModal from '../UI/ConfirmationModal';
import CreateTopicModal from './CreateTopicModal';


type PostWithChildren = DiscussionPost & { children: PostWithChildren[] };

const TopicEditorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DiscussionTopic>) => Promise<void>;
  onArchive: (topicId: string) => Promise<void>;
  onDelete: (topicId: string) => Promise<void>;
  topicToEdit?: DiscussionTopic | null;
}> = ({ isOpen, onClose, onSave, onArchive, onDelete, topicToEdit }) => {
    const isEditing = !!topicToEdit?.id;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [status, setStatus] = useState<DiscussionStatus>('open');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle(topicToEdit?.title || '');
            setDescription(topicToEdit?.description || '');
            setTags((topicToEdit?.tags || []).join(', '));
            setStatus(topicToEdit?.status || 'open');
            setError(null);
        }
    }, [isOpen, topicToEdit]);

    const handleSaveInitiate = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) {
            setError("Тема обсуждения не может быть пустой.");
            return;
        }
        setIsSaveConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            const topicData: Partial<DiscussionTopic> = {
                id: topicToEdit?.id,
                title,
                description,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                status: status,
            };
            await onSave(topicData);
        } catch(err) {
            setError((err as Error).message || "Failed to save topic.");
        } finally {
            setIsSaving(false);
            setIsSaveConfirmOpen(false);
        }
    };
    
    const handleConfirmArchive = async () => {
        if (!topicToEdit?.id) return;
        setIsSaving(true);
        await onArchive(topicToEdit.id);
        setIsSaving(false);
        setIsArchiveConfirmOpen(false);
        onClose();
    };

    const handleConfirmDelete = async () => {
        if (!topicToEdit?.id) return;
        setIsSaving(true);
        await onDelete(topicToEdit.id);
        setIsSaving(false);
        setIsDeleteConfirmOpen(false);
        onClose();
    };


    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Редактировать обсуждение" : "Создать новое обсуждение"} size="xl">
                <form onSubmit={handleSaveInitiate} className="flex flex-col h-[70vh]">
                    {error && <p className="text-red-500 text-sm mb-2 p-2 bg-red-500/10 rounded-md">{error}</p>}
                    
                    <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar-thin">
                        <div className="space-y-5">
                             <Input 
                                id="topicTitle" 
                                label="Тема обсуждения *" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                required 
                                disabled={isSaving}
                            />
                            
                            <div>
                                <label htmlFor="topicDescription" className="block text-sm font-medium text-brand-text-primary mb-1">
                                    Описание (Поддерживает Markdown)
                                </label>
                                <div className="min-h-[250px] border border-brand-border rounded-md overflow-hidden">
                                    <MarkdownEditor initialValue={description} onChange={setDescription} height="250px" />
                                </div>
                            </div>
                            
                            <Input 
                                id="topicTags" 
                                label="Теги (через запятую)" 
                                value={tags} 
                                onChange={(e) => setTags(e.target.value)} 
                                placeholder="например: производство, маркетинг, план" 
                                disabled={isSaving}
                            />

                            {isEditing && (
                                 <div>
                                    <label htmlFor="topicStatus" className="block text-sm font-medium text-brand-text-primary mb-1">Статус</label>
                                    <select 
                                        id="topicStatus" 
                                        value={status} 
                                        onChange={e => setStatus(e.target.value as DiscussionStatus)} 
                                        disabled={isSaving || topicToEdit?.isArchived}
                                        className="w-full bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500"
                                    >
                                        <option value="open">Открыто</option>
                                        <option value="voting">Голосование</option>
                                        <option value="closed">Закрыто</option>
                                    </select>
                                 </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 flex justify-between items-center pt-4 mt-4 border-t border-brand-border">
                        <div>
                            {isEditing && !topicToEdit?.isArchived && (
                                <Button type="button" variant="secondary" onClick={() => setIsArchiveConfirmOpen(true)} disabled={isSaving} leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}>Архивировать</Button>
                            )}
                             {isEditing && topicToEdit?.isArchived && (
                                <Button type="button" variant="danger" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isSaving} leftIcon={<TrashIcon className="h-5 w-5"/>}>Удалить навсегда</Button>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                            <Button type="submit" isLoading={isSaving}>{isEditing ? "Сохранить" : "Создать"}</Button>
                        </div>
                    </div>
                </form>
            </Modal>
            {isSaveConfirmOpen && (
                <ConfirmationModal
                    isOpen={isSaveConfirmOpen}
                    onClose={() => setIsSaveConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                    title="Подтвердить сохранение"
                    message="Вы уверены, что хотите сохранить эти изменения?"
                    confirmText="Сохранить"
                    isLoading={isSaving}
                />
            )}
            {isArchiveConfirmOpen && (
                <ConfirmationModal
                    isOpen={isArchiveConfirmOpen}
                    onClose={() => setIsArchiveConfirmOpen(false)}
                    onConfirm={handleConfirmArchive}
                    title="Архивировать тему?"
                    message="Вы уверены, что хотите архивировать это обсуждение? Его можно будет восстановить позже."
                    confirmText="Да, архивировать"
                    confirmButtonVariant="danger"
                    isLoading={isSaving}
                />
            )}
            {isDeleteConfirmOpen && (
                <ConfirmationModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Удалить тему?"
                    message={<>Вы уверены, что хотите <strong className="text-red-400">навсегда</strong> удалить это обсуждение? Это действие необратимо.</>}
                    confirmText="Да, удалить"
                    confirmButtonVariant="danger"
                    isLoading={isSaving}
                />
            )}
        </>
    );
};

const ImplementationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (amount: number) => void; isSaving: boolean }> = ({ isOpen, onClose, onConfirm, isSaving }) => {
    const [amount, setAmount] = useState('');
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Внедрение и выплата премии">
            <div className="space-y-4">
                <p className="text-sm text-brand-text-secondary">
                    Подтвердите факт внедрения. Укажите фактическую экономию для расчета премии (10%).
                </p>
                <Input id="actualEconomy" label="Фактическая экономия (₽)" type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus/>
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                    <Button onClick={() => onConfirm(parseFloat(amount) || 0)} isLoading={isSaving} disabled={!amount}>Внедрить и выплатить</Button>
                </div>
            </div>
        </Modal>
    )
};

const DiscussionsPage: React.FC = () => {
    const [topics, setTopics] = useState<DiscussionTopic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Replaced editor with CreateTopicModal for new items
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false); // For editing existing
    const [topicToEdit, setTopicToEdit] = useState<DiscussionTopic | null>(null);
    const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
    const [isImplModalOpen, setIsImplModalOpen] = useState(false);
    
    const [topicTypeFilter, setTopicTypeFilter] = useState<DiscussionType | 'all'>('all');

    const { user } = useAuth();
    const { isMobileView } = useView();
    
    const [newPostContent, setNewPostContent] = useState('');

    const fetchTopics = useCallback(async (selectTopicId?: string) => {
        setIsLoadingList(true);
        setError(null);
        try {
            const [topicsData, usersData] = await Promise.all([
                 apiService.getDiscussionTopics({ viewMode: 'active', type: topicTypeFilter }),
                 apiService.getUsersWithHierarchyDetails()
            ]);
            setTopics(topicsData);
            setAllUsers(usersData);
            if (selectTopicId) {
                await handleSelectTopic(selectTopicId, topicsData);
            } else if (selectedTopic && !topicsData.find(t => t.id === selectedTopic.id)) {
                setSelectedTopic(null); // Deselect if filtered out
            }
        } catch (err) {
            setError("Не удалось загрузить список обсуждений.");
        } finally {
            setIsLoadingList(false);
        }
    }, [topicTypeFilter]);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    const handleSelectTopic = async (topicId: string, currentTopics?: DiscussionTopic[]) => {
        if(selectedTopic?.id === topicId && !isMobileView) return;
        setIsLoadingDetail(true);
        setError(null);
        try {
            const topicList = currentTopics || topics;
            const topicFromList = topicList.find(t => t.id === topicId);
            if(topicFromList && topicFromList.posts?.length === topicFromList.postCount){
                setSelectedTopic(topicFromList); // Use cached data if post count matches
            } else {
                 const topicDetail = await apiService.getDiscussionTopicById(topicId);
                 setSelectedTopic(topicDetail);
            }
        } catch (err) {
            setError("Не удалось загрузить детали обсуждения.");
            setSelectedTopic(null);
        } finally {
            setIsLoadingDetail(false);
        }
    };
    
    const handleCreateTopic = async (title: string, description: string, tags: string, type: DiscussionType, ratDetails?: Partial<RationalizationDetails>) => {
        try {
             const newTopic = await apiService.addDiscussionTopic({
                title,
                description,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                status: 'open',
                type: type,
                rationalization: ratDetails as any,
            });
            setIsCreateModalOpen(false);
            await fetchTopics(newTopic.id);
        } catch(err) {
            alert((err as Error).message);
        }
    };

    const handleSaveEditedTopic = async (data: Partial<DiscussionTopic>) => {
        if(!user) return;
        try {
            await apiService.updateDiscussionTopic(data.id!, data as any);
            setIsEditorModalOpen(false);
            setTopicToEdit(null);
            await fetchTopics(data.id);
        } catch(err) {
             throw err;
        }
    };

    const handleArchiveTopic = async (topicId: string) => {
        await apiService.archiveDiscussionTopic(topicId, true);
        await fetchTopics();
        setSelectedTopic(null);
    };
    
    const handleDeleteTopic = async (topicId: string) => {
        await apiService.deleteDiscussionTopic(topicId);
        await fetchTopics();
        setSelectedTopic(null);
    };


    const handleStartVote = async (proposal: string) => {
        if (!selectedTopic) return;
        setIsLoadingDetail(true);
        try {
            const updatedTopic = await apiService.startVoteOnTopic(selectedTopic.id, proposal);
            setSelectedTopic(updatedTopic);
            setTopics(prev => prev.map(t => t.id === updatedTopic.id ? updatedTopic : t));
            setIsVoteModalOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoadingDetail(false);
        }
    };
    
    const handleAddPost = async (parentId: string | null, content: string) => {
        if (!content.trim() || !selectedTopic || !user) return;
        setIsLoadingDetail(true);
        setError(null);
        try {
            const updatedTopic = await apiService.addDiscussionPost({
                topicId: selectedTopic.id,
                content: content,
                parentId: parentId,
            });
            setSelectedTopic(updatedTopic);

            if (!parentId) {
                setNewPostContent('');
            }
        } catch (err) {
            setError("Не удалось отправить сообщение.");
            if (selectedTopic) {
                await handleSelectTopic(selectedTopic.id);
            }
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleToggleReaction = async (postId: string, emoji: string) => {
        if(!user) return;
        const originalTopic = selectedTopic ? JSON.parse(JSON.stringify(selectedTopic)) : null;

        setSelectedTopic(prevTopic => {
            if (!prevTopic) return null;
            const newPosts = prevTopic.posts.map(p => {
                if (p.id === postId) {
                    const newReactions = {...(p.reactions || {})};
                    const userList = newReactions[emoji] || [];
                    const userIndex = userList.indexOf(user.id);

                    if (userIndex > -1) {
                        userList.splice(userIndex, 1);
                    } else {
                        userList.push(user.id);
                    }
                    newReactions[emoji] = userList;
                    return {...p, reactions: newReactions};
                }
                return p;
            });
            return {...prevTopic, posts: newPosts};
        });

        try {
            await apiService.togglePostReaction(postId, emoji, user.id);
        } catch (err) {
             setError("Ошибка реакции на пост.");
             setSelectedTopic(originalTopic);
        }
    };

    const handleCastVote = async (vote: 'for' | 'against', argument: string) => {
        if (!selectedTopic || !user) return;
        setIsLoadingDetail(true);
        try {
            const updatedTopic = await apiService.castVote(selectedTopic.id, user.id, vote, argument);
            setSelectedTopic(updatedTopic);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleCloseVote = async () => {
        if (!selectedTopic) return;
        setIsLoadingDetail(true);
        try {
            const updatedTopic = await apiService.closeVoteOnTopic(selectedTopic.id);
            setSelectedTopic(updatedTopic);
            setTopics(prev => prev.map(t => t.id === updatedTopic.id ? updatedTopic : t));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoadingDetail(false);
        }
    };
    
    const handleImplement = async (amount: number) => {
        if (!selectedTopic) return;
        setIsLoadingDetail(true);
        try {
            const updatedTopic = await apiService.implementRationalization(selectedTopic.id, amount);
            setSelectedTopic(updatedTopic);
            setTopics(prev => prev.map(t => t.id === updatedTopic.id ? updatedTopic : t));
            setIsImplModalOpen(false);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoadingDetail(false);
        }
    };
    
    const postTree = useMemo(() => {
        if (!selectedTopic?.posts) return [];
        const posts = selectedTopic.posts;
        const postMap = new Map<string, PostWithChildren>();
        const rootPosts: PostWithChildren[] = [];

        posts.forEach(post => {
            postMap.set(post.id, { ...post, children: [] });
        });

        posts.forEach(post => {
            if (post.parentId && postMap.has(post.parentId)) {
                const parent = postMap.get(post.parentId);
                if (parent) {
                    parent.children.push(postMap.get(post.id)!);
                }
            } else {
                rootPosts.push(postMap.get(post.id)!);
            }
        });
        
        postMap.forEach(node => {
            node.children.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });

        return rootPosts.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    }, [selectedTopic]);

    const renderTopicList = () => (
        <Card className={`flex flex-col h-full ${isMobileView && selectedTopic ? 'hidden' : 'block'} md:block w-full`}>
            <div className="p-3 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center"><ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 mr-2 text-brand-primary"/> Обсуждения</h2>
                <Button onClick={() => { setIsCreateModalOpen(true); }} size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Создать</Button>
            </div>
             <div className="p-2 border-b border-brand-border flex gap-2">
                <Button variant={topicTypeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTopicTypeFilter('all')} className="flex-1 text-xs">Все</Button>
                <Button variant={topicTypeFilter === 'general' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTopicTypeFilter('general')} className="flex-1 text-xs">Общие</Button>
                <Button variant={topicTypeFilter === 'rationalization' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTopicTypeFilter('rationalization')} className="flex-1 text-xs">Рац.</Button>
            </div>
            {isLoadingList ? <LoadingSpinner/> : (
                <ul className="overflow-y-auto flex-grow custom-scrollbar-thin">
                    {topics.map(topic => (
                        <li key={topic.id}>
                            <button onClick={() => handleSelectTopic(topic.id)} className={`w-full text-left p-3 hover:bg-brand-secondary transition-colors border-l-4 ${selectedTopic?.id === topic.id ? 'border-sky-500 bg-brand-secondary' : 'border-transparent'}`}>
                                <div className="flex items-start justify-between">
                                    <p className="font-semibold text-brand-text-primary truncate">{topic.title}</p>
                                    {topic.type === 'rationalization' && <LightBulbIcon className="h-4 w-4 text-amber-500 flex-shrink-0 ml-1" />}
                                </div>
                                <div className="text-xs text-brand-text-muted flex justify-between items-center mt-1">
                                    <span>{topic.authorName}</span>
                                    <span>{topic.postCount} сообщ.</span>
                                </div>
                                 <div className="flex gap-1 mt-1.5 flex-wrap">
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${DISCUSSION_STATUS_COLOR_MAP[topic.status]}`}>{topic.status}</span>
                                    {(topic.tags || []).map(tag => <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-brand-surface rounded-full">{tag}</span>)}
                                    {topic.rationalization && <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 border border-amber-200">Эффект: {topic.rationalization.expectedEconomy}</span>}
                                 </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );

    const renderTopicDetail = () => (
         <Card className={`flex flex-col h-full ${isMobileView && !selectedTopic ? 'hidden' : 'block'} md:block w-full`}>
            {isMobileView && selectedTopic && (
                <Button onClick={() => setSelectedTopic(null)} variant="ghost" className="m-2 self-start" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>К списку</Button>
            )}
            {isLoadingDetail ? <div className="flex-grow flex justify-center items-center"><LoadingSpinner/></div> : !selectedTopic ? (
                 <div className="flex-grow flex items-center justify-center text-center text-brand-text-muted p-4">
                    <ChatBubbleOvalLeftEllipsisIcon className="h-12 w-12 mb-2"/>
                    <p>Выберите обсуждение для просмотра</p>
                </div>
            ) : (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="p-3 border-b border-brand-border flex-shrink-0">
                        <div className="flex justify-between items-start">
                            <div className="flex-grow">
                                <h3 className="text-xl font-semibold text-brand-text-primary flex items-center">
                                    {selectedTopic.type === 'rationalization' && <LightBulbIcon className="h-6 w-6 mr-2 text-amber-500"/>}
                                    {selectedTopic.title}
                                </h3>
                            </div>
                            <div className="flex space-x-2">
                                {user && (selectedTopic.authorId === user.id || user.role === 'ceo') && selectedTopic.status === 'open' && selectedTopic.type === 'general' && (
                                    <Button size="sm" onClick={() => setIsVoteModalOpen(true)} leftIcon={<FlagIcon className="h-4 w-4"/>}>
                                        Начать голосование
                                    </Button>
                                )}
                                {user && (user.role === 'ceo' || user.role === 'manager') && selectedTopic.type === 'rationalization' && selectedTopic.status === 'open' && (
                                     <Button size="sm" onClick={() => setIsImplModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white" leftIcon={<BanknotesIcon className="h-4 w-4"/>}>
                                        Внедрить и выплатить
                                    </Button>
                                )}
                                {user && (selectedTopic.authorId === user.id || user.role === 'ceo') && !selectedTopic.isArchived && (
                                    <Button size="sm" variant="secondary" onClick={() => {setTopicToEdit(selectedTopic); setIsEditorModalOpen(true);}} leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>
                                        Редактировать
                                    </Button>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-brand-text-muted">Автор: {selectedTopic.authorName} ({new Date(selectedTopic.createdAt).toLocaleDateString('ru-RU')})</p>
                         <div className="flex gap-1.5 mt-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${DISCUSSION_STATUS_COLOR_MAP[selectedTopic.status]}`}>{selectedTopic.status}</span>
                            {(selectedTopic.tags || []).map(tag => <span key={tag} className="px-2 py-0.5 text-xs bg-brand-surface rounded-full flex items-center"><TagIcon className="h-3 w-3 mr-1"/>{tag}</span>)}
                         </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-3 space-y-4 custom-scrollbar-thin">
                        {selectedTopic.type === 'rationalization' && selectedTopic.rationalization && (
                             <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                                 <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center"><LightBulbIcon className="h-5 w-5 mr-2"/>Рацпредложение</h4>
                                 {selectedTopic.rationalization.status === 'implemented' && (
                                     <div className="mb-3 p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded border border-emerald-200 flex items-center">
                                         <CheckCircleIcon className="h-5 w-5 mr-2"/>
                                         <div>
                                             <strong>Внедрено!</strong> Экономия: {selectedTopic.rationalization.actualEconomy} ₽. Премия выплачена: {selectedTopic.rationalization.rewardAmount} ₽.
                                         </div>
                                     </div>
                                 )}
                                 <div className="grid gap-2 text-sm">
                                     <div><strong>Проблема:</strong> {selectedTopic.rationalization.problem}</div>
                                     <div><strong>Решение:</strong> {selectedTopic.rationalization.solution}</div>
                                     <div><strong>Ожидаемый эффект:</strong> {selectedTopic.rationalization.expectedEconomy}</div>
                                 </div>
                             </div>
                        )}

                        {selectedTopic.voting && (
                           <VotingWidget
                                topic={selectedTopic}
                                currentUser={user}
                                onVote={handleCastVote}
                                onCloseVote={handleCloseVote}
                           />
                        )}
                        
                        <div className="bg-brand-surface rounded-md p-3">
                           <MarkdownDisplay markdown={selectedTopic.description} />
                        </div>
                        <div className="space-y-4">
                           {postTree.map(post => <PostItem key={post.id} post={post} onReply={handleAddPost} onReact={handleToggleReaction} currentUserId={user?.id} allUsers={allUsers}/>)}
                        </div>
                    </div>
                    {selectedTopic.status !== 'closed' && (
                        <div className="p-3 border-t border-brand-border flex-shrink-0">
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="Написать комментарий..."
                                rows={3}
                                className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm mb-2"
                            />
                            <Button onClick={() => handleAddPost(null, newPostContent)} disabled={!newPostContent.trim() || isLoadingDetail}>Отправить</Button>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );

    return (
        <div className="space-y-4 h-full">
            {error && <p className="text-red-500 bg-red-500/10 p-2 rounded-md">{error}</p>}
            <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-8rem)] gap-4">
                <div className="w-full md:w-1/3 lg:w-1/4 h-full">
                    {renderTopicList()}
                </div>
                <div className="w-full md:w-2/3 lg:w-3/4 h-full">
                    {renderTopicDetail()}
                </div>
            </div>
             {isCreateModalOpen && (
                <CreateTopicModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onCreate={handleCreateTopic} 
                />
            )}
             {isEditorModalOpen && topicToEdit && (
                <TopicEditorModal
                    isOpen={isEditorModalOpen}
                    onClose={() => {setIsEditorModalOpen(false); setTopicToEdit(null);}}
                    onSave={handleSaveEditedTopic}
                    onArchive={handleArchiveTopic}
                    onDelete={handleDeleteTopic}
                    topicToEdit={topicToEdit}
                />
            )}
            {isVoteModalOpen && selectedTopic && (
                <StartVoteModal
                    isOpen={isVoteModalOpen}
                    onClose={() => setIsVoteModalOpen(false)}
                    onStart={handleStartVote}
                    isLoading={isLoadingDetail}
                />
            )}
             {isImplModalOpen && (
                <ImplementationModal
                    isOpen={isImplModalOpen}
                    onClose={() => setIsImplModalOpen(false)}
                    onConfirm={handleImplement}
                    isSaving={isLoadingDetail}
                />
            )}
            <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
        </div>
    );
};

export default DiscussionsPage;