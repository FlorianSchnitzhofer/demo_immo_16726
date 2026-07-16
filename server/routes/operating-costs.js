import { Router } from 'express';
import { q } from '../db.js';

export const operatingCostsRouter = Router();

operatingCostsRouter.get('/operating-costs', async (req, res, next) => {
  try {
    const conds = [];
    const vals = [];
    if (req.query.property_id) {
      vals.push(req.query.property_id);
      conds.push(`property_id = $${vals.length}`);
    }
    if (req.query.year) {
      vals.push(req.query.year);
      conds.push(`year = $${vals.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await q(`SELECT * FROM operating_costs ${where} ORDER BY year DESC, id`, vals);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

operatingCostsRouter.post('/operating-costs', async (req, res, next) => {
  try {
    const { property_id, year, category, description = '', amount } = req.body;
    if (!property_id || !year || !category || amount == null)
      return res.status(400).json({ error: 'Objekt, Jahr, Kategorie und Betrag sind erforderlich' });
    const { rows } = await q(
      `INSERT INTO operating_costs (property_id, year, category, description, amount)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [property_id, year, category, description, amount]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

operatingCostsRouter.delete('/operating-costs/:id', async (req, res, next) => {
  try {
    const { rowCount } = await q('DELETE FROM operating_costs WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Kostenposition nicht gefunden' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
