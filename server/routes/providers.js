import { Router } from 'express';
import { q } from '../db.js';

export const providersRouter = Router();

providersRouter.get('/providers', async (req, res, next) => {
  try {
    const { rows } = await q(`
      SELECT p.*,
        COUNT(o.id)::int AS order_count,
        COUNT(o.id) FILTER (WHERE o.status <> 'abgeschlossen')::int AS active_orders
      FROM providers p
      LEFT JOIN orders o ON o.provider_id = p.id
      GROUP BY p.id
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

providersRouter.post('/providers', async (req, res, next) => {
  try {
    const { name, contact_email = '', phone = '', categories = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });
    const { rows } = await q(
      `INSERT INTO providers (name, contact_email, phone, categories) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, contact_email, phone, categories]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});
