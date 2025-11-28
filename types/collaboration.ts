

// types/collaboration.ts

export type DiscussionStatus = 'open' | 'voting' | 'closed' | 'archived';
export type DiscussionType = 'general' | 'rationalization';

export interface RationalizationDetails {
    problem: string;
    solution: string;
    expectedEconomy: string; // Description of expected economy
    actualEconomy?: number; // RUB
    status: 'proposed' | 'accepted' | 'rejected' | 'implemented';
    implementedAt?: string;
    rewardAmount?: number; // Bonus paid to author
}

export interface DiscussionPost {
  id: string;
  topicId: string;
  parentId: string | null;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  reactions?: { [emoji: string]: string[] };
}

export interface Vote {
  userId: string;
  userName?: string;
  vote: 'for' | 'against';
  argument: string;
  timestamp: string;
}

export interface DiscussionTopic {
  id: string;
  type: DiscussionType;
  title: string;
  description: string;
  authorId: string;
  authorName?: string;
  status: DiscussionStatus;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
  posts: DiscussionPost[];
  postCount?: number;
  voting?: {
    proposal: string;
    votes: Vote[];
  };
  relatedEntity?: {
    type: 'warehouse_item' | 'production_order';
    itemId: string;
    itemName: string;
    incidentId?: string;
  } | null;
  // Rationalization Specifics
  rationalization?: RationalizationDetails;
  
  // Legacy implementation details (can be deprecated or mapped to rationalization)
  implementationDetails?: {
    status: 'implemented' | 'rejected';
    implementedAt: string;
    economicEffect_RUB?: number;
    bonusPaidToAuthor?: boolean;
  } | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'critical' | 'bonus';
  status: 'read' | 'unread';
  message: string;
  link: string;
  createdAt: string;
  sourceEntity: {
    type: 'task' | 'discussion' | 'order' | 'stock' | 'system' | 'production' | 'bonus';
    id: string;
  };
}

export type KnowledgeBaseItemType = 'folder' | 'file';
export type KnowledgeBasePermissionLevel = 'read' | 'edit';

export interface KnowledgeBaseAccessRule {
  entityId: string;
  entityType: 'user' | 'role';
  level: KnowledgeBasePermissionLevel;
}

export interface KnowledgeBaseFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  accessRules: KnowledgeBaseAccessRule[];
  isArchived?: boolean;
  archivedAt?: string;
  tags?: string[]; 
  itemType: 'folder'; 
}

export interface KnowledgeBaseFile {
  id: string;
  name: string;
  folderId: string | null; 
  fileType: 'markdown' | 'text' | 'image' | 'pdf' | 'word' | 'ebook' | 'other';
  content?: string; 
  url?: string; 
  size?: number; 
  createdAt: string;
  updatedAt: string;
  accessRules: KnowledgeBaseAccessRule[];
  isArchived?: boolean;
  archivedAt?: string;
  tags?: string[]; 
  itemType: 'file'; 
}

export type KnowledgeBaseItem = KnowledgeBaseFolder | KnowledgeBaseFile;

export type SocialInitiativeStatus = 'proposal' | 'active' | 'funded' | 'completed' | 'rejected';

export interface SocialInitiativeParticipant {
    userId: string;
    userName: string;
    supportedAt: string;
}

export interface SocialInitiative {
    id: string;
    title: string;
    description: string;
    authorId: string;
    authorName: string;
    status: SocialInitiativeStatus;
    createdAt: string;
    updatedAt: string;
    targetAmount?: number;
    currentAmount: number;
    supporters: SocialInitiativeParticipant[];
}