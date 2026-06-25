import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Always load env from backend/.env (independent from process.cwd()).
dotenv.config({ path: new URL('../.env', import.meta.url) });

import { createPool, pingDb } from './db.js';
import { errorMiddleware, httpError } from './errors.js';

import { authRouter } from './routes/auth.js';
import { projectsRouter } from './routes/projects.js';
import { analysisRouter } from './routes/analysis.js';
import { premixesRouter } from './routes/premixes.js';
import { recipesRouter } from './routes/recipes.js';
import { packagingRouter } from './routes/packaging.js';
import { presentationsRouter } from './routes/presentations.js';
import { commentsRouter } from './routes/comments.js';
import { notificationsRouter } from './routes/notifications.js';
import { adminRouter } from './routes/admin.js';
import { presentationGenerateRouter } from './routes/presentation_generate.js';
import { usersRouter } from './routes/users.js';
import { workflowRouter } from './routes/workflow.js';

const app = express();

const API_PREFIX = process.env.API_PREFIX || '/api';
const PORT = Number(process.env.PORT || 8000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const ALLOWED_ORIGINS = FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);

const pool = createPool();
app.locals.db = pool;

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (curl/postman)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

app.get(`${API_PREFIX}/health`, async (req, res, next) => {
  try {
    await pingDb(pool);
    res.json({ ok: true });
  } catch (e) {
    next(httpError(500, 'DB not reachable', { code: e?.code, message: e?.message }));
  }
});

app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/projects`, projectsRouter);
app.use(`${API_PREFIX}`, workflowRouter);
app.use(`${API_PREFIX}/analysis`, analysisRouter);
app.use(`${API_PREFIX}`, premixesRouter);
app.use(`${API_PREFIX}`, recipesRouter);
app.use(`${API_PREFIX}`, packagingRouter);
app.use(`${API_PREFIX}`, presentationsRouter);
app.use(`${API_PREFIX}`, commentsRouter);
app.use(`${API_PREFIX}`, notificationsRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}`, presentationGenerateRouter);

app.use((req, res, next) => next(httpError(404, 'Not found')));
app.use(errorMiddleware);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}${API_PREFIX}`);
});

