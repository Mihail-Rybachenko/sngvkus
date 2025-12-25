import type { Project, User } from '@/types';

// Демо-пользователь
export const demoUser: User = {
  id: 'demo-user-1',
  email: 'student@demo.com',
  role: 'student',
  name: 'Иван Иванов',
  team: 'Команда А',
};

// Демо-эксперт
export const demoExpert: User = {
  id: 'demo-expert-1',
  email: 'expert@demo.com',
  role: 'expert',
  name: 'Эксперт Диетолог',
};

// Демо-координатор
export const demoCoordinator: User = {
  id: 'demo-coordinator-1',
  email: 'coordinator@demo.com',
  role: 'coordinator',
  name: 'Координатор Неофуд',
};

// Демо-проекты
export const demoProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Проект "Здоровые чипсы"',
    status: 'analysis',
    student: demoUser,
    comments: [],
    notifications: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'project-2',
    name: 'Проект "Энергетические хлопья"',
    status: 'expert_review',
    student: demoUser,
    comments: [
      {
        id: 'comment-1',
        author: {
          id: 'expert-1',
          email: 'expert@demo.com',
          role: 'expert',
          name: 'Эксперт Диетолог',
        },
        text: 'Рецептура выглядит хорошо, но рекомендую увеличить содержание цинка на 10%',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'expert',
      },
    ],
    notifications: [],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'project-3',
    name: 'Проект "Витаминные снеки"',
    status: 'packaging',
    student: demoUser,
    comments: [],
    notifications: [],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

