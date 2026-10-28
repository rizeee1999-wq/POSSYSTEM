import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import categoriesRouter from './routes/categories.js';
import productsRouter from './routes/products.js';
import barbersRouter from './routes/barbers.js';
import queueRouter from './routes/queue.js';
import salesRouter from './routes/sales.js';
import dashboardRouter from './routes/dashboard.js';
import uploadsRouter from './routes/uploads.js';

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'Salon & Barbershop POS' }));

app.use('/api', categoriesRouter);
app.use('/api', productsRouter);
app.use('/api', barbersRouter);
app.use('/api', queueRouter);
app.use('/api', salesRouter);
app.use('/api', dashboardRouter);
app.use('/api', uploadsRouter);

// Fallback error handler so a thrown error returns JSON instead of hanging.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`POS API listening on http://localhost:${PORT}`);
});
