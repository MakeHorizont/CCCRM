import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DiscussionTopic, DiscussionPost, User, Vote, DiscussionStatus } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useView } from '../../hooks/useView';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ChatBubbleOvalLeftEllipsisIcon, PlusCircleIcon, ArrowLeftIcon, TagIcon, ChatBubbleLeftRightIcon, FlagIcon, CheckCircleIcon, XCircleIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon } from '../UI/Icons';
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


const DiscussionsPage: React.FC = () => {
    const [topics, setTopics] = useState<DiscussionTopic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [topicToEdit, setTopicToEdit] = useState<DiscussionTopic | null>(null);
    const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
    
    const { user } = useAuth();
    const { isMobileView } = useView();
    
    const [newPostContent, setNewPostContent] = useState('');

    const fetchTopics = useCallback(async (selectTopicId?: string) => {
        setIsLoadingList(true);
        setError(null);
        try {
            const [topicsData, usersData] = await Promise.all([
                 apiService.getDiscussionTopics({ viewMode: 'active' }),
                 apiService.getUsersWithHierarchyDetails()
            ]);
            setTopics(topicsData);
            setAllUsers(usersData);
            if (selectTopicId) {
                await handleSelectTopic(selectTopicId, topicsData);
            }
        } catch (err) {
            setError("Не удалось загрузить список обсуждений.");
        } finally {
            setIsLoadingList(false);
        }
    }, []);

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
    
    const handleSaveTopic = async (data: Partial<DiscussionTopic>) => {
        if(!user) return;
        try {
            let updatedTopic;
            if (data.id) { // Editing existing
                updatedTopic = await apiService.updateDiscussionTopic(data.id, data as any);
            } else { // Creating new
                updatedTopic = await apiService.addDiscussionTopic({
                    title: data.title!,
                    description: data.description!,
                    tags: data.tags,
                    status: 'open',
                });
            }
            setIsEditorModalOpen(false);
            setTopicToEdit(null);
            await fetchTopics(updatedTopic.id);
        } catch(err) {
            console.error("Error saving topic:", err);
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
                <Button onClick={() => { setTopicToEdit(null); setIsEditorModalOpen(true); }} size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>Создать</Button>
            </div>
            {isLoadingList ? <LoadingSpinner/> : (
                <ul className="overflow-y-auto flex-grow custom-scrollbar-thin">
                    {topics.map(topic => (
                        <li key={topic.id}>
                            <button onClick={() => handleSelectTopic(topic.id)} className={`w-full text-left p-3 hover:bg-brand-secondary transition-colors border-l-4 ${selectedTopic?.id === topic.id ? 'border-sky-500 bg-brand-secondary' : 'border-transparent'}`}>
                                <p className="font-semibold text-brand-text-primary truncate">{topic.title}</p>
                                <div className="text-xs text-brand-text-muted flex justify-between items-center mt-1">
                                    <span>{topic.authorName}</span>
                                    <span>{topic.postCount} сообщ.</span>
                                </div>
                                 <div className="flex gap-1 mt-1.5">
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${DISCUSSION_STATUS_COLOR_MAP[topic.status]}`}>{topic.status}</span>
                                    {(topic.tags || []).map(tag => <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-brand-surface rounded-full">{tag}</span>)}
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
                            <h3 className="text-xl font-semibold text-brand-text-primary flex-grow">{selectedTopic.title}</h3>
                            <div className="flex space-x-2">
                                {user && (selectedTopic.authorId === user.id || user.role === 'ceo') && selectedTopic.status === 'open' && (
                                    <Button size="sm" onClick={() => setIsVoteModalOpen(true)} leftIcon={<FlagIcon className="h-4 w-4"/>}>
                                        Начать голосование
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
             {isEditorModalOpen && (
                <TopicEditorModal
                    isOpen={isEditorModalOpen}
                    onClose={() => {setIsEditorModalOpen(false); setTopicToEdit(null);}}
                    onSave={handleSaveTopic}
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
            <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
        </div>
    );
};

export default DiscussionsPage;