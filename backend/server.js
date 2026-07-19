// Local dev server: serves the frontend + /api/* on one origin.
// Production on Netlify uses the functions in netlify/functions/ instead;
// both share the same logic in core.js.

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { categorize, collide, ideas, feedback, stats, MODEL } from './core.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // repo root holds index.html + assets

// Load .env from the repo root, independent of the working directory.
dotenv.config({ path: join(ROOT, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS allowlist only if explicitly set (the frontend is same-origin by default).
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (ALLOWED.length) app.use(cors({ origin: ALLOWED }));

app.use(express.json({ limit: '64kb' }));

// Cheap abuse/cost protection (local server only; serverless has no shared state).
app.use('/api', rateLimit({
  windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
}));

// Wrap a core function as an Express handler; map thrown .status to the response.
const route = fn => async (req, res) => {
  try {
    res.json(await fn(req.body || {}));
  } catch (e) {
    console.error(`${req.path} error:`, e);
    res.status(e.status || 500).json({ error: e.message });
  }
};

app.get('/health', (req, res) => res.json({ status: 'ok', model: MODEL, timestamp: new Date().toISOString() }));
app.post('/api/categorize', route(body => categorize(body.items)));
app.post('/api/collide', route(body => collide(body)));
app.post('/api/ideas', route(body => ideas(body)));
app.post('/api/feedback', route(body => feedback(body)));
app.get('/api/stats', route(() => stats()));

app.use(express.static(ROOT));

app.listen(PORT, () => console.log(`COLLIDER running on http://localhost:${PORT}  (model: ${MODEL})`));
