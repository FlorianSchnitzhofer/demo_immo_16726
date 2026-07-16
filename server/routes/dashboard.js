import { Router } from 'express';
import { q } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', async (req, res, next) => {
  try {
    const [portfolio, receivables, tickets, months, occupancy] = await Promise.all([
      q(`
        SELECT
          (SELECT COUNT(*)::int FROM properties) AS property_count,
          (SELECT COUNT(*)::int FROM units) AS unit_count,
          (SELECT COALESCE(SUM(area_m2),0)::float FROM units) AS total_area,
          (SELECT COUNT(*)::int FROM units u WHERE NOT EXISTS (
            SELECT 1 FROM tenancies t WHERE t.unit_id = u.id
              AND t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
          )) AS vacant_count,
          (SELECT COUNT(*)::int FROM tenancies t
            WHERE t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
          ) AS active_tenancies,
          (SELECT COALESCE(SUM(net_rent + bk_akonto),0)::float FROM tenancies t
            WHERE t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
          ) AS monthly_target
      `),
      q(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'offen')::int AS open_count,
          COALESCE(SUM(net_rent + bk_akonto) FILTER (WHERE status = 'offen'), 0)::float AS open_amount,
          COUNT(*) FILTER (WHERE status = 'offen' AND due_date < CURRENT_DATE)::int AS overdue_count,
          COALESCE(SUM(net_rent + bk_akonto) FILTER (WHERE status = 'offen' AND due_date < CURRENT_DATE), 0)::float AS overdue_amount
        FROM invoices
      `),
      q(`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'abgeschlossen')::int AS open_tickets,
          COUNT(*) FILTER (WHERE status = 'beauftragt')::int AS assigned_tickets
        FROM tickets
      `),
      q(`
        SELECT year, month,
          COALESCE(SUM(net_rent + bk_akonto), 0)::float AS prescribed,
          COALESCE(SUM(net_rent + bk_akonto) FILTER (WHERE status = 'bezahlt'), 0)::float AS paid
        FROM invoices
        WHERE make_date(year, month, 1) >= date_trunc('month', CURRENT_DATE) - interval '5 months'
          AND make_date(year, month, 1) <= date_trunc('month', CURRENT_DATE)
        GROUP BY year, month
        ORDER BY year, month
      `),
      q(`
        SELECT u.type,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM tenancies t WHERE t.unit_id = u.id
              AND t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
          ))::int AS rented
        FROM units u
        GROUP BY u.type
        ORDER BY u.type
      `),
    ]);

    res.json({
      ...portfolio.rows[0],
      ...receivables.rows[0],
      ...tickets.rows[0],
      months: months.rows,
      occupancy: occupancy.rows,
    });
  } catch (e) {
    next(e);
  }
});
