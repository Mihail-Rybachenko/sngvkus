import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { getProjectForAccess, assertProjectAccess } from '../access.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';

export const presentationsRouter = Router();

presentationsRouter.get('/projects/:projectId/presentation', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: false });

    const [[row]] = await pool.query(
      `SELECT id, template_id, slides_data, created_at, updated_at
       FROM presentations
       WHERE project_id = :projectId
       ORDER BY id DESC
       LIMIT 1`,
      { projectId }
    );
    if (!row) throw httpError(404, 'Presentation not found');

    let slides;
    try {
      slides = JSON.parse(row.slides_data);
    } catch {
      slides = row.slides_data;
    }

    res.json({
      id: String(row.id),
      templateId: row.template_id,
      slides,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

presentationsRouter.put('/projects/:projectId/presentation', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: true });
    if (!['packaging', 'presentation'].includes(project.status || '')) {
      throw httpError(400, 'Этап презентации пока недоступен');
    }

    const [[packagingExists]] = await pool.query(
      'SELECT id FROM packaging_designs WHERE project_id=:projectId LIMIT 1',
      { projectId }
    );
    if (!packagingExists) throw httpError(400, 'Сначала выполните этап упаковки');

    const { templateId, slides } = req.body || {};
    if (!templateId || typeof templateId !== 'string') throw httpError(400, 'templateId is required');
    if (slides === undefined) throw httpError(400, 'slides is required');

    const slides_data = typeof slides === 'string' ? slides : JSON.stringify(slides);

    const [[existing]] = await pool.query(
      'SELECT id FROM presentations WHERE project_id = :projectId ORDER BY id DESC LIMIT 1',
      { projectId }
    );

    let id;
    if (existing) {
      id = existing.id;
      await pool.query(
        'UPDATE presentations SET template_id=:template_id, slides_data=:slides_data WHERE id=:id',
        { id, template_id: templateId, slides_data }
      );
    } else {
      const [ins] = await pool.query(
        'INSERT INTO presentations (project_id, template_id, slides_data) VALUES (:project_id,:template_id,:slides_data)',
        { project_id: projectId, template_id: templateId, slides_data }
      );
      id = ins.insertId;
    }

    await pool.query('UPDATE projects SET status = :status WHERE id = :projectId AND status IN (\'packaging\',\'recipe\')', {
      status: 'presentation',
      projectId,
    });

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    await createNotifications(pool, {
      userIds: [studentId, expertId, coordinatorId].filter(Boolean),
      projectId,
      type: 'expert_review',
      message: 'Презентация сохранена.',
    });

    const [[row]] = await pool.query(
      'SELECT id, template_id, slides_data, created_at, updated_at FROM presentations WHERE id=:id',
      { id }
    );

    let savedSlides;
    try {
      savedSlides = JSON.parse(row.slides_data);
    } catch {
      savedSlides = row.slides_data;
    }

    res.json({
      id: String(row.id),
      templateId: row.template_id,
      slides: savedSlides,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

