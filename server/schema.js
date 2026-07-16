import { q } from './db.js';

export async function ensureSchema() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'verwalter'
    );

    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      postal_code TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      year_built INT,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS units (
      id SERIAL PRIMARY KEY,
      property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      top_number TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('wohnung','geschaeft','stellplatz')),
      area_m2 NUMERIC(8,2) NOT NULL,
      floor TEXT NOT NULL DEFAULT '',
      rooms INT
    );

    CREATE TABLE IF NOT EXISTS tenancies (
      id SERIAL PRIMARY KEY,
      unit_id INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      tenant_name TEXT NOT NULL,
      tenant_email TEXT NOT NULL DEFAULT '',
      tenant_phone TEXT NOT NULL DEFAULT '',
      start_date DATE NOT NULL,
      end_date DATE,
      net_rent NUMERIC(10,2) NOT NULL,
      bk_akonto NUMERIC(10,2) NOT NULL,
      deposit NUMERIC(10,2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      tenancy_id INT NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
      year INT NOT NULL,
      month INT NOT NULL,
      net_rent NUMERIC(10,2) NOT NULL,
      bk_akonto NUMERIC(10,2) NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','bezahlt')),
      paid_at DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (tenancy_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS operating_costs (
      id SERIAL PRIMARY KEY,
      property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      year INT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      categories TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      unit_id INT REFERENCES units(id) ON DELETE SET NULL,
      category TEXT NOT NULL CHECK (category IN ('reinigung','wartung','reparatur','winterdienst')),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'mittel' CHECK (priority IN ('niedrig','mittel','hoch')),
      status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','beauftragt','abgeschlossen')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      provider_id INT NOT NULL REFERENCES providers(id),
      status TEXT NOT NULL DEFAULT 'angefragt' CHECK (status IN ('angefragt','beauftragt','in_arbeit','abgeschlossen')),
      amount NUMERIC(10,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
