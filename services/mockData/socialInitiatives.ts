// services/mockData/socialInitiatives.ts
import { SocialInitiative } from '../../types';

export let mockSocialInitiatives: SocialInitiative[] = [
    {
        id: 'si-1',
        title: 'Новый кофейный аппарат для кухни',
        description: `### Товарищи!
Наша старая кофе-машина часто ломается и не справляется с нагрузкой. Это снижает боевой дух и производительность в утренние часы.
**Предложение:**
Собрать средства на покупку нового, более мощного и надежного профессионального кофейного аппарата.
**Преимущества:**
*   Повышение качества жизни в офисе.
*   Экономия времени.
*   Улучшение настроения коллектива.`,
        authorId: 'user3',
        authorName: 'Сергей Смирнов',
        status: 'active',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        targetAmount: 50000,
        currentAmount: 22000,
        supporters: [
            { userId: 'user2', userName: 'Кораблева Ульяна', supportedAt: new Date().toISOString() },
            { userId: 'user4', userName: 'Анна Кузнецова', supportedAt: new Date().toISOString() },
        ],
    },
    {
        id: 'si-2',
        title: 'Организация коллективного выезда на природу (майские праздники)',
        description: `Предлагаю организовать совместный выезд всего коллектива на природу с шашлыками и спортивными играми на майские праздники. Это поможет укрепить наши товарищеские связи вне рабочей обстановки.
**Примерный план:**
1.  Выбрать место (предлагаю базу отдыха "Лесная Сказка").
2.  Составить смету (аренда, продукты, транспорт).
3.  Собрать средства и организовать поездку.`,
        authorId: 'user4',
        authorName: 'Анна Кузнецова',
        status: 'proposal',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        targetAmount: 80000,
        currentAmount: 0,
        supporters: [],
    },
    {
        id: 'si-3',
        title: 'Покупка теннисного стола',
        description: 'Инициатива по покупке теннисного стола для зоны отдыха. Средства были успешно собраны, стол заказан и установлен!',
        authorId: 'user1',
        authorName: 'Левченко Роман',
        status: 'completed',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        targetAmount: 25000,
        currentAmount: 25000,
        supporters: [
             { userId: 'user1', userName: 'Левченко Роман', supportedAt: new Date().toISOString() },
             { userId: 'user2', userName: 'Кораблева Ульяна', supportedAt: new Date().toISOString() },
             { userId: 'user3', userName: 'Сергей Смирнов', supportedAt: new Date().toISOString() },
             { userId: 'user4', userName: 'Анна Кузнецова', supportedAt: new Date().toISOString() },
             { userId: 'user5', userName: 'Другой Менеджер', supportedAt: new Date().toISOString() },
        ],
    }
];