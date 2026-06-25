import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { getProjectForAccess, assertProjectAccess } from '../access.js';
import { createNotifications, getProjectStakeholders } from '../notify.js';

export const commentsRouter = Router();

function commentDto(row) {
  return {
    id: String(row.id),
    text: row.text,
    type: row.type,
    createdAt: new Date(row.created_at).toISOString(),
    author: {
      id: String(row.author_id),
      email: row.author_email,
      role: row.author_role,
      name: row.author_name ?? undefined,
      team: row.author_team ?? undefined,
    },
  };
}

commentsRouter.get('/projects/:projectId/comments', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: false });

    const [rows] = await pool.query(
      `SELECT c.id, c.project_id, c.author_id, c.text, c.type, c.created_at,
              u.email as author_email, u.role as author_role, u.name as author_name, u.team as author_team
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.project_id = :projectId
       ORDER BY c.created_at DESC`,
      { projectId }
    );
    res.json(rows.map(commentDto));
  } catch (e) {
    next(e);
  }
});

commentsRouter.post('/projects/:projectId/comments', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const project = await getProjectForAccess(pool, projectId);
    assertProjectAccess({ auth: req.auth, project, write: true });

    const { text, type } = req.body || {};
    if (!text || typeof text !== 'string') throw httpError(400, 'text is required');

    // Type: если не передан, берём из роли пользователя
    const resolvedType = type || req.auth.role;

    const [ins] = await pool.query(
      'INSERT INTO comments (project_id, author_id, text, type) VALUES (:project_id,:author_id,:text,:type)',
      { project_id: projectId, author_id: Number(req.auth.userId), text, type: resolvedType }
    );

    const { studentId, expertId, coordinatorId } = await getProjectStakeholders(pool, projectId);
    const authorId = Number(req.auth.userId);
    const recipients = [studentId, expertId, coordinatorId].filter((x) => x && Number(x) !== authorId);
    await createNotifications(pool, {
      userIds: recipients,
      projectId,
      type: 'expert_review',
      message: 'Добавлен новый комментарий по проекту.',
    });

    const id = ins.insertId;
    const [[row]] = await pool.query(
      `SELECT c.id, c.project_id, c.author_id, c.text, c.type, c.created_at,
              u.email as author_email, u.role as author_role, u.name as author_name, u.team as author_team
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.id = :id`,
      { id }
    );

    res.status(201).json(commentDto(row));
  } catch (e) {
    next(e);
  }
});

