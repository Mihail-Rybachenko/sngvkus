import { httpError } from './errors.js';

export const STATUSES = [
  'draft',
  'analysis',
  'recipe',
  'recipe_expert_review',
  'packaging',
  'presentation',
  'expert_review',
  'completed',
];

const NEXT = {
  draft: 'analysis',
  analysis: 'recipe',
  recipe: 'recipe_expert_review',
  recipe_expert_review: null,
  packaging: 'presentation',
  presentation: 'expert_review',
  expert_review: null,
  completed: null,
};

export function canTransition({ from, to }) {
  if (!STATUSES.includes(from) || !STATUSES.includes(to)) return false;
  return NEXT[from] === to;
}

export function getNextStatus(from) {
  return NEXT[from] ?? null;
}

const PREV = {
  analysis: 'draft',
  recipe: 'analysis',
  recipe_expert_review: 'recipe',
  packaging: 'recipe_expert_review',
  presentation: 'packaging',
  expert_review: 'presentation',
  completed: 'expert_review',
};

export function getPrevStatus(from) {
  return PREV[from] || null;
}

const STUDENT_GOTO_ALLOWED = new Set([
  'draft',
  'analysis',
  'recipe',
  'recipe_expert_review',
  'packaging',
  'presentation',
]);

export function assertValidGoto({ role, from, to }) {
  if (!STATUSES.includes(to)) throw httpError(400, 'Invalid target status');
  if (role === 'coordinator') return;
  if (role === 'expert') throw httpError(403, 'Forbidden');
  if (role === 'student') {
    if (from === 'expert_review' || from === 'completed') {
      throw httpError(400, 'Этап меняет координатор');
    }
    if (!STUDENT_GOTO_ALLOWED.has(to)) {
      throw httpError(403, 'Недопустимый этап для самостоятельного перехода');
    }
    return;
  }
  throw httpError(403, 'Forbidden');
}

export function assertRoleForTransition({ role, action, from }) {
  if (action === 'approve_recipe' || action === 'reject_recipe') {
    if (from !== 'recipe_expert_review') throw httpError(400, 'Неверный этап для проверки рецептуры');
    if (role === 'expert') return;
    throw httpError(403, 'Forbidden');
  }

  if (action === 'goto' || action === 'prev') {
    if (role === 'coordinator') return;
    if (role === 'student') return;
    if (role === 'expert') throw httpError(403, 'Forbidden');
    throw httpError(403, 'Forbidden');
  }
  if (action === 'next' || action === 'submit_review') {
    if (role === 'coordinator') return;
    if (role === 'student') {
      if (from === 'presentation') return;
      if (['draft', 'analysis', 'recipe', 'packaging'].includes(from)) return;
      throw httpError(403, 'Forbidden');
    }
    if (role === 'expert') {
      throw httpError(403, 'Forbidden');
    }
    throw httpError(403, 'Forbidden');
  }

  if (action === 'approve' || action === 'reject') {
    if (from !== 'expert_review') throw httpError(400, 'Утверждение доступно только на финальном этапе');
    if (role === 'coordinator') return;
    throw httpError(403, 'Утверждение или отклонение готового проекта доступно только координатору');
  }
}
