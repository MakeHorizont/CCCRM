// services/api/knowledgeBaseService.ts
import { KnowledgeBaseItem, KnowledgeBaseFolder, KnowledgeBaseFile } from '../../types';
import { mockKnowledgeBaseItems } from '../mockData/knowledgeBaseItems';
import { delay, deepCopy } from './utils';
import { generateId } from '../../utils/idGenerators';

const getKnowledgeBaseItems = async (parentId: string | null, userId: string, roles: string[], viewMode: 'active' | 'archived' = 'active'): Promise<KnowledgeBaseItem[]> => {
    await delay(300);
    return deepCopy(mockKnowledgeBaseItems).filter(item => 
        (item.itemType === 'folder' ? item.parentId === parentId : item.folderId === parentId) &&
        (viewMode === 'archived' ? item.isArchived : !item.isArchived)
    ).sort((a,b) => (a.itemType === b.itemType) ? a.name.localeCompare(b.name) : (a.itemType === 'folder' ? -1 : 1));
};

const getKnowledgeBaseFileContent = async (fileId: string, userId: string, roles: string[]): Promise<KnowledgeBaseFile | null> => {
    await delay(200);
    const file = mockKnowledgeBaseItems.find(item => item.id === fileId && item.itemType === 'file');
    if (!file) {
        return null;
    }
    // Basic permission check - in real app would be more complex
    // For now, allow if no rules or user has a matching rule
    const hasAccess = !file.accessRules || file.accessRules.length === 0 || file.accessRules.some(rule => (rule.entityId === userId && rule.entityType === 'user') || (roles.includes(rule.entityId) && rule.entityType === 'role'));

    if (hasAccess) {
         return deepCopy(file as KnowledgeBaseFile);
    }
    return null;
};

const createKnowledgeBaseFolder = async (folderData: Omit<KnowledgeBaseFolder, 'id' | 'createdAt' | 'updatedAt' | 'itemType' | 'isArchived' | 'archivedAt'>): Promise<KnowledgeBaseFolder> => {
    await delay(300);
    const newFolder: KnowledgeBaseFolder = {
        ...folderData,
        id: generateId('kb-folder'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemType: 'folder',
        isArchived: false,
    };
    mockKnowledgeBaseItems.push(newFolder);
    return deepCopy(newFolder);
};

const createKnowledgeBaseFile = async (fileData: Omit<KnowledgeBaseFile, 'id' | 'createdAt' | 'updatedAt' | 'itemType' | 'isArchived' | 'archivedAt'>): Promise<KnowledgeBaseFile> => {
    await delay(300);
    const newFile: KnowledgeBaseFile = {
        ...fileData,
        id: generateId('kb-file'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemType: 'file',
        isArchived: false,
    };
    mockKnowledgeBaseItems.push(newFile);
    return deepCopy(newFile);
};

const updateKnowledgeBaseItem = async (itemId: string, updates: Partial<KnowledgeBaseItem>): Promise<KnowledgeBaseItem> => {
    await delay(300);
    const index = mockKnowledgeBaseItems.findIndex(i => i.id === itemId);
    if (index === -1) throw new Error("Knowledge Base Item not found");
    
    const originalItem = mockKnowledgeBaseItems[index];

    if (originalItem.itemType === 'folder') {
        const { folderId, ...folderUpdates } = updates as any;
        const updatedFolder: KnowledgeBaseFolder = {
            ...originalItem,
            ...(folderUpdates as Partial<KnowledgeBaseFolder>),
            updatedAt: new Date().toISOString(),
        };
        mockKnowledgeBaseItems[index] = updatedFolder;
        return deepCopy(updatedFolder);
    } else { // 'file'
        const { parentId, ...fileUpdates } = updates as any;
        const updatedFile: KnowledgeBaseFile = {
            ...originalItem,
            ...(fileUpdates as Partial<KnowledgeBaseFile>),
            updatedAt: new Date().toISOString(),
        };
        mockKnowledgeBaseItems[index] = updatedFile;
        return deepCopy(updatedFile);
    }
};

const archiveKnowledgeBaseItem = async (itemId: string, archive: boolean): Promise<{ success: true }> => {
    await delay(300);
    const index = mockKnowledgeBaseItems.findIndex(i => i.id === itemId);
    if (index === -1) throw new Error("Knowledge Base Item not found");
    mockKnowledgeBaseItems[index].isArchived = archive;
    (mockKnowledgeBaseItems[index] as any).archivedAt = archive ? new Date().toISOString() : undefined;
    mockKnowledgeBaseItems[index].updatedAt = new Date().toISOString();
    return { success: true };
};

const deleteKnowledgeBaseItem = async (itemId: string): Promise<{ success: true }> => {
    await delay(500);
    const index = mockKnowledgeBaseItems.findIndex(i => i.id === itemId);
    if (index > -1 && mockKnowledgeBaseItems[index].isArchived) {
        mockKnowledgeBaseItems.splice(index, 1);
        return { success: true };
    }
    if (index === -1) throw new Error("Item not found");
    throw new Error("Item must be archived before deletion");
};

export const knowledgeBaseService = {
    getKnowledgeBaseItems,
    getKnowledgeBaseFileContent,
    createKnowledgeBaseFolder,
    createKnowledgeBaseFile,
    updateKnowledgeBaseItem,
    archiveKnowledgeBaseItem,
    deleteKnowledgeBaseItem,
};
