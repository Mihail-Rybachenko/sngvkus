-- Этап проверки рецептуры экспертом-диетологом перед упаковкой
ALTER TABLE projects
  MODIFY COLUMN status ENUM(
    'draft',
    'analysis',
    'recipe',
    'recipe_expert_review',
    'packaging',
    'presentation',
    'expert_review',
    'completed'
  ) NOT NULL DEFAULT 'draft';
