import { Router } from 'express';
import { q } from '../db.js';

export const invoicesRouter = Router();

invoicesRouter.get('/invoices', async (req, res, next) => {
  try {
    const conds = [];
    const vals = [];
    if (req.query.year) {
      vals.push(req.query.year);
      conds.push(`i.year = $${vals.length}`);
    }
    if (req.query.month) {
      vals.push(req.query.month);
      conds.push(`i.month = $${vals.length}`);
    }
    if (req.query.status) {
      vals.push(req.query.status);
      conds.push(`i.status = $${vals.length}`);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await q(
      `SELECT i.*, (i.net_rent + i.bk_akonto) AS total,
              (i.status = 'offen' AND i.due_date < CURRENT_DATE) AS overdue,
              t.tenant_name, u.top_number, p.id AS property_id, p.name AS property_name
       FROM invoices i
       JOIN tenancies t ON t.id = i.tenancy_id
       JOIN units u ON u.id = t.unit_id
       JOIN properties p ON p.id = u.property_id
       ${where}
       ORDER BY i.year DESC, i.month DESC, u.id`,
      vals
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Monatliche Vorschreibungen per Knopfdruck erzeugen (Miete + BK-Akonto)
// für alle im Monat aktiven Mietverhältnisse; bestehende werden übersprungen.
invoicesRouter.post('/invoices/generate', async (req, res, next) => {
  try {
    const year = parseInt(req.body.year, 10);
    const month = parseInt(req.body.month, 10);
    if (!year || !month || month < 1 || month > 12)
      return res.status(400).json({ error: 'Gültige Werte für Jahr und Monat sind erforderlich' });

    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const dueDate = `${year}-${String(month).padStart(2, '0')}-05`;
    const { rows } = await q(
      `INSERT INTO invoices (tenancy_id, year, month, net_rent, bk_akonto, due_date)
       SELECT t.id, $1, $2, t.net_rent, t.bk_akonto, $4
       FROM tenancies t
       WHERE t.start_date <= ($3::date + interval '1 month' - interval '1 day')::date
         AND (t.end_date IS NULL OR t.end_date >= $3::date)
         ${req.body.tenancy_id ? 'AND t.id = $5' : ''}
       ON CONFLICT (tenancy_id, year, month) DO NOTHING
       RETURNING id`,
      req.body.tenancy_id
        ? [year, month, monthStart, dueDate, req.body.tenancy_id]
        : [year, month, monthStart, dueDate]
    );
    res.json({ created: rows.length });
  } catch (e) {
    next(e);
  }
});

// Zahlungsstatus manuell setzen: offen / bezahlt
invoicesRouter.patch('/invoices/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['offen', 'bezahlt'].includes(status))
      return res.status(400).json({ error: "Status muss 'offen' oder 'bezahlt' sein" });
    const { rows } = await q(
      `UPDATE invoices SET status = $1, paid_at = CASE WHEN $1 = 'bezahlt' THEN CURRENT_DATE ELSE NULL END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Vorschreibung nicht gefunden' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
