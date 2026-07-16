import { Router } from 'express';
import { q } from './db.js';

// Gekapselte Auth-Schicht.
// Aktuell: Auto-Login über die Umgebungsvariable AUTO_LOGIN_USER.
// Die Schnittstelle (req.user + resolveUser) ist so gehalten, dass später
// ein Entra-ID-/OIDC-Provider ergänzt werden kann, ohne die Routen zu ändern.

const AUTO_LOGIN_USER = process.env.AUTO_LOGIN_USER || 'florian@bingro.com';

let cachedUser = null;

async function resolveUser() {
  if (cachedUser) return cachedUser;
  const email = AUTO_LOGIN_USER;
  const name = email
    .split('@')[0]
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  const { rows } = await q(
    `INSERT INTO users (email, name, role) VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [email, name]
  );
  cachedUser = rows[0];
  return cachedUser;
}

export function authMiddleware() {
  return async (req, res, next) => {
    try {
      req.user = await resolveUser();
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const authRouter = Router();

authRouter.get('/me', (req, res) => {
  res.json(req.user);
});
