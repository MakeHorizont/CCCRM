import { StrategicPlan } from '../../types';

export let mockStrategicPlans: StrategicPlan[] = [
  { id: 'plan1', title: 'Выход на рынок Москвы', description: 'Завоевание 10% рынка темпе в Москве к концу 2024.', status: 'Активен', owner: 'Левченко Роман', timeline: '2023-2024', subTasks: [
      {id: 'plan1sub1', title: 'Анализ конкурентов', completed: true, progress: 100, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), subTasks: [] },
      {id: 'plan1sub2', title: 'Разработка маркетинговой стратегии', completed: false, progress: 40, assigneeId: 'user4', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), kanbanTaskId: 'task2', subTasks: []},
  ], isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];
