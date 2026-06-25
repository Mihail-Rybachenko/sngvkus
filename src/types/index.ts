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
  /** Ключ элемента (copper, zinc, …) для связи с конструктором рецептур */
  elementKey?: string | null;
  value: number;
  norm: number;
  refMin?: number | null;
  refMax?: number | null;
  unit: string;
  deficiency: boolean;
  surplus?: boolean;
  balanceStatus?: 'normal' | 'deficit' | 'surplus';
  consequenceText?: string | null;
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
  subjectAge?: number | null;
  subjectSex?: 'male' | 'female' | null;
  subjectProfile?: string | null;
  elements: MicroElement[];
  deficiencies: string[];
  surpluses?: string[];
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
export type ProjectStatus =
  | 'draft'
  | 'analysis'
  | 'recipe'
  | 'recipe_expert_review'
  | 'packaging'
  | 'presentation'
  | 'expert_review'
  | 'completed';

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

