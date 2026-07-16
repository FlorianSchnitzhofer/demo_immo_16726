import { Router } from 'express';
import { q } from '../db.js';

export const propertiesRouter = Router();

const ACTIVE_TENANCY = `t.start_date <= CURRENT_DATE AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)`;

// Objektliste mit Kennzahlen
propertiesRouter.get('/properties', async (req, res, next) => {
  try {
    const { rows } = await q(`
      SELECT p.*,
        COUNT(u.id)::int AS unit_count,
        COALESCE(SUM(u.area_m2), 0)::float AS total_area,
        COUNT(u.id) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM tenancies t WHERE t.unit_id = u.id AND ${ACTIVE_TENANCY}
        ))::int AS vacant_count
      FROM properties p
      LEFT JOIN units u ON u.property_id = p.id
      GROUP BY p.id
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Objektdetail inkl. Einheiten und aktuellem Mietverhältnis
propertiesRouter.get('/properties/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows: props } = await q('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (!props.length) return res.status(404).json({ error: 'Objekt nicht gefunden' });
    const { rows: units } = await q(
      `SELECT u.*,
              t.id AS tenancy_id, t.tenant_name, t.net_rent, t.bk_akonto,
              t.start_date, t.end_date
       FROM units u
       LEFT JOIN tenancies t ON t.unit_id = u.id AND ${ACTIVE_TENANCY}
       WHERE u.property_id = $1
       ORDER BY u.id`,
      [req.params.id]
    );
    res.json({ ...props[0], units });
  } catch (e) {
    next(e);
  }
});

propertiesRouter.post('/properties', async (req, res, next) => {
  try {
    const { name, address, postal_code = '', city = '', year_built = null, notes = '' } = req.body;
    if (!name || !address) return res.status(400).json({ error: 'Name und Adresse sind erforderlich' });
    const { rows } = await q(
      `INSERT INTO properties (name, address, postal_code, city, year_built, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, address, postal_code, city, year_built, notes]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

propertiesRouter.post('/properties/:id(\\d+)/units', async (req, res, next) => {
  try {
    const { top_number, type, area_m2, floor = '', rooms = null } = req.body;
    if (!top_number || !type || !area_m2)
      return res.status(400).json({ error: 'Top-Nummer, Kategorie und Nutzfläche sind erforderlich' });
    const { rows } = await q(
      `INSERT INTO units (property_id, top_number, type, area_m2, floor, rooms)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, top_number, type, area_m2, floor, rooms]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// Leerstandsübersicht (Einheiten ohne aktives Mietverhältnis)
propertiesRouter.get('/units/vacant', async (req, res, next) => {
  try {
    const { rows } = await q(
      `SELECT u.*, p.name AS property_name
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE NOT EXISTS (
         SELECT 1 FROM tenancies t WHERE t.unit_id = u.id AND ${ACTIVE_TENANCY}
       )
       ORDER BY p.id, u.id`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Monatsanteile eines Mietverhältnisses innerhalb eines Jahres (Monatsgranularität)
function overlapMonths(startDate, endDate, year) {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = endDate ? new Date(endDate + 'T00:00:00Z') : null;
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const from = start > yearStart ? start : yearStart;
  const to = end && end < yearEnd ? end : yearEnd;
  if (from > to) return 0;
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth()) + 1;
}

// Betriebskostenabrechnung: Umlage nach Verteilerschlüssel Nutzfläche
propertiesRouter.get('/properties/:id(\\d+)/bk-abrechnung', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year) return res.status(400).json({ error: 'Parameter year fehlt' });
    const pid = req.params.id;

    const { rows: costs } = await q(
      `SELECT * FROM operating_costs WHERE property_id = $1 AND year = $2 ORDER BY id`,
      [pid, year]
    );
    const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

    const { rows: units } = await q(`SELECT * FROM units WHERE property_id = $1 ORDER BY id`, [pid]);
    const totalArea = units.reduce((s, u) => s + u.area_m2, 0);

    const { rows: tenancies } = await q(
      `SELECT t.* FROM tenancies t
       JOIN units u ON u.id = t.unit_id
       WHERE u.property_id = $1
         AND t.start_date <= $2 AND (t.end_date IS NULL OR t.end_date >= $3)`,
      [pid, `${year}-12-31`, `${year}-01-01`]
    );

    const allocations = units.map((u) => {
      const unitShare = totalArea > 0 ? (totalCosts * u.area_m2) / totalArea : 0;
      const uts = tenancies
        .filter((t) => t.unit_id === u.id)
        .map((t) => {
          const months = overlapMonths(t.start_date, t.end_date, year);
          const costShare = (unitShare * months) / 12;
          const akonto = t.bk_akonto * months;
          return {
            tenancy_id: t.id,
            tenant_name: t.tenant_name,
            months,
            akonto: round2(akonto),
            cost_share: round2(costShare),
            saldo: round2(akonto - costShare), // > 0: Guthaben Mieter, < 0: Nachzahlung
          };
        })
        .filter((t) => t.months > 0);
      const tenantTotal = uts.reduce((s, t) => s + t.cost_share, 0);
      return {
        unit_id: u.id,
        top_number: u.top_number,
        type: u.type,
        area_m2: u.area_m2,
        unit_share: round2(unitShare),
        owner_share: round2(unitShare - tenantTotal), // Leerstandsanteil zulasten Eigentümer
        tenancies: uts,
      };
    });

    res.json({
      property_id: Number(pid),
      year,
      total_costs: round2(totalCosts),
      total_area: totalArea,
      cost_per_m2: totalArea > 0 ? round2(totalCosts / totalArea) : 0,
      costs,
      allocations,
    });
  } catch (e) {
    next(e);
  }
});

const round2 = (n) => Math.round(n * 100) / 100;
const deNum = (n) => (n ?? 0).toFixed(2).replace('.', ',');
const deDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
const csvField = (v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Steuerberater-Export: Einnahmen (Vorschreibungen) und Ausgaben
// (Betriebskosten + abgeschlossene Aufträge) je Objekt und Jahr als CSV
propertiesRouter.get('/properties/:id(\\d+)/export.csv', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year) return res.status(400).json({ error: 'Parameter year fehlt' });
    const pid = req.params.id;

    const { rows: props } = await q('SELECT * FROM properties WHERE id = $1', [pid]);
    if (!props.length) return res.status(404).json({ error: 'Objekt nicht gefunden' });
    const prop = props[0];

    const { rows: invoices } = await q(
      `SELECT i.*, t.tenant_name, u.top_number
       FROM invoices i
       JOIN tenancies t ON t.id = i.tenancy_id
       JOIN units u ON u.id = t.unit_id
       WHERE u.property_id = $1 AND i.year = $2
       ORDER BY i.year, i.month, u.id`,
      [pid, year]
    );
    const { rows: costs } = await q(
      `SELECT * FROM operating_costs WHERE property_id = $1 AND year = $2 ORDER BY id`,
      [pid, year]
    );
    const { rows: orders } = await q(
      `SELECT o.*, p.name AS provider_name, tk.title AS ticket_title, tk.category AS ticket_category
       FROM orders o
       JOIN tickets tk ON tk.id = o.ticket_id
       JOIN providers p ON p.id = o.provider_id
       WHERE tk.property_id = $1 AND o.status = 'abgeschlossen' AND o.amount IS NOT NULL
         AND EXTRACT(YEAR FROM o.completed_at) = $2
       ORDER BY o.completed_at`,
      [pid, year]
    );

    const rows = [['Typ', 'Datum', 'Kategorie', 'Text', 'Einheit', 'Mieter/Dienstleister', 'Status', 'Betrag (EUR)']];
    let incomeTotal = 0;
    for (const i of invoices) {
      const period = `${String(i.month).padStart(2, '0')}/${i.year}`;
      rows.push(['Einnahme', deDate(i.due_date), 'Nettomiete', `Vorschreibung ${period}`, i.top_number, i.tenant_name, i.status, deNum(i.net_rent)]);
      rows.push(['Einnahme', deDate(i.due_date), 'Betriebskosten-Akonto', `Vorschreibung ${period}`, i.top_number, i.tenant_name, i.status, deNum(i.bk_akonto)]);
      incomeTotal += i.net_rent + i.bk_akonto;
    }
    let expenseTotal = 0;
    for (const c of costs) {
      rows.push(['Ausgabe', `31.12.${year}`, `Betriebskosten: ${c.category}`, c.description, '', '', '', deNum(c.amount)]);
      expenseTotal += c.amount;
    }
    for (const o of orders) {
      rows.push([
        'Ausgabe',
        deDate(o.completed_at.toISOString()),
        `Auftrag: ${o.ticket_category}`,
        o.ticket_title,
        '',
        o.provider_name,
        o.status,
        deNum(o.amount),
      ]);
      expenseTotal += o.amount;
    }
    rows.push([]);
    rows.push(['Summe Einnahmen', '', '', '', '', '', '', deNum(incomeTotal)]);
    rows.push(['Summe Ausgaben', '', '', '', '', '', '', deNum(expenseTotal)]);
    rows.push(['Saldo', '', '', '', '', '', '', deNum(incomeTotal - expenseTotal)]);

    // UTF-8 BOM, damit Excel Umlaute korrekt erkennt
    const csv = '\uFEFF' + rows.map((r) => r.map(csvField).join(';')).join('\r\n') + '\r\n';
    const slug = prop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="steuerberater-export_${slug}_${year}.csv"`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
});
