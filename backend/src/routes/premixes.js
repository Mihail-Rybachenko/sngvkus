import { Router } from 'express';
import { httpError } from '../errors.js';

export const premixesRouter = Router();

// Список премиксов
premixesRouter.get('/premixes', async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const [rows] = await pool.query(
      'SELECT id, name, price, created_at FROM premixes ORDER BY name ASC'
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      }))
    );
  } catch (e) {
    next(e);
  }
});

// Состав премиксов (все строки таблицы premix_composition)
premixesRouter.get('/premix_composition', async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const [rows] = await pool.query(
      'SELECT id, premix_id, element_name, value FROM premix_composition ORDER BY premix_id ASC, id ASC'
    );
    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        premixId: r.premix_id,
        elementName: r.element_name,
        value: Number(r.value),
      }))
    );
  } catch (e) {
    next(e);
  }
});

// Состав конкретного премикса
premixesRouter.get('/premixes/:id/composition', async (req, res, next) => {
  try {
    const pool = req.app.locals.db;
    const premixId = req.params.id;
    if (!premixId) throw httpError(400, 'Invalid premix id');

    const [rows] = await pool.query(
      'SELECT element_name, value FROM premix_composition WHERE premix_id = :premixId ORDER BY id ASC',
      { premixId }
    );
    res.json(
      rows.map((r) => ({
        elementName: r.element_name,
        value: Number(r.value),
      }))
    );
  } catch (e) {
    next(e);
  }
});

