import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

import tasksRouter from './routes/tasks';
import usersRouter from './routes/users';
import projectsRouter from './routes/projects';
import auditRouter from './routes/audit';
import ansRouter from './routes/ans';

config(); // load .env

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ans', ansRouter);

app.listen(PORT, () => {
  console.log(`🚀 Timia Hub API running on http://localhost:${PORT}`);
});
