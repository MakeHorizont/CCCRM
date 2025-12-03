import { User, DevelopmentPlanItem, TrainingApplication, PerformanceReview, SalaryHistoryEntry } from '../../types';

// CEO_EMAILS can be defined here or imported if used elsewhere for role assignment logic.
export const CEO_EMAILS = ['romalev@fungfung.ru', 'demo@fungfung.ru'];

export let MOCK_USERS: User[] = [
  {
    id: 'user-demo', email: 'demo@fungfung.ru', name: 'Демо Пользователь',
    role: 'ceo', permissions: ['manage_user_hierarchy'], managerId: null,
    status: 'active', functionalRoles: ['Аудитор', 'Наблюдатель'], employmentStartDate: '2024-01-01',
    dailyRate: 5000, salaryVisibility: 'visible',
    tripBonusPerDay: 0, remoteWorkRate: 0,
    attendance: [],
    groupMembershipHistory: [],
    achievements: [],
    displayedAchievementId: null,
    disciplinaryActions: [],
    absences: {excused: 0, unexcused: 0},
    developmentPlan: [],
    trainingApplications: [],
    performanceReviews: [],
    salaryHistory: []
  },
  {
    id: 'user1', email: 'romalev@fungfung.ru', name: 'Левченко Роман',
    role: 'ceo', permissions: ['manage_user_hierarchy'], managerId: null,
    status: 'active', functionalRoles: ['CEO', 'Главный стратег'], employmentStartDate: '2020-01-15',
    dailyRate: 22727, salaryVisibility: 'visible', // 500000 / 22 (approx)
    tripBonusPerDay: 5000, remoteWorkRate: 0,
    attendance: [
        { date: '2024-07-01', type: 'work' }, { date: '2024-07-02', type: 'work' }, { date: '2024-07-03', type: 'late', notes: 'Пробки на дороге' }, { date: '2024-07-04', type: 'work' }, { date: '2024-07-05', type: 'trip', notes: 'Конференция в Сколково' },
        { date: '2024-07-08', type: 'work' }, { date: '2024-07-09', type: 'excused_absence', notes: 'Посещение врача' }, { date: '2024-07-10', type: 'work' }, { date: '2024-07-11', type: 'work' }, { date: '2024-07-12', type: 'work' },
        { date: '2024-07-15', type: 'work' }, { date: '2024-07-16', type: 'work' }, { date: '2024-07-17', type: 'work' }, { date: '2024-07-18', type: 'late' }, { date: '2024-07-19', type: 'work' },
        { date: '2024-07-22', type: 'work' }, { date: '2024-07-23', type: 'work' }, { date: '2024-07-24', type: 'unexcused_absence' }, { date: '2024-07-25', type: 'work' }, { date: '2024-07-26', type: 'work' },
    ],
    groupMembershipHistory: [{roleName: 'CEO', joinDate: '2020-01-15'}, {roleName: 'Главный стратег', joinDate: '2020-01-15'}],
    achievements: [
        { id: 'ach1-ceo', name: 'Лидер Революции Темпе', icon: '🚀', description: 'За успешный вывод компании на самоокупаемость и новаторский подход.', dateAwarded: '2023-12-31', awardedBy: 'system', impact: 'high', bonusType: 'annual', bonusAmount: 100000, bonusCurrency: 'RUB' },
        { id: 'ach2-ceo', name: 'Стратег Года', icon: '🧠', description: 'За разработку и успешную реализацию ключевых стратегических инициатив.', dateAwarded: '2022-12-31', awardedBy: 'system', impact: 'high', bonusType: 'one-time', bonusAmount: 50000, bonusCurrency: 'RUB' }
    ],
    displayedAchievementId: 'ach1-ceo',
    disciplinaryActions: [],
    absences: {excused: 2, unexcused: 0},
    developmentPlan: [
      { id: 'dp1-1', goal: 'Освоить фреймворк Vue.js для расширения стека', status: 'in_progress', targetDate: '2024-12-31' },
      { id: 'dp1-2', goal: 'Пройти курс по публичным выступлениям', status: 'not_started' },
    ],
    trainingApplications: [
      { id: 'ta1-1', courseId: 'C002', courseTitle: 'Продвинутый TypeScript', userId: 'user1', reason: 'Для улучшения качества кода в проекте CCCRM.', status: 'approved', submittedAt: '2024-05-10T10:00:00Z', reviewedBy: {userId: 'user1', userName: 'Левченко Роман'}, reviewedAt: '2024-05-11T11:00:00Z'},
    ],
    performanceReviews: [],
    salaryHistory: [
        { id: 'sh1-1', changeDate: '2023-01-01', newDailyRate: 18181, reason: 'Корректировка по рынку', changedBy: { userId: 'system', userName: 'Система' } },
        { id: 'sh1-2', changeDate: '2024-01-01', newDailyRate: 22727, reason: 'Годовой пересмотр', changedBy: { userId: 'user1', userName: 'Левченко Роман' } }
    ]
  },
  {
    id: 'user2', email: 'ulyana.korableva@fungfung.ru', name: 'Кораблева Ульяна',
    role: 'manager', managerId: 'user1', permissions: [],
    status: 'active', functionalRoles: ['Руководитель производства', 'Ответственный за темпе'], employmentStartDate: '2021-03-01',
    dailyRate: 6818, salaryVisibility: 'hidden', // 150000 / 22
    tripBonusPerDay: 2000, remoteWorkRate: 0,
    attendance: [
        { date: '2024-07-01', type: 'work' }, { date: '2024-07-02', type: 'work' }, { date: '2024-07-03', type: 'work' }, { date: '2024-07-04', type: 'work' },{ date: '2024-07-05', type: 'work' },
        { date: '2024-07-08', type: 'work' }, { date: '2024-07-09', type: 'late' }, { date: '2024-07-10', type: 'work' }, { date: '2024-07-11', type: 'work' },{ date: '2024-07-12', type: 'excused_absence', notes: 'Плановый отгул' },
    ],
    groupMembershipHistory: [{roleName: 'Руководитель производства', joinDate: '2021-03-01'}, {roleName: 'Ответственный за темпе', joinDate: '2021-03-01'}],
    achievements: [
        { id: 'ach1-man', name: 'Оптимизатор Производства', icon: '⚙️', description: 'За оптимизацию производственного процесса, +15% эффективности.', dateAwarded: '2024-03-15', awardedBy: 'ceo', awardedById: 'user1', impact: 'medium', bonusType: 'monthly', bonusAmount: 5000, bonusCurrency: 'RUB' }
    ],
    disciplinaryActions: [],
    absences: {excused: 5, unexcused: 1},
    performanceReviews: [
        {
            id: 'pr1-user2',
            reviewDate: '2024-06-30',
            reviewerId: 'user1',
            reviewerName: 'Левченко Роман',
            overallRating: 'exceeds_expectations',
            strengths: 'Отличное управление командой производства. Показатели эффективности выросли на 15% за квартал.',
            areasForImprovement: 'Необходимо уделить больше внимания документированию новых технологических процессов в Базе Знаний.',
            goalsForNextPeriod: '1. Формализовать и задокументировать 3 новых тех. карты.\n2. Провести обучение для новых сотрудников.'
        }
    ],
    salaryHistory: [
        { id: 'sh2-1', changeDate: '2022-03-01', newDailyRate: 5000, reason: 'Прием на работу', changedBy: { userId: 'user1', userName: 'Левченко Роман' } },
        { id: 'sh2-2', changeDate: '2023-03-01', newDailyRate: 6136, reason: 'Годовой пересмотр', changedBy: { userId: 'user1', userName: 'Левченко Роман' } },
        { id: 'sh2-3', changeDate: '2024-04-01', newDailyRate: 6818, reason: 'Повышение', changedBy: { userId: 'user1', userName: 'Левченко Роман' } }
    ],
    developmentPlan: [],
    trainingApplications: [],
  },
  {
    id: 'user3', email: 'sergey.smirnov@fungfung.ru', name: 'Сергей Смирнов',
    role: 'employee', managerId: 'user2', permissions: [],
    status: 'active', functionalRoles: ['Специалист по качеству', 'Технолог'], employmentStartDate: '2022-06-20',
    dailyRate: 3636, salaryVisibility: 'visible', // 80000 / 22
    attendance: [],
    tripBonusPerDay: 1000, remoteWorkRate: 3200, // Example remote rate, adjusted to daily
    groupMembershipHistory: [{roleName: 'Специалист по качеству', joinDate: '2022-06-20'}, {roleName: 'Технолог', joinDate: '2022-06-20'}],
    achievements: [
        { id: 'ach1-emp', name: 'Мастер Качества', icon: '🔬', description: 'За внедрение новой системы контроля качества.', dateAwarded: '2024-01-20', awardedBy: 'ceo', awardedById: 'user1', impact: 'medium' }
    ],
    performanceReviews: [
        {
            id: 'pr1-user3',
            reviewDate: '2024-07-15',
            reviewerId: 'user2',
            reviewerName: 'Кораблева Ульяна',
            overallRating: 'meets_expectations',
            strengths: '- Высокая внимательность к деталям при контроле качества.\n- Проактивность в выявлении потенциальных проблем.',
            areasForImprovement: 'Необходимо улучшить скорость документирования инцидентов. Иногда отчеты приходят с задержкой.',
            goalsForNextPeriod: 'Сократить среднее время документирования инцидента до 2 часов после его обнаружения.',
            employeeFeedback: 'Согласен с замечанием. Постараюсь наладить процесс.'
        }
    ],
    salaryHistory: [],
    developmentPlan: [
      { id: 'dp3-1', goal: 'Изучить автоматизированное тестирование с помощью Cypress', status: 'not_started' },
    ],
    trainingApplications: [
       { id: 'ta3-1', courseId: 'C002', courseTitle: 'Продвинутый TypeScript', userId: 'user3', reason: 'Хочу глубже понять типизацию для сложных компонентов.', status: 'pending', submittedAt: '2024-07-20T11:00:00Z'},
    ]
  },
  {
    id: 'user4', email: 'anna.kuznetsova@fungfung.ru', name: 'Анна Кузнецова',
    role: 'employee', managerId: 'user1', permissions: [],
    status: 'vacation', functionalRoles: ['Маркетолог', 'SMM-специалист'], employmentStartDate: '2021-09-10',
    dailyRate: 4091, salaryVisibility: 'visible', // 90000 / 22
    attendance: [],
    tripBonusPerDay: 1500, remoteWorkRate: 0,
    groupMembershipHistory: [{roleName: 'Маркетолог', joinDate: '2021-09-10'}],
    achievements: [],
    performanceReviews: [],
    salaryHistory: [],
    developmentPlan: [],
    trainingApplications: [],
  },
  {
    id: 'user5', email: 'another.manager@fungfung.ru', name: 'Другой Менеджер',
    role: 'manager', managerId: 'user1', permissions: [],
    status: 'trip', functionalRoles: ['Руководитель отдела продаж'], employmentStartDate: '2022-01-01',
    dailyRate: 7273, salaryVisibility: 'visible', // 160000 / 22
    attendance: [],
    tripBonusPerDay: 2500, remoteWorkRate: 0,
    groupMembershipHistory: [{roleName: 'Руководитель отдела продаж', joinDate: '2022-01-01'}],
    achievements: [],
    performanceReviews: [],
    salaryHistory: [],
    developmentPlan: [],
    trainingApplications: [],
  },
];