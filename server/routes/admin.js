import { Router } from 'express';
import { resetSampleData } from '../seed.js';

export const adminRouter = Router();

// Beispieldaten zurücksetzen (Admin-Funktion)
adminRouter.post('/admin/reset-sample-data', async (req, res, next) => {
  try {
    await resetSampleData();
    res.json({ ok: true, message: 'Beispieldaten wurden zurückgesetzt.' });
  } catch (e) {
    next(e);
  }
});
