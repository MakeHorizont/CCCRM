

import { KnowledgeBaseItem } from '../../types';

export let mockKnowledgeBaseItems: KnowledgeBaseItem[] = [
  {
    id: 'kb-folder-1',
    name: 'Марксистская Теория',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessRules: [],
    itemType: 'folder',
    isArchived: false,
    tags: ['марксизм', 'теория', 'основы'],
  },
  {
    id: 'kb-file-1-1',
    name: 'Капитал Том 1.md',
    folderId: 'kb-folder-1',
    fileType: 'markdown',
    content: '# Капитал, Том 1\n\nКраткое изложение основных тезисов...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessRules: [],
    itemType: 'file',
    isArchived: false,
    tags: ['капитал', 'экономика', 'критика'],
    mustRead: true,
    readBy: [
        { userId: 'user1', userName: 'Левченко Роман', timestamp: new Date(Date.now() - 10000000).toISOString() }
    ]
  },
  {
    id: 'kb-folder-2',
    name: 'Пятилетние Планы',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessRules: [],
    itemType: 'folder',
    isArchived: false,
    tags: ['планирование', 'ссср', 'экономика'],
  },
  {
    id: 'kb-file-2-1',
    name: 'Первый пятилетний план.md',
    folderId: 'kb-folder-2',
    fileType: 'markdown',
    content: '# Первый пятилетний план (1928-1932)\n\nЦели и результаты...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessRules: [],
    itemType: 'file',
    isArchived: false,
    tags: ['индустриализация', 'план'],
  },
  {
    id: 'kb-file-root-1',
    name: 'Устав Партии.md',
    folderId: null,
    fileType: 'markdown',
    content: '# Устав Коммунистической Партии\n\nОсновные положения...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    accessRules: [],
    itemType: 'file',
    isArchived: false,
    tags: ['устав', 'партия', 'документ'],
    mustRead: true,
    quiz: {
        title: 'Проверка знания Устава',
        passingScorePercent: 100,
        questions: [
            {
                id: 'q1',
                text: 'Что является высшим принципом руководства?',
                options: ['Анархия', 'Демократический централизм', 'Единоначалие', 'Рыночная конъюнктура'],
                correctOptionIndex: 1
            },
            {
                id: 'q2',
                text: 'Кому принадлежат средства производства?',
                options: ['Директору', 'Акционерам', 'Всему коллективу', 'Государству'],
                correctOptionIndex: 2
            }
        ]
    },
    readBy: []
  },
  {
    id: 'kb-folder-archived-1',
    name: 'Архивная Папка Идей',
    parentId: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    accessRules: [],
    itemType: 'folder',
    isArchived: true,
    archivedAt: new Date().toISOString(),
    tags: ['архив', 'идеи'],
  },
];