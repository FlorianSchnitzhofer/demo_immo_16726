import pg from 'pg';

const { Pool, types } = pg;

// numeric (OID 1700) als Zahl statt String liefern
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// date (OID 1082) als ISO-String 'YYYY-MM-DD' belassen (keine Zeitzonen-Verschiebung)
types.setTypeParser(1082, (v) => v);

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/immo',
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
});

export const q = (text, params) => pool.query(text, params);

export async function waitForDb(retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === retries) throw err;
      console.log(`Datenbank noch nicht erreichbar (Versuch ${i}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
