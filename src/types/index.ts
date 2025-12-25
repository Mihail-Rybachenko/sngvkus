// Типы пользователей и ролей
export type UserRole = 'student' | 'expert' | 'coordinator';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  team?: string;
  name?: string;
}

// Микроэлементы и анализ
export interface MicroElement {
  name: string;
  value: number;
  norm: number;
  unit: string;
  deficiency: boolean;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  labels: string[];
  values: number[];
  title: string;
}

export interface AnalysisData {
  id: string;
  fileName: string;
  uploadedAt: string;
  elements: MicroElement[];
  deficiencies: string[];
  charts: ChartData[];
}

// Рецептуры
export type ProductType = 'chips' | 'flakes' | 'snacks' | 'crackers';

export interface Premix {
  id: string;
  name: string;
  composition: Record<string, number>;
  price: number;
}

export interface NutritionalInfo {
  calories: number;
  proteins: number;
  fats: number;
  carbohydrates: number;
  microelements: Record<string, number>;
}

export interface Recipe {
  id: string;
  productType: ProductType;
  premixes: Premix[];
  nutritionalValue: NutritionalInfo;
  compliance: {
    trts021: boolean;
    issues: string[];
  };
}

// Упаковка
export interface PackagingDesign {
  id: string;
  templateId: string;
  canvasData: string; // JSON для Fabric.js
  exportedAt?: string;
}

// Комментарии и уведомления
export interface Comment {
  id: string;
  author: User;
  text: string;
  createdAt: string;
  type: 'expert' | 'coordinator' | 'student';
}

export interface Notification {
  id: string;
  type: 'project_created' | 'expert_review' | 'recipe_approved' | 'recipe_rejected' | 'project_approved';
  message: string;
  projectId: string;
  read: boolean;
  createdAt: string;
}

// Проекты
export type ProjectStatus = 'draft' | 'analysis' | 'recipe' | 'packaging' | 'presentation' | 'expert_review' | 'completed';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  student: User;
  expert?: User;
  coordinator?: User;
  analysis?: AnalysisData;
  recipe?: Recipe;
  packaging?: PackagingDesign;
  presentation?: {
    id: string;
    templateId: string;
    slides: any[];
  };
  comments?: Comment[];
  notifications?: Notification[];
  createdAt: string;
  updatedAt: string;
}

// API ответы
export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

