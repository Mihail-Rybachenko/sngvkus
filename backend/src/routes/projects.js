import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';
import { createNotifications, getProjectStakeholders, getAllExpertUserIds } from '../notify.js';

export const projectsRouter = Router();

function userDto(row) {
  if (!row) return undefined;
  return {
    id: String(row.id),
    email: row.email,
    role: row.role,
    name: row.name ?? undefined,
    team: row.team ?? undefined,
  };
}

function projectDto(row) {
  return {
    id: String(row.id),
    name: row.name,
    status: row.status,
    student: userDto({
      id: row.student_id,
      email: row.student_email,
      role: 'student',
      name: row.student_name,
      team: row.student_team,
    }),
    expert: row.expert_id
      ? userDto({
          id: row.expert_id,
          email: row.expert_email,
          role: 'expert',
          name: row.expert_name,
          team: row.expert_team,
        })
      : undefined,
    coordinator: row.coordinator_id
      ? userDto({
          id: row.coordinator_id,
          email: row.coordinator_email,
          role: 'coordinator',
          name: row.coordinator_name,
          team: row.coordinator_team,
        })
      : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

projectsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    if (!Number.isFinite(userId)) throw httpError(401, 'Unauthorized');

    let where = '';
    let params = {};
    if (role === 'student') {
      where = 'WHERE p.student_id = :userId';
      params = { userId };
    } else if (role === 'expert') {
      where = '';
      params = {};
    } else if (role === 'coordinator') {
      where = '';
      params = {};
    } else {
      throw httpError(403, 'Forbidden');
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.*,
        s.id AS student_id, s.email AS student_email, s.name AS student_name, s.team AS student_team,
        e.id AS expert_id, e.email AS expert_email, e.name AS expert_name, e.team AS expert_team,
        c.id AS coordinator_id, c.email AS coordinator_email, c.name AS coordinator_name, c.team AS coordinator_team
      FROM projects p
      JOIN users s ON p.student_id = s.id
      LEFT JOIN users e ON p.expert_id = e.id
      LEFT JOIN users c ON p.coordinator_id = c.id
      ${where}
      ORDER BY p.created_at DESC
      `,
      params
    );

    res.json(rows.map(projectDto));
  } catch (e) {
    next(e);
  }
});

projectsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const [rows] = await pool.query(
      `
      SELECT
        p.*,
        s.id AS student_id, s.email AS student_email, s.name AS student_name, s.team AS student_team,
        e.id AS expert_id, e.email AS expert_email, e.name AS expert_name, e.team AS expert_team,
        c.id AS coordinator_id, c.email AS coordinator_email, c.name AS coordinator_name, c.team AS coordinator_team
      FROM projects p
      JOIN users s ON p.student_id = s.id
      LEFT JOIN users e ON p.expert_id = e.id
      LEFT JOIN users c ON p.coordinator_id = c.id
      WHERE p.id = :projectId
      LIMIT 1
      `,
      { projectId }
    );
    const row = rows[0];
    if (!row) throw httpError(404, 'Project not found');

    // Simple access control: student sees own; expert sees assigned; coordinator sees all
    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    const allowed =
      role === 'coordinator' ||
      (role === 'student' && row.student_id === userId) ||
      role === 'expert';
    if (!allowed) throw httpError(403, 'Forbidden');

    res.json(projectDto(row));
  } catch (e) {
    next(e);
  }
});

projectsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string') throw httpError(400, 'name is required');

    const pool = req.app.locals.db;
    const userId = Number(req.auth.userId);
    if (!Number.isFinite(userId)) throw httpError(401, 'Unauthorized');

    // Create project owned by current user (student flow)
    const [result] = await pool.query(
      'INSERT INTO projects (name, status, student_id) VALUES (:name, :status, :student_id)',
      { name, status: 'draft', student_id: userId }
    );

    const projectId = result.insertId;
    const [[row]] = await pool.query(
      `
      SELECT
        p.*,
        s.id AS student_id, s.email AS student_email, s.name AS student_name, s.team AS student_team,
        e.id AS expert_id, e.email AS expert_email, e.name AS expert_name, e.team AS expert_team,
        c.id AS coordinator_id, c.email AS coordinator_email, c.name AS coordinator_name, c.team AS coordinator_team
      FROM projects p
      JOIN users s ON p.student_id = s.id
      LEFT JOIN users e ON p.expert_id = e.id
      LEFT JOIN users c ON p.coordinator_id = c.id
      WHERE p.id = :projectId
      LIMIT 1
      `,
      { projectId }
    );

    const expertIds = await getAllExpertUserIds(pool);
    const notifyIds = [...new Set([userId, ...expertIds])];
    await createNotifications(pool, {
      userIds: notifyIds,
      projectId,
      type: 'project_created',
      message: `Создан проект «${name}». Студент может приступить к работе; экспертам — контроль рецептуры после отправки на проверку.`,
    });

    res.status(201).json(projectDto(row));
  } catch (e) {
    next(e);
  }
});

projectsRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const { name } = req.body || {};
    if (!name || typeof name !== 'string') throw httpError(400, 'name is required');

    const [[p]] = await pool.query('SELECT id, student_id, expert_id, coordinator_id FROM projects WHERE id=:projectId', { projectId });
    if (!p) throw httpError(404, 'Project not found');

    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    const allowed = role === 'coordinator' || (role === 'student' && p.student_id === userId);
    if (!allowed) throw httpError(403, 'Forbidden');

    await pool.query('UPDATE projects SET name=:name WHERE id=:projectId', { name, projectId });

    const [[row]] = await pool.query(
      `
      SELECT
        p.*,
        s.id AS student_id, s.email AS student_email, s.name AS student_name, s.team AS student_team,
        e.id AS expert_id, e.email AS expert_email, e.name AS expert_name, e.team AS expert_team,
        c.id AS coordinator_id, c.email AS coordinator_email, c.name AS coordinator_name, c.team AS coordinator_team
      FROM projects p
      JOIN users s ON p.student_id = s.id
      LEFT JOIN users e ON p.expert_id = e.id
      LEFT JOIN users c ON p.coordinator_id = c.id
      WHERE p.id = :projectId
      LIMIT 1
      `,
      { projectId }
    );
    res.json(projectDto(row));
  } catch (e) {
    next(e);
  }
});

projectsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const projectId = Number(req.params.id);
    if (!Number.isFinite(projectId)) throw httpError(400, 'Invalid project id');

    const [[p]] = await pool.query('SELECT id, name, student_id, expert_id, coordinator_id FROM projects WHERE id=:projectId', { projectId });
    if (!p) throw httpError(404, 'Project not found');

    const role = req.auth.role;
    const userId = Number(req.auth.userId);
    const allowed = role === 'coordinator' || (role === 'student' && p.student_id === userId);
    if (!allowed || !Number.isFinite(userId)) throw httpError(403, 'Forbidden');

    await pool.query('DELETE FROM projects WHERE id=:projectId', { projectId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

