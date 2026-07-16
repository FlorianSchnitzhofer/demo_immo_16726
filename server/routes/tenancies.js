import { Router } from 'express';
import { q } from '../db.js';

export const tenanciesRouter = Router();

tenanciesRouter.get('/tenancies', async (req, res, next) => {
  try {
    const { rows } = await q(`
      SELECT t.*, u.top_number, u.type AS unit_type, u.area_m2,
             p.id AS property_id, p.name AS property_name,
             (t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)) AS active
      FROM tenancies t
      JOIN units u ON u.id = t.unit_id
      JOIN properties p ON p.id = u.property_id
      ORDER BY (t.end_date IS NOT NULL AND t.end_date < CURRENT_DATE), u.id
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

tenanciesRouter.post('/tenancies', async (req, res, next) => {
  try {
    const {
      unit_id,
      tenant_name,
      tenant_email = '',
      tenant_phone = '',
      start_date,
      end_date = null,
      net_rent,
      bk_akonto,
      deposit = 0,
    } = req.body;
    if (!unit_id || !tenant_name || !start_date || net_rent == null || bk_akonto == null)
      return res.status(400).json({ error: 'Einheit, Mieter, Beginn, Nettomiete und BK-Akonto sind erforderlich' });

    // Überschneidung mit bestehendem aktiven Mietverhältnis verhindern
    const { rows: conflict } = await q(
      `SELECT 1 FROM tenancies
       WHERE unit_id = $1 AND start_date <= COALESCE($3, '9999-12-31')::date
         AND (end_date IS NULL OR end_date >= $2::date)`,
      [unit_id, start_date, end_date]
    );
    if (conflict.length)
      return res.status(409).json({ error: 'Für diese Einheit besteht im Zeitraum bereits ein Mietverhältnis' });

    const { rows } = await q(
      `INSERT INTO tenancies (unit_id, tenant_name, tenant_email, tenant_phone, start_date, end_date, net_rent, bk_akonto, deposit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [unit_id, tenant_name, tenant_email, tenant_phone, start_date, end_date, net_rent, bk_akonto, deposit]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

tenanciesRouter.patch('/tenancies/:id', async (req, res, next) => {
  try {
    const allowed = ['tenant_name', 'tenant_email', 'tenant_phone', 'end_date', 'net_rent', 'bk_akonto', 'deposit'];
    const sets = [];
    const vals = [];
    for (const key of allowed) {
      if (key in req.body) {
        vals.push(req.body[key]);
        sets.push(`${key} = $${vals.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Keine änderbaren Felder übergeben' });
    vals.push(req.params.id);
    const { rows } = await q(
      `UPDATE tenancies SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Mietverhältnis nicht gefunden' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
