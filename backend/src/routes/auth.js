import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { httpError } from '../errors.js';
import { signToken, requireAuth } from '../auth.js';

export const authRouter = Router();

function toUserDto(row) {
  return {
    id: String(row.id),
    email: row.email,
    role: row.role,
    name: row.name ?? undefined,
    team: row.team ?? undefined,
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body || {};
    if (!email || typeof email !== 'string') throw httpError(400, 'email is required');
    if (!password || typeof password !== 'string') throw httpError(400, 'password is required');
    if (password.length < 8) throw httpError(400, 'Пароль должен содержать минимум 8 символов');

    const pool = req.app.locals.db;
    const [[existing]] = await pool.query('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
    if (existing) throw httpError(409, 'User already exists');

    const password_hash = await bcrypt.hash(password, 10);
    const normalizedRole = role === 'student' ? 'student' : 'student';
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, role, name) VALUES (:email, :password_hash, :role, :name)',
      { email, password_hash, role: normalizedRole, name: name || null }
    );

    const userId = result.insertId;
    const [[userRow]] = await pool.query('SELECT id, email, role, name, team FROM users WHERE id = :id', { id: userId });
    const user = toUserDto(userRow);
    const token = signToken({ userId: String(user.id), role: user.role });
    res.json({ user, token });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string') throw httpError(400, 'email is required');
    if (!password || typeof password !== 'string') throw httpError(400, 'password is required');

    const pool = req.app.locals.db;
    const [[userRow]] = await pool.query(
      'SELECT id, email, role, name, team, password_hash FROM users WHERE email = :email LIMIT 1',
      { email }
    );
    if (!userRow) throw httpError(401, 'Invalid credentials');

    const ok = await bcrypt.compare(password, userRow.password_hash);
    if (!ok) throw httpError(401, 'Invalid credentials');

    const user = toUserDto(userRow);
    const token = signToken({ userId: String(user.id), role: user.role });
    res.json({ user, token });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const [[userRow]] = await pool.query('SELECT id, email, role, name, team FROM users WHERE id = :id', { id: req.auth.userId });
    if (!userRow) throw httpError(401, 'Unauthorized');
    res.json(toUserDto(userRow));
  } catch (e) {
    next(e);
  }
});

