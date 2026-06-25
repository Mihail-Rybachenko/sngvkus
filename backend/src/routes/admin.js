import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';

export const adminRouter = Router();

function requireCoordinator(req) {
  if (req.auth?.role !== 'coordinator') throw httpError(403, 'Forbidden');
}

adminRouter.get('/users', requireAuth, async (req, res, next) => {
  try {
    requireCoordinator(req);
    const pool = req.app.locals.db;
    const [rows] = await pool.query(
      'SELECT id, email, role, name, team, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json(
      rows.map((u) => ({
        id: String(u.id),
        email: u.email,
        role: u.role,
        name: u.name ?? undefined,
        team: u.team ?? undefined,
        createdAt: new Date(u.created_at).toISOString(),
        updatedAt: new Date(u.updated_at).toISOString(),
      }))
    );
  } catch (e) {
    next(e);
  }
});

// Assign expert/coordinator to project (coordinator-only)
adminRouter.post('/projects/:projectId/assign', requireAuth, async (req, res, next) => {
  try {
    requireCoordinator(req);
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const { expertId, coordinatorId } = req.body || {};
    if (expertId !== undefined && !Number.isFinite(Number(expertId))) throw httpError(400, 'expertId must be a number');
    if (coordinatorId !== undefined && !Number.isFinite(Number(coordinatorId))) throw httpError(400, 'coordinatorId must be a number');

    await pool.query(
      'UPDATE projects SET expert_id=:expertId, coordinator_id=:coordinatorId WHERE id=:projectId',
      {
        projectId,
        expertId: expertId === undefined ? null : Number(expertId),
        coordinatorId: coordinatorId === undefined ? null : Number(coordinatorId),
      }
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// Update project status (coordinator-only)
adminRouter.post('/projects/:projectId/status', requireAuth, async (req, res, next) => {
  try {
    requireCoordinator(req);
    const pool = req.app.locals.db;
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');
    const { status } = req.body || {};
    if (!status || typeof status !== 'string') throw httpError(400, 'status is required');

    await pool.query('UPDATE projects SET status=:status WHERE id=:projectId', { status, projectId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

