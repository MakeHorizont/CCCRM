
import { DiscussionTopic } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockDiscussions: DiscussionTopic[] = [
  {
    id: 'topic-rat-implemented-1',
    type: 'rationalization',
    title: 'Автоматизация нарезки темпе-чипсов',
    description: 'Использование модифицированного слайсера позволило сократить время нарезки в 3 раза.',
    authorId: 'user3',
    authorName: 'Сергей Смирнов',
    status: 'closed',
    tags: ['рацпредложение', 'оборудование', 'внедрено'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    postCount: 1,
    posts: [],
    rationalization: {
        problem: 'Ручная нарезка чипсов занимает слишком много времени и дает разную толщину.',
        solution: 'Адаптация промышленного слайсера под мягкую структуру темпе.',
        expectedEconomy: 'Экономия 20 человеко-часов в месяц.',
        actualEconomy: 45000,
        status: 'implemented',
        implementedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        rewardAmount: 4500
    }
  },
  {
    id: 'topic-rat-1',
    type: 'rationalization',
    title: 'Использование отходов сои для удобрения',
    description: `Предлагаю не выбрасывать шелуху от сои, а компостировать её.`,
    authorId: 'user3',
    authorName: 'Сергей Смирнов',
    status: 'open',
    tags: ['рацпредложение', 'экология', 'отходы'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    postCount: 0,
    posts: [],
    rationalization: {
        problem: 'Шелуха от сои выбрасывается как мусор.',
        solution: 'Организовать компостную яму.',
        expectedEconomy: 'Экономия на вывозе мусора ~5000р/мес.',
        status: 'proposed'
    }
  },
  {
    id: 'topic-1',
    type: 'general',
    title: 'Предложение по улучшению производственного цикла темпе',
    description: `### Товарищи!
Предлагаю обсудить возможность сокращения времени сушки сои после варки.`,
    authorId: 'user2',
    authorName: 'Кораблева Ульяна',
    status: 'open',
    tags: ['производство', 'оптимизация', 'темпе'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    postCount: 1,
    posts: [
      {
        id: generateId('post'),
        topicId: 'topic-1',
        parentId: null,
        authorId: 'user1',
        authorName: 'Левченко Роман',
        content: 'Отличное предложение, Ульяна. Поддерживаю эксперимент.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        reactions: { '👍': ['user2', 'user3'] },
      },
    ],
  }
];
