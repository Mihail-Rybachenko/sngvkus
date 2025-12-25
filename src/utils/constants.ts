// Брендовые цвета Неофуд
export const COLORS = {
  primary: '#4CAF50', // Зеленый
  secondary: '#2196F3', // Синий
  accent: '#FF9800', // Оранжевый
  background: '#F5F5F5',
  text: '#212121',
  textSecondary: '#757575',
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
} as const;

// Роли пользователей
export const USER_ROLES = {
  STUDENT: 'student',
  EXPERT: 'expert',
  COORDINATOR: 'coordinator',
} as const;

// Статусы проектов
export const PROJECT_STATUSES = {
  DRAFT: 'draft',
  ANALYSIS: 'analysis',
  RECIPE: 'recipe',
  PACKAGING: 'packaging',
  COMPLETED: 'completed',
} as const;

// Типы продуктов
export const PRODUCT_TYPES = {
  CHIPS: 'chips',
  FLAKES: 'flakes',
  SNACKS: 'snacks',
  CRACKERS: 'crackers',
} as const;

// API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

