// services/api/discussionService.ts
import { DiscussionTopic, DiscussionPost, Vote, WarehouseItem, WarehouseItemIncident } from '../../types';
import { mockDiscussions } from '../mockData/discussions';
import { mockWarehouseIncidents } from '../mockData/warehouseIncidents';
import { authService } from '../authService';
import { delay, deepCopy, createSystemNotification } from './utils';
import { generateId } from '../../utils/idGenerators';
import { ROUTE_PATHS } from '../../constants';


const getDiscussionTopics = async (filters: { viewMode: 'active' | 'archived' }): Promise<DiscussionTopic[]> => {
    await delay(400);
    let topics = deepCopy(mockDiscussions);
    if (filters.viewMode === 'archived') {
        topics = topics.filter(t => t.isArchived);
    } else {
        topics = topics.filter(t => !t.isArchived);
    }
    return topics.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

const getDiscussionTopicById = async (id: string): Promise<DiscussionTopic | null> => {
    await delay(300);
    const topic = mockDiscussions.find(t => t.id === id);
    return topic ? deepCopy(topic) : null;
};

const addDiscussionTopic = async (data: Omit<DiscussionTopic, 'id'|'authorId'|'authorName'|'createdAt'|'updatedAt'|'isArchived'|'archivedAt'|'postCount'|'posts'>): Promise<DiscussionTopic> => {
    await delay(500);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    const newTopic: DiscussionTopic = {
        ...data,
        id: generateId('topic'),
        authorId: user.id,
        authorName: user.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
        postCount: 0,
        posts: [],
    };
    mockDiscussions.unshift(newTopic);
    return deepCopy(newTopic);
};

const updateDiscussionTopic = async (topicId: string, data: Partial<Pick<DiscussionTopic, 'title' | 'description' | 'tags'>>): Promise<DiscussionTopic> => {
    await delay(400);
    const index = mockDiscussions.findIndex(t => t.id === topicId);
    if (index === -1) throw new Error("Topic not found");
    mockDiscussions[index] = { ...mockDiscussions[index], ...data, updatedAt: new Date().toISOString() };
    return deepCopy(mockDiscussions[index]);
};

const archiveDiscussionTopic = async (topicId: string, archive: boolean): Promise<DiscussionTopic> => {
    await delay(300);
    const index = mockDiscussions.findIndex(t => t.id === topicId);
    if (index === -1) throw new Error("Topic not found");
    mockDiscussions[index].isArchived = archive;
    mockDiscussions[index].archivedAt = archive ? new Date().toISOString() : undefined;
    mockDiscussions[index].status = archive ? 'archived' : 'open';
    mockDiscussions[index].updatedAt = new Date().toISOString();
    return deepCopy(mockDiscussions[index]);
};

const deleteDiscussionTopic = async (topicId: string): Promise<{ success: true }> => {
    await delay(500);
    const index = mockDiscussions.findIndex(t => t.id === topicId);
    if (index > -1 && mockDiscussions[index].isArchived) {
        mockDiscussions.splice(index, 1);
        return { success: true };
    }
    if (index === -1) throw new Error("Topic not found");
    throw new Error("Topic must be archived before deletion");
};

const addDiscussionPost = async (data: { topicId: string, content: string, parentId: string | null }): Promise<DiscussionTopic> => {
    await delay(400);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    
    const topicIndex = mockDiscussions.findIndex(t => t.id === data.topicId);
    if (topicIndex === -1) throw new Error("Topic not found");

    const newPost: DiscussionPost = {
        id: generateId('post'),
        topicId: data.topicId,
        parentId: data.parentId,
        authorId: user.id,
        authorName: user.name,
        content: data.content,
        createdAt: new Date().toISOString(),
    };
    mockDiscussions[topicIndex].posts.push(newPost);
    mockDiscussions[topicIndex].postCount = (mockDiscussions[topicIndex].postCount || 0) + 1;
    mockDiscussions[topicIndex].updatedAt = new Date().toISOString();

    const topic = mockDiscussions[topicIndex];
    const subscribers = new Set([topic.authorId]);
    topic.posts.forEach(p => subscribers.add(p.authorId));

    subscribers.forEach(subId => {
        if (subId !== user.id) {
            createSystemNotification(
                subId,
                'info',
                `${user.name} ответил(а) в обсуждении: "${topic.title}"`,
                `${ROUTE_PATHS.DISCUSSIONS}?topicId=${topic.id}`,
                { type: 'discussion', id: topic.id }
            );
        }
    });

    return deepCopy(mockDiscussions[topicIndex]);
};

const togglePostReaction = async (postId: string, emoji: string, userId: string): Promise<{ success: true }> => {
    await delay(100);
    const topic = mockDiscussions.find(t => t.posts.some(p => p.id === postId));
    if (!topic) throw new Error("Post not found");
    const post = topic.posts.find(p => p.id === postId);
    if (!post) throw new Error("Post not found");

    if (!post.reactions) post.reactions = {};
    const userList = post.reactions[emoji] || [];
    const userIndex = userList.indexOf(userId);

    if (userIndex > -1) {
        userList.splice(userIndex, 1);
    } else {
        userList.push(userId);
    }
    post.reactions[emoji] = userList;
    return { success: true };
};

const startVoteOnTopic = async (topicId: string, proposal: string): Promise<DiscussionTopic> => {
    await delay(400);
    const index = mockDiscussions.findIndex(t => t.id === topicId);
    if (index === -1) throw new Error("Topic not found");
    mockDiscussions[index].status = 'voting';
    mockDiscussions[index].voting = { proposal, votes: [] };
    mockDiscussions[index].updatedAt = new Date().toISOString();
    return deepCopy(mockDiscussions[index]);
};

const castVote = async (topicId: string, userId: string, vote: 'for' | 'against', argument: string): Promise<DiscussionTopic> => {
    await delay(400);
    const user = await authService.getCurrentUser();
    if(!user) throw new Error("User not authenticated");
    const index = mockDiscussions.findIndex(t => t.id === topicId);
    if (index === -1) throw new Error("Topic not found");
    if (mockDiscussions[index].status !== 'voting' || !mockDiscussions[index].voting) throw new Error("Voting is not active for this topic.");
    if (mockDiscussions[index].voting!.votes.some(v => v.userId === userId)) throw new Error("User has already voted.");
    
    const newVote: Vote = {
        userId,
        userName: user.name,
        vote,
        argument,
        timestamp: new Date().toISOString()
    };
    mockDiscussions[index].voting!.votes.push(newVote);
    return deepCopy(mockDiscussions[index]);
};

const closeVoteOnTopic = async (topicId: string): Promise<DiscussionTopic> => {
    await delay(400);
    const index = mockDiscussions.findIndex(t => t.id === topicId);
    if (index === -1) throw new Error("Topic not found");
    mockDiscussions[index].status = 'closed';
    mockDiscussions[index].updatedAt = new Date().toISOString();
    return deepCopy(mockDiscussions[index]);
};

const createDiscussionFromWarehouseIncident = async (incident: WarehouseItemIncident, item: WarehouseItem): Promise<DiscussionTopic> => {
    await delay(500);
    const user = await authService.getCurrentUser();
    if (!user) throw new Error("User not authenticated");
    
    const title = `Инцидент: ${incident.type} - ${item.name} (SKU: ${item.sku})`;
    const description = `### Детали инцидента
**Товар:** ${item.name}
**ID Товара:** ${item.id}
**Тип инцидента:** ${incident.type}
**Дата:** ${new Date(incident.timestamp).toLocaleString()}
**Автор:** ${incident.userName}

**Описание проблемы:**
${incident.description}

### Предложение к обсуждению:
Предлагается коллективно проанализировать причины данного инцидента и разработать меры для предотвращения подобных ситуаций в будущем.`;
    
    const newTopic: DiscussionTopic = {
      id: generateId('topic'),
      title,
      description,
      authorId: user.id,
      authorName: user.name,
      status: 'open',
      tags: ['склад', 'инцидент', incident.type],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
      postCount: 0,
      posts: [],
      relatedEntity: {
        type: 'warehouse_item',
        itemId: item.id,
        itemName: item.name,
        incidentId: incident.id
      }
    };
    
    mockDiscussions.unshift(newTopic);
    
    const incidentIndex = mockWarehouseIncidents.findIndex(i => i.id === incident.id);
    if(incidentIndex > -1){
      mockWarehouseIncidents[incidentIndex].relatedDiscussionId = newTopic.id;
    }
    
    return deepCopy(newTopic);
};


export const discussionService = {
    getDiscussionTopics,
    getDiscussionTopicById,
    addDiscussionTopic,
    updateDiscussionTopic,
    archiveDiscussionTopic,
    deleteDiscussionTopic,
    addDiscussionPost,
    togglePostReaction,
    startVoteOnTopic,
    castVote,
    closeVoteOnTopic,
    createDiscussionFromWarehouseIncident,
};