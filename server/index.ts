import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

import tasksRouter from './routes/tasks';
import usersRouter from './routes/users';
import projectsRouter from './routes/projects';
import auditRouter from './routes/audit';
import ansRouter from './routes/ans';

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

// CORS: en prod el frontend lo sirve el mismo servidor
app.use(cors({
  origin: isProd ? false : (process.env.FRONTEND_URL || 'http://localhost:3000'),
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ans', ansRouter);

// Sirve el frontend compilado en producción
if (isProd) {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Timia Hub ${isProd ? 'PROD' : 'DEV'} → http://localhost:${PORT}`);
});
