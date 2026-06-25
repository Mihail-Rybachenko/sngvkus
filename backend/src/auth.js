import jwt from 'jsonwebtoken';
import { httpError } from './errors.js';

export function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing env JWT_SECRET');
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return next(httpError(401, 'Unauthorized'));
  const token = m[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Missing env JWT_SECRET');
    const decoded = jwt.verify(token, secret);
    req.auth = decoded;
    return next();
  } catch {
    return next(httpError(401, 'Unauthorized'));
  }
}

