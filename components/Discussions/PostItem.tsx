import React, { useState } from 'react';
import { DiscussionPost, User } from '../../types';
import Button from '../UI/Button';
import MarkdownDisplay from '../UI/MarkdownDisplay';
import Tooltip from '../UI/Tooltip';
import { ChatBubbleLeftRightIcon } from '../UI/Icons';

const EMOJI_REACTIONS = ['👍', '🎉', '🤔', '❤️'];

type PostWithChildren = DiscussionPost & { children: PostWithChildren[] };

interface PostItemProps {
    post: PostWithChildren;
    onReply: (parentId: string, content: string) => Promise<void>;
    onReact: (postId: string, emoji: string) => Promise<void>;
    currentUserId: string | undefined;
    allUsers: User[];
}

const PostItem: React.FC<PostItemProps> = ({ post, onReply, onReact, currentUserId, allUsers }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');

    const handleReplySubmit = async () => {
        if (!replyContent.trim()) return;
        await onReply(post.id, replyContent);
        setReplyContent('');
        setIsReplying(false);
    };

    return (
        <div className="flex space-x-3">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-sm font-semibold">
                    {post.authorName?.substring(0, 1).toUpperCase()}
                </div>
            </div>
            <div className="flex-grow">
                <div className="p-3 bg-brand-surface rounded-md">
                    <div className="flex justify-between items-center text-xs text-brand-text-muted mb-2">
                        <strong>{post.authorName}</strong>
                        <span>{new Date(post.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                    <MarkdownDisplay markdown={post.content} />
                    <div className="mt-2 flex items-center space-x-2">
                        <div className="flex space-x-1">
                            {EMOJI_REACTIONS.map(emoji => {
                                const userIds = post.reactions?.[emoji] || [];
                                const hasReacted = currentUserId ? userIds.includes(currentUserId) : false;
                                const userNames = userIds.map(uid => allUsers.find(u => u.id === uid)?.name || 'Неизвестный').join(', ');

                                return (
                                     <Tooltip key={emoji} text={userNames || `Отреагировать: ${emoji}`} position="top">
                                        <button
                                            onClick={() => onReact(post.id, emoji)}
                                            className={`px-2 py-1 text-xs rounded-full border transition-colors ${hasReacted ? 'bg-sky-100 border-sky-500 text-sky-700 dark:bg-sky-500/30 dark:border-sky-500 dark:text-sky-200' : 'bg-brand-secondary border-brand-border text-brand-text-secondary hover:border-brand-primary'}`}
                                        >
                                            {emoji} {userIds.length > 0 && <span>{userIds.length}</span>}
                                        </button>
                                     </Tooltip>
                                );
                            })}
                        </div>
                         <Button variant="ghost" size="sm" onClick={() => setIsReplying(!isReplying)} className="text-xs" leftIcon={<ChatBubbleLeftRightIcon className="h-4 w-4"/>}>
                            {isReplying ? 'Отмена' : 'Ответить'}
                        </Button>
                    </div>
                </div>
                 {isReplying && (
                    <div className="mt-2 pl-4">
                        <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Ответ пользователю ${post.authorName}...`}
                            rows={2}
                            className="w-full p-2 bg-brand-card border border-brand-border rounded-lg text-sm mb-2"
                        />
                        <Button onClick={handleReplySubmit} size="sm" disabled={!replyContent.trim()}>Отправить ответ</Button>
                    </div>
                 )}
                {post.children && post.children.length > 0 && (
                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-brand-border">
                        {post.children.map(childPost => (
                            <PostItem key={childPost.id} post={childPost} onReply={onReply} onReact={onReact} currentUserId={currentUserId} allUsers={allUsers}/>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostItem;