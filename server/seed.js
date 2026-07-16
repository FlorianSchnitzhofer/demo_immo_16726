import { q, pool } from './db.js';

// Beispieldaten: 1 Mietzinshaus in Wien mit 8 Einheiten, 7 Mietverhältnissen
// (1 Einheit Leerstand), 6 Monaten Vorschreibungshistorie, 2 offenen Tickets,
// 3 Dienstleistern und Betriebskosten für das abgeschlossene Vorjahr.

export async function seedIfEmpty() {
  const { rows } = await q('SELECT COUNT(*)::int AS n FROM properties');
  if (rows[0].n > 0) return false;
  await seed();
  return true;
}

export async function resetSampleData() {
  await q(`
    TRUNCATE order_events, orders, tickets, providers, operating_costs,
             invoices, tenancies, units, properties RESTART IDENTITY CASCADE
  `);
  await seed();
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1; // 1-12
    const bkYear = thisYear - 1; // abgeschlossenes Betriebskostenjahr

    // --- Objekt ---
    const {
      rows: [prop],
    } = await client.query(
      `INSERT INTO properties (name, address, postal_code, city, year_built, notes)
       VALUES ('Mietzinshaus Margaretenstraße 42', 'Margaretenstraße 42', '1050', 'Wien', 1902,
               'Gründerzeithaus, 3 Etagen + DG, Lift nachgerüstet 2015')
       RETURNING id`
    );
    const pid = prop.id;

    // --- Einheiten ---
    const unitDefs = [
      // [top, typ, fläche, etage, zimmer]
      ['Top 1', 'geschaeft', 85, 'EG', null],
      ['Top 2', 'wohnung', 48, 'EG', 2],
      ['Top 3', 'wohnung', 72, '1. OG', 3],
      ['Top 4', 'wohnung', 65, '1. OG', 3],
      ['Top 5', 'wohnung', 72, '2. OG', 3],
      ['Top 6', 'wohnung', 65, '2. OG', 3],
      ['Top 7', 'wohnung', 95, 'DG', 4],
      ['Stellplatz 1', 'stellplatz', 12, 'Hof', null],
    ];
    const unitIds = {};
    for (const [top, type, area, floor, rooms] of unitDefs) {
      const {
        rows: [u],
      } = await client.query(
        `INSERT INTO units (property_id, top_number, type, area_m2, floor, rooms)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [pid, top, type, area, floor, rooms]
      );
      unitIds[top] = u.id;
    }

    // --- Mietverhältnisse (Top 6 bleibt Leerstand) ---
    const tenancyDefs = [
      // [top, name, email, telefon, beginn, nettomiete, bk-akonto, kaution]
      ['Top 1', 'Café Amelie e.U.', 'office@cafe-amelie.at', '+43 1 545 33 21', '2019-04-01', 1275, 190, 3825],
      ['Top 2', 'Josef Leitner', 'josef.leitner@gmx.at', '+43 664 123 45 67', '2016-09-01', 505, 105, 1515],
      ['Top 3', 'Maria Gruber', 'maria.gruber@aon.at', '+43 699 987 65 43', '2021-02-01', 790, 160, 2370],
      ['Top 4', 'Thomas Berger', 'thomas.berger@gmail.com', '+43 676 555 12 34', '2018-06-01', 680, 140, 2040],
      ['Top 5', 'Sarah Hofer', 'sarah.hofer@outlook.com', '+43 660 222 88 99', `${bkYear}-07-01`, 830, 155, 2490],
      ['Top 7', 'DI Katharina Steiner', 'k.steiner@steiner-architektur.at', '+43 1 890 44 55', '2020-11-01', 1235, 210, 3705],
      ['Stellplatz 1', 'Michael Pichler', 'm.pichler@chello.at', '+43 650 333 77 11', '2022-03-01', 90, 25, 0],
    ];
    const tenancies = [];
    for (const [top, name, email, phone, start, rent, akonto, deposit] of tenancyDefs) {
      const {
        rows: [t],
      } = await client.query(
        `INSERT INTO tenancies (unit_id, tenant_name, tenant_email, tenant_phone, start_date, net_rent, bk_akonto, deposit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, start_date, net_rent, bk_akonto`,
        [unitIds[top], name, email, phone, start, rent, akonto, deposit]
      );
      tenancies.push(t);
    }

    // --- 6 Monate Vorschreibungshistorie (inkl. aktueller Monat), gemischter Status ---
    for (let back = 5; back >= 0; back--) {
      const d = new Date(thisYear, thisMonth - 1 - back, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const dueDate = `${y}-${String(m).padStart(2, '0')}-05`;
      for (let i = 0; i < tenancies.length; i++) {
        const t = tenancies[i];
        if (t.start_date > `${y}-${String(m).padStart(2, '0')}-01`) continue;
        // Ältere Monate großteils bezahlt, jüngere gemischt:
        let paid;
        if (back >= 2) paid = !(back === 2 && i % 4 === 3); // vereinzelt offen (überfällig)
        else if (back === 1) paid = i % 3 !== 1;
        else paid = i % 2 === 0; // aktueller Monat: etwa die Hälfte offen
        await client.query(
          `INSERT INTO invoices (tenancy_id, year, month, net_rent, bk_akonto, due_date, status, paid_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            t.id,
            y,
            m,
            t.net_rent,
            t.bk_akonto,
            dueDate,
            paid ? 'bezahlt' : 'offen',
            paid ? `${y}-${String(m).padStart(2, '0')}-0${(i % 5) + 3}` : null,
          ]
        );
      }
    }

    // --- Betriebskosten für das abgeschlossene Vorjahr ---
    const costDefs = [
      ['Versicherung', 'Gebäudeversicherung (Feuer, Leitungswasser, Haftpflicht)', 3200],
      ['Wasser/Abwasser', 'Wiener Wasser, Jahresabrechnung', 2450],
      ['Müllabfuhr', 'MA 48, 4 Restmülltonnen wöchentlich', 1680],
      ['Reinigung', 'Stiegenhausreinigung 14-tägig', 2160],
      ['Aufzug', 'Wartungsvertrag Lift, TÜV-Prüfung', 1890],
      ['Grundsteuer', 'Grundsteuer B, Stadt Wien', 1150],
      ['Allgemeinstrom', 'Stiegenhaus- und Kellerbeleuchtung', 940],
    ];
    for (const [cat, desc, amount] of costDefs) {
      await client.query(
        `INSERT INTO operating_costs (property_id, year, category, description, amount)
         VALUES ($1,$2,$3,$4,$5)`,
        [pid, bkYear, cat, desc, amount]
      );
    }

    // --- Dienstleister ---
    const providerDefs = [
      ['Blitzblank Gebäudereinigung GmbH', 'office@blitzblank.at', '+43 1 234 56 78', 'reinigung, winterdienst'],
      ['Installateur Huber & Söhne OG', 'dispo@huber-soehne.at', '+43 1 876 54 32', 'reparatur, wartung'],
      ['Facility Partner Wien GmbH', 'service@facilitypartner.at', '+43 1 990 11 22', 'wartung, reparatur, reinigung, winterdienst'],
    ];
    const providerIds = [];
    for (const [name, email, phone, cats] of providerDefs) {
      const {
        rows: [p],
      } = await client.query(
        `INSERT INTO providers (name, contact_email, phone, categories) VALUES ($1,$2,$3,$4) RETURNING id`,
        [name, email, phone, cats]
      );
      providerIds.push(p.id);
    }

    // --- 2 offene Schadenstickets ---
    await client.query(
      `INSERT INTO tickets (property_id, unit_id, category, title, description, priority, status)
       VALUES ($1,$2,'reparatur','Wasserschaden im Bad',
               'Mieterin meldet Feuchtigkeitsfleck an der Badezimmerdecke, vermutlich Leitung der darüberliegenden Wohnung undicht.',
               'hoch','offen')`,
      [pid, unitIds['Top 3']]
    );
    await client.query(
      `INSERT INTO tickets (property_id, unit_id, category, title, description, priority, status)
       VALUES ($1,NULL,'wartung','Stiegenhausbeleuchtung 2. OG defekt',
               'Bewegungsmelder im 2. OG löst nicht mehr aus, Leuchtmittel vermutlich defekt.',
               'mittel','offen')`,
      [pid]
    );

    // --- 1 abgeschlossener Auftrag im Vorjahr (für Steuerberater-Export) ---
    const {
      rows: [winterTicket],
    } = await client.query(
      `INSERT INTO tickets (property_id, unit_id, category, title, description, priority, status, created_at)
       VALUES ($1,NULL,'winterdienst','Winterdienst Jänner ${bkYear}',
               'Schneeräumung und Streuung Gehsteig laut Räumpflicht.',
               'mittel','abgeschlossen', '${bkYear}-01-05T08:00:00Z')
       RETURNING id`,
      [pid]
    );
    const {
      rows: [order],
    } = await client.query(
      `INSERT INTO orders (ticket_id, provider_id, status, amount, created_at, completed_at)
       VALUES ($1,$2,'abgeschlossen',480,'${bkYear}-01-05T09:00:00Z','${bkYear}-01-31T16:00:00Z')
       RETURNING id`,
      [winterTicket.id, providerIds[0]]
    );
    for (const [st, ts] of [
      ['angefragt', `${bkYear}-01-05T09:00:00Z`],
      ['beauftragt', `${bkYear}-01-06T10:00:00Z`],
      ['in_arbeit', `${bkYear}-01-07T07:00:00Z`],
      ['abgeschlossen', `${bkYear}-01-31T16:00:00Z`],
    ]) {
      await client.query(`INSERT INTO order_events (order_id, status, created_at) VALUES ($1,$2,$3)`, [
        order.id,
        st,
        ts,
      ]);
    }

    await client.query('COMMIT');
    console.log('Beispieldaten angelegt.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
