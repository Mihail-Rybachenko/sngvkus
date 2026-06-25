import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { httpError } from '../errors.js';

export const usersRouter = Router();

function toUserDto(row) {
  return {
    id: String(row.id),
    email: row.email,
    role: row.role,
    name: row.name ?? undefined,
    team: row.team ?? undefined,
  };
}

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const [[row]] = await pool.query(
      'SELECT id, email, role, name, team FROM users WHERE id=:id',
      { id: req.auth.userId }
    );
    if (!row) throw httpError(401, 'Unauthorized');
    res.json(toUserDto(row));
  } catch (e) {
    next(e);
  }
});

usersRouter.put('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const { name, team } = req.body || {};

    if (name !== undefined && typeof name !== 'string') throw httpError(400, 'name must be a string');
    if (team !== undefined && typeof team !== 'string') throw httpError(400, 'team must be a string');

    await pool.query('UPDATE users SET name=:name, team=:team WHERE id=:id', {
      id: req.auth.userId,
      name: name === undefined ? null : name,
      team: team === undefined ? null : team,
    });

    const [[row]] = await pool.query(
      'SELECT id, email, role, name, team FROM users WHERE id=:id',
      { id: req.auth.userId }
    );
    res.json(toUserDto(row));
  } catch (e) {
    next(e);
  }
});

