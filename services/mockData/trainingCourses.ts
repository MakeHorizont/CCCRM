import { TrainingCourse } from '../../types';

export let mockTrainingCourses: TrainingCourse[] = [
    {
        id: 'C001',
        title: 'Основы Диалектического Материализма',
        description: 'Внутренний курс, освежающий ключевые принципы диамата и их применение в нашей работе.',
        type: 'internal',
        tags: ['теория', 'философия'],
        durationHours: 8,
    },
    {
        id: 'C002',
        title: 'Продвинутый TypeScript',
        description: 'Внешний курс от XYZ School для углубленного изучения сложных типов, дженериков и декораторов.',
        type: 'external',
        url: 'https://xyz.school/typescript-advanced',
        tags: ['typescript', 'разработка', 'frontend'],
        durationHours: 40,
    },
    {
        id: 'C003',
        title: 'Безопасность на Производстве',
        description: 'Обязательный внутренний курс по технике безопасности при работе с оборудованием.',
        type: 'internal',
        tags: ['безопасность', 'производство'],
        durationHours: 4,
    },
    {
        id: 'C004',
        title: 'Основы Финансового Учета для Менеджеров',
        description: 'Курс по чтению финансовой отчетности и планированию бюджета.',
        type: 'external',
        url: 'https://finance-courses.com/manager-accounting',
        tags: ['финансы', 'менеджмент'],
        durationHours: 16,
    }
];
