import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForDb } from './db.js';
import { ensureSchema } from './schema.js';
import { seedIfEmpty } from './seed.js';
import { authMiddleware, authRouter } from './auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { propertiesRouter } from './routes/properties.js';
import { tenanciesRouter } from './routes/tenancies.js';
import { invoicesRouter } from './routes/invoices.js';
import { operatingCostsRouter } from './routes/operating-costs.js';
import { ticketsRouter } from './routes/tickets.js';
import { providersRouter } from './routes/providers.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', authMiddleware());
app.use('/api', authRouter);
app.use('/api', dashboardRouter);
app.use('/api', propertiesRouter);
app.use('/api', tenanciesRouter);
app.use('/api', invoicesRouter);
app.use('/api', operatingCostsRouter);
app.use('/api', ticketsRouter);
app.use('/api', providersRouter);
app.use('/api', adminRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpunkt nicht gefunden' }));

// Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interner Serverfehler', detail: err.message });
});

// Statisches Frontend (Vite-Build) mit SPA-Fallback
const dist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

async function start() {
  await waitForDb();
  await ensureSchema();
  await seedIfEmpty();
  app.listen(PORT, () => console.log(`Tech2Be Immo Manager läuft auf Port ${PORT}`));
}

start().catch((err) => {
  console.error('Start fehlgeschlagen:', err);
  process.exit(1);
});
