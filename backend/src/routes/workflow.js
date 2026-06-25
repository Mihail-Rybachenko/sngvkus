import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { getProjectForAccess, assertProjectAccess } from '../access.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';
import { getNextStatus, getPrevStatus, assertRoleForTransition, assertValidGoto } from '../workflow.js';

export const workflowRouter = Router();

async function hasProjectStatusValue(pool, value) {
  try {
    const [[row]] = await pool.query(
      `SELECT COLUMN_TYPE AS column_type
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'projects'
         AND COLUMN_NAME = 'status'
       LIMIT 1`
    );
    const t = String(row?.column_type || '');
    return t.includes(`'${String(value)}'`);
  } catch {
    return false;
  }
}

workflowRouter.post('/projects/:projectId/workflow', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: true });

    const action = (req.body?.action || 'next').toString();
    const from = project.status;

    assertRoleForTransition({ role: req.auth.role, action, from });

    let to = null;
    if (action === 'next') {
      to = getNextStatus(from);
    } else if (action === 'submit_review') {
      to = 'expert_review';
    } else if (action === 'approve_recipe') {
      to = 'packaging';
    } else if (action === 'reject_recipe') {
      to = 'recipe';
    } else if (action === 'approve') {
      to = 'completed';
    } else if (action === 'reject') {
      to = 'presentation';
    } else if (action === 'prev') {
      to = getPrevStatus(from);
      if (!to) throw httpError(400, 'Нет предыдущего этапа');
      assertValidGoto({ role: req.auth.role, from, to });
    } else if (action === 'goto') {
      to = String(req.body?.to || '');
      assertValidGoto({ role: req.auth.role, from, to });
    } else {
      throw httpError(400, 'Unknown action');
    }

    if (!to) throw httpError(400, 'No next status');

    // Явная проверка, чтобы вместо "Internal server error" дать понятную причину
    if (to === 'recipe_expert_review') {
      const ok = await hasProjectStatusValue(pool, 'recipe_expert_review');
      if (!ok) {
        throw httpError(
          500,
          'База данных не поддерживает статус recipe_expert_review. Примените миграцию database/migration_recipe_expert_review.sql'
        );
      }
      const [[recipeExists]] = await pool.query('SELECT id FROM recipes WHERE project_id=:projectId LIMIT 1', {
        projectId,
      });
      if (!recipeExists) {
        throw httpError(400, 'Сначала сохраните рецептуру, затем подайте на проверку эксперту.');
      }
    }

    await pool.query('UPDATE projects SET status=:status WHERE id=:projectId', { status: to, projectId });

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    const stakeholders = [studentId, expertId, coordinatorId].filter(Boolean);
    const recipeReviewRecipients = [studentId, coordinatorId].filter(Boolean);

    const messageByAction = {
      next: `Проект перешёл на этап «${to}».`,
      submit_review: 'Проект отправлен на утверждение координатору.',
      approve_recipe: 'Эксперт одобрил рецептуру. Можно переходить к упаковке.',
      reject_recipe: 'Рецептура возвращена на доработку по замечаниям эксперта.',
      approve: 'Координатор утвердил проект. Статус «Завершён».',
      reject: 'Координатор вернул проект на этап презентации для доработки.',
      prev: `Проект возвращён на этап «${to}».`,
      goto: `Этап проекта изменён на «${to}».`,
    };
    const typeByAction = {
      next: 'expert_review',
      submit_review: 'expert_review',
      approve_recipe: 'recipe_approved',
      reject_recipe: 'recipe_rejected',
      approve: 'project_approved',
      reject: 'recipe_rejected',
      prev: 'project_created',
      goto: 'project_created',
    };

    const userIds =
      action === 'approve_recipe' || action === 'reject_recipe' ? recipeReviewRecipients : stakeholders;

    await createNotifications(pool, {
      userIds,
      projectId,
      type: typeByAction[action] || 'expert_review',
      message: messageByAction[action] || `Статус изменён на ${to}`,
    });

    res.json({ ok: true, from, to });
  } catch (e) {
    next(e);
  }
});
