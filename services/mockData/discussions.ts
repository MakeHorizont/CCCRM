import { DiscussionTopic } from '../../types';
import { generateId } from '../../utils/idGenerators';

export let mockDiscussions: DiscussionTopic[] = [
  {
    id: 'topic-1',
    title: 'Предложение по улучшению производственного цикла темпе',
    description: `### Товарищи!

Предлагаю обсудить возможность сокращения времени сушки сои после варки.
**Противоречие:** Долгое время сушки замедляет весь цикл и увеличивает потребление электроэнергии. С другой стороны, недостаточная сушка приведет к браку при ферментации.

**Предложение (Синтез):**
1.  Провести эксперимент с использованием более мощных промышленных вентиляторов.
2.  Рассмотреть возможность использования центрифуги для предварительного удаления влаги.
3.  Проанализировать зависимость влажности сырья от времени сушки и найти оптимальный баланс.

Давайте обсудим риски и потенциальные выгоды.`,
    authorId: 'user2',
    authorName: 'Кораблева Ульяна',
    status: 'open',
    tags: ['производство', 'оптимизация', 'темпе'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    postCount: 3,
    posts: [
      {
        id: generateId('post'),
        topicId: 'topic-1',
        parentId: null,
        authorId: 'user1',
        authorName: 'Левченко Роман',
        content: 'Отличное предложение, Ульяна. Поддерживаю эксперимент с вентиляторами. Нужно просчитать экономический эффект. Какая мощность нам потребуется?',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        reactions: { '👍': ['user2', 'user3'] },
      },
      {
        id: generateId('post'),
        topicId: 'topic-1',
        parentId: null,
        authorId: 'user3',
        authorName: 'Сергей Смирнов',
        content: 'Центрифуга может повредить структуру бобов. Я бы сосредоточился на контроле влажности. У нас есть гигрометр для сыпучих продуктов?',
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        reactions: { '🤔': ['user1'] },
      },
      {
        id: generateId('post'),
        topicId: 'topic-1',
        parentId: 'post-1689694801', // This ID is just a placeholder, in real app it would be the ID of the first post. Let's assume the first post's ID is known. Let's make it a reply to Roman's post.
        authorId: 'user2',
        authorName: 'Кораблева Ульяна',
        content: 'Спасибо за поддержку! Гигрометра нет, нужно будет включить в заявку на закупку. Это ключевой момент для контроля процесса. По вентиляторам - сделаю расчет и представлю на следующей неделе.',
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        reactions: { '👍': ['user1'] },
      },
    ],
  },
  {
    id: 'topic-2',
    title: 'Стратегия маркетинга на Q4 2024',
    description: `Коллеги, приближается Q4. Предлагаю обсудить нашу маркетинговую стратегию.

**Текущее положение:** Мы успешно продаем через Instagram и партнерские магазины.
**Проблема:** Охват ограничен, рост замедлился.

**Идеи:**
- Выход на новые площадки (Ozon, Wildberries).
- Коллаборации с блогерами-веганами.
- Участие в профильных выставках.
`,
    authorId: 'user4',
    authorName: 'Анна Кузнецова',
    status: 'voting',
    tags: ['маркетинг', 'стратегия', 'q4'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isArchived: false,
    postCount: 1,
    posts: [
      {
        id: generateId('post'),
        topicId: 'topic-2',
        parentId: null,
        authorId: 'user1',
        authorName: 'Левченко Роман',
        content: 'Хорошие идеи. Выход на маркетплейсы потребует значительных ресурсов на логистику. Давайте начнем с блогеров и выставок, это менее затратно и даст быстрый фидбек.',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        reactions: {},
      },
    ],
    voting: {
      proposal: 'Сфокусироваться на коллаборациях с блогерами и участии в выставках, отложив выход на маркетплейсы на Q1 2025.',
      votes: [
        { userId: 'user1', userName: 'Левченко Роман', vote: 'for', argument: 'Меньшие первоначальные затраты, быстрая обратная связь от целевой аудитории. Позволит лучше подготовиться к выходу на маркетплейсы.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { userId: 'user3', userName: 'Сергей Смирнов', vote: 'against', argument: 'Выставки имеют низкий ROI. Маркетплейсы дадут больший охват сразу. Нужно искать инвестиции, а не избегать их.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
      ]
    }
  },
   {
    id: 'topic-3',
    title: 'Закрытое обсуждение по итогам года',
    description: `Итоги подведены, премии розданы.`,
    authorId: 'user1',
    authorName: 'Левченко Роман',
    status: 'closed',
    tags: ['финансы', 'итоги'],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    isArchived: false,
    postCount: 0,
    posts: [],
    implementationDetails: {
      status: 'implemented',
      implementedAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
      economicEffect_RUB: 150000,
      bonusPaidToAuthor: true,
    }
  },
  {
    id: 'topic-4',
    title: 'Архивное обсуждение',
    description: 'Это обсуждение было заархивировано.',
    authorId: 'user1',
    authorName: 'Левченко Роман',
    status: 'archived',
    tags: ['архив'],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    isArchived: true,
    archivedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    postCount: 0,
    posts: [],
  },
];

// Simple function to ensure the parentId in mock data points to a real post
const fixPostParentIds = () => {
    mockDiscussions.forEach(topic => {
        if(topic.posts.length > 1) {
            const firstPostId = topic.posts[0].id;
            const replyPost = topic.posts.find(p => p.parentId === 'post-1689694801');
            if(replyPost) {
                replyPost.parentId = firstPostId;
            }
        }
    });
};

fixPostParentIds();