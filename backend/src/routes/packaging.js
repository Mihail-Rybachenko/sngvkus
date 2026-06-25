import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { getProjectForAccess, assertProjectAccess } from '../access.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';

export const packagingRouter = Router();

packagingRouter.get('/projects/:projectId/packaging', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: false });

    const [[row]] = await pool.query(
      `SELECT id, template_id, canvas_data, exported_at, created_at, updated_at
       FROM packaging_designs
       WHERE project_id = :projectId
       ORDER BY id DESC
       LIMIT 1`,
      { projectId }
    );
    if (!row) throw httpError(404, 'Packaging design not found');

    res.json({
      id: String(row.id),
      templateId: row.template_id,
      canvasData: row.canvas_data,
      exportedAt: row.exported_at ? new Date(row.exported_at).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

packagingRouter.put('/projects/:projectId/packaging', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: true });
    if (!['packaging', 'presentation', 'expert_review', 'completed'].includes(project.status || '')) {
      throw httpError(400, 'Этап упаковки доступен после одобрения рецептуры экспертом');
    }

    const [[recipeExists]] = await pool.query(
      'SELECT id FROM recipes WHERE project_id=:projectId LIMIT 1',
      { projectId }
    );
    if (!recipeExists) throw httpError(400, 'Сначала выполните этап рецептуры');

    const { templateId, canvasData, exportedAt } = req.body || {};
    if (!templateId || typeof templateId !== 'string') throw httpError(400, 'templateId is required');
    if (typeof canvasData !== 'string') throw httpError(400, 'canvasData must be a string');

    const [[existing]] = await pool.query(
      'SELECT id FROM packaging_designs WHERE project_id = :projectId ORDER BY id DESC LIMIT 1',
      { projectId }
    );

    let id;
    if (existing) {
      id = existing.id;
      await pool.query(
        'UPDATE packaging_designs SET template_id=:template_id, canvas_data=:canvas_data, exported_at=:exported_at WHERE id=:id',
        {
          id,
          template_id: templateId,
          canvas_data: canvasData,
          exported_at: exportedAt ? new Date(exportedAt) : null,
        }
      );
    } else {
      const [ins] = await pool.query(
        'INSERT INTO packaging_designs (project_id, template_id, canvas_data, exported_at) VALUES (:project_id,:template_id,:canvas_data,:exported_at)',
        {
          project_id: projectId,
          template_id: templateId,
          canvas_data: canvasData,
          exported_at: exportedAt ? new Date(exportedAt) : null,
        }
      );
      id = ins.insertId;
    }

    await pool.query('UPDATE projects SET status = :status WHERE id = :projectId AND status IN (\'recipe\')', {
      status: 'packaging',
      projectId,
    });

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    await createNotifications(pool, {
      userIds: [studentId, expertId, coordinatorId].filter(Boolean),
      projectId,
      type: 'expert_review',
      message: 'Дизайн упаковки сохранён.',
    });

    const [[row]] = await pool.query(
      'SELECT id, template_id, canvas_data, exported_at, created_at, updated_at FROM packaging_designs WHERE id=:id',
      { id }
    );

    res.json({
      id: String(row.id),
      templateId: row.template_id,
      canvasData: row.canvas_data,
      exportedAt: row.exported_at ? new Date(row.exported_at).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

