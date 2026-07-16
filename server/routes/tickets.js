import { Router } from 'express';
import { q } from '../db.js';

export const ticketsRouter = Router();

const ORDER_FLOW = ['angefragt', 'beauftragt', 'in_arbeit', 'abgeschlossen'];

const TICKET_QUERY = `
  SELECT tk.*, p.name AS property_name, u.top_number,
         o.id AS order_id, o.status AS order_status, o.amount AS order_amount,
         o.created_at AS order_created_at, o.completed_at AS order_completed_at,
         pr.id AS provider_id, pr.name AS provider_name
  FROM tickets tk
  JOIN properties p ON p.id = tk.property_id
  LEFT JOIN units u ON u.id = tk.unit_id
  LEFT JOIN LATERAL (
    SELECT * FROM orders o WHERE o.ticket_id = tk.id ORDER BY o.id DESC LIMIT 1
  ) o ON true
  LEFT JOIN providers pr ON pr.id = o.provider_id
`;

ticketsRouter.get('/tickets', async (req, res, next) => {
  try {
    const { rows } = await q(
      `${TICKET_QUERY} ORDER BY (tk.status = 'abgeschlossen'), tk.created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

ticketsRouter.get('/tickets/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await q(`${TICKET_QUERY} WHERE tk.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ticket nicht gefunden' });
    const ticket = rows[0];
    if (ticket.order_id) {
      const { rows: events } = await q(
        `SELECT status, created_at FROM order_events WHERE order_id = $1 ORDER BY id`,
        [ticket.order_id]
      );
      ticket.order_events = events;
    }
    res.json(ticket);
  } catch (e) {
    next(e);
  }
});

ticketsRouter.post('/tickets', async (req, res, next) => {
  try {
    const { property_id, unit_id = null, category, title, description = '', priority = 'mittel' } = req.body;
    if (!property_id || !category || !title)
      return res.status(400).json({ error: 'Objekt, Kategorie und Titel sind erforderlich' });
    const { rows } = await q(
      `INSERT INTO tickets (property_id, unit_id, category, title, description, priority)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [property_id, unit_id || null, category, title, description, priority]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// Beauftragung eines Dienstleisters: legt einen Auftrag (Status 'angefragt') an.
// Das Auftrags-Schema ist als internes REST/JSON-Modell so gehalten, dass später
// externe Dienstleister-APIs (Webhooks etc.) andocken können.
ticketsRouter.post('/tickets/:id(\\d+)/order', async (req, res, next) => {
  try {
    const { provider_id } = req.body;
    if (!provider_id) return res.status(400).json({ error: 'Dienstleister ist erforderlich' });
    const { rows: tickets } = await q('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (!tickets.length) return res.status(404).json({ error: 'Ticket nicht gefunden' });
    if (tickets[0].status !== 'offen')
      return res.status(409).json({ error: 'Ticket ist bereits beauftragt oder abgeschlossen' });

    const { rows } = await q(
      `INSERT INTO orders (ticket_id, provider_id) VALUES ($1,$2) RETURNING *`,
      [req.params.id, provider_id]
    );
    await q(`INSERT INTO order_events (order_id, status) VALUES ($1, 'angefragt')`, [rows[0].id]);
    await q(`UPDATE tickets SET status = 'beauftragt' WHERE id = $1`, [req.params.id]);
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

async function advanceOrder(orderId) {
  const { rows } = await q('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!rows.length) return { error: 'Auftrag nicht gefunden', code: 404 };
  const order = rows[0];
  const idx = ORDER_FLOW.indexOf(order.status);
  if (idx >= ORDER_FLOW.length - 1) return { error: 'Auftrag ist bereits abgeschlossen', code: 409 };
  const nextStatus = ORDER_FLOW[idx + 1];
  const done = nextStatus === 'abgeschlossen';
  const { rows: updated } = await q(
    `UPDATE orders SET status = $1, completed_at = CASE WHEN $2 THEN now() ELSE completed_at END
     WHERE id = $3 RETURNING *`,
    [nextStatus, done, orderId]
  );
  await q(`INSERT INTO order_events (order_id, status) VALUES ($1, $2)`, [orderId, nextStatus]);
  if (done) await q(`UPDATE tickets SET status = 'abgeschlossen' WHERE id = $1`, [updated[0].ticket_id]);
  return { order: updated[0] };
}

// Status per Klick weiterschalten: angefragt → beauftragt → in_arbeit → abgeschlossen
ticketsRouter.post('/orders/:id(\\d+)/advance', async (req, res, next) => {
  try {
    const result = await advanceOrder(req.params.id);
    if (result.error) return res.status(result.code).json({ error: result.error });
    res.json(result.order);
  } catch (e) {
    next(e);
  }
});

// Simulierter Timer: schaltet den Auftrag serverseitig alle 5 Sekunden weiter
const simulations = new Set();
ticketsRouter.post('/orders/:id(\\d+)/simulate', async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { rows } = await q('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!rows.length) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    if (rows[0].status === 'abgeschlossen')
      return res.status(409).json({ error: 'Auftrag ist bereits abgeschlossen' });
    if (simulations.has(orderId)) return res.json({ simulation: 'läuft bereits' });

    simulations.add(orderId);
    const tick = async () => {
      try {
        const result = await advanceOrder(orderId);
        if (result.error || result.order.status === 'abgeschlossen') {
          simulations.delete(orderId);
          return;
        }
        setTimeout(tick, 5000);
      } catch {
        simulations.delete(orderId);
      }
    };
    setTimeout(tick, 5000);
    res.json({ simulation: 'gestartet', intervall_sekunden: 5 });
  } catch (e) {
    next(e);
  }
});

// Auftragskosten erfassen (fließen in Ausgaben/Steuerberater-Export ein)
ticketsRouter.patch('/orders/:id(\\d+)', async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (amount == null || isNaN(Number(amount)))
      return res.status(400).json({ error: 'Gültiger Betrag ist erforderlich' });
    const { rows } = await q(`UPDATE orders SET amount = $1 WHERE id = $2 RETURNING *`, [
      amount,
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Auftrag nicht gefunden' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});
