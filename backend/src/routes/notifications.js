import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';

export const notificationsRouter = Router();

function dto(row) {
  return {
    id: String(row.id),
    type: row.type,
    message: row.message,
    projectId: String(row.project_id),
    read: !!row.is_read,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

notificationsRouter.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const userId = Number(req.auth.userId);
    if (!Number.isFinite(userId)) throw httpError(401, 'Unauthorized');

    const [rows] = await pool.query(
      `SELECT id, user_id, project_id, type, message, is_read, created_at
       FROM notifications
       WHERE user_id = :userId
       ORDER BY created_at DESC`,
      { userId }
    );
    res.json(rows.map(dto));
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const userId = Number(req.auth.userId);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, 'Invalid notification id');

    const [[row]] = await pool.query(
      'SELECT id, user_id, project_id, type, message, is_read, created_at FROM notifications WHERE id=:id',
      { id }
    );
    if (!row) throw httpError(404, 'Notification not found');
    if (row.user_id !== userId) throw httpError(403, 'Forbidden');

    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id=:id', { id });
    const [[updated]] = await pool.query(
      'SELECT id, user_id, project_id, type, message, is_read, created_at FROM notifications WHERE id=:id',
      { id }
    );
    res.json(dto(updated));
  } catch (e) {
    next(e);
  }
});

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