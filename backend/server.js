import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { rankIntersections } from './grader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // repo root holds index.html + assets

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';

// --- Security (P0) ---
// CORS: only apply an allowlist in production. Locally the frontend is served
// same-origin by this server, so no cross-origin grant is needed.
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (ALLOWED.length) {
  app.use(cors({ origin: ALLOWED }));
}

app.use(express.json({ limit: '64kb' }));

// Rate limit every API route: cheap abuse/cost protection. Not wallet-gated,
// so web2/anonymous users still pass.
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
}));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// --- helpers ---
function textFrom(message) {
  const block = (message.content || []).find(b => b.type === 'text');
  if (!block) throw new Error('No text in model response');
  return block.text;
}

function parseJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Failed to extract JSON from response');
  return JSON.parse(m[0]);
}

function cleanItems(items) {
  if (!Array.isArray(items)) return null;
  return items
    .filter(i => typeof i === 'string')
    .map(i => i.trim())
    .filter(i => i.length > 0 && i.length <= 200);
}

// --- Health ---
app.get('/health', (req, res) => res.json({ status: 'ok', model: MODEL, timestamp: new Date().toISOString() }));

// --- Categorize (existing, hardened) ---
app.post('/api/categorize', async (req, res) => {
  try {
    const items = cleanItems(req.body.items);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Invalid input. Expected a non-empty array of strings.' });
    }
    if (items.length > 50) {
      return res.status(400).json({ error: 'Too many items. Maximum 50 items allowed.' });
    }

    const prompt = `You are a niche categorization expert. Analyze these items and categorize each into one of three categories:

**SKILLS** - Things the person can do, has been paid for, or could monetize.
**INTERESTS** - Topics they're passionate about, hobbies, things they'd read about for fun.
**OPPORTUNITIES** - Market trends, growing industries, unsolved problems, emerging technologies, underserved needs.

Items to categorize:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Return ONLY a JSON object (no markdown, no explanation):
{ "skills": [], "interests": [], "opportunities": [] }

Rules:
- Every item MUST be categorized into exactly one category.
- Use the EXACT text from the original items.
- If unsure, default to "interests".`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const categorized = parseJson(textFrom(message));
    if (!categorized.skills || !categorized.interests || !categorized.opportunities) {
      throw new Error('Invalid response structure from AI');
    }

    // Reconcile: make sure no item was silently dropped. Any missing item
    // falls back to "interests" so the user never loses input.
    const seen = new Set([...categorized.skills, ...categorized.interests, ...categorized.opportunities]);
    for (const item of items) {
      if (!seen.has(item)) categorized.interests.push(item);
    }

    res.json({ success: true, data: categorized, metadata: { totalItems: items.length } });
  } catch (error) {
    console.error('Categorization error:', error);
    res.status(500).json({ error: 'Failed to categorize items', message: error.message });
  }
});

// --- Collide (new): deterministic grade + rationale + 3 ideas ---
app.post('/api/collide', async (req, res) => {
  try {
    const skills = cleanItems(req.body.skills);
    const interests = cleanItems(req.body.interests);
    const opportunities = cleanItems(req.body.opportunities);

    if (!skills?.length || !interests?.length || !opportunities?.length) {
      return res.status(400).json({ error: 'Need at least one skill, one interest, and one opportunity.' });
    }

    // The number is code, not the model.
    const ranking = rankIntersections({ skills, interests, opportunities }, 3);
    const top = ranking[0];

    // The words are the model.
    const parsed = await ideasFor(top);

    res.json({
      success: true,
      data: {
        ranking, // top 3, each with grade/band/breakdown
        top: { ...top, rationale: parsed.rationale, ideas: parsed.ideas },
      },
    });
  } catch (error) {
    console.error('Collide error:', error);
    res.status(500).json({ error: 'Failed to collide', message: error.message });
  }
});

// Generate the rationale + 3 ideas for a single crossing. Used for the top
// niche and, on demand, for a runner-up the user clicks into.
async function ideasFor({ skill, interest, opportunity }) {
  const prompt = `A person's personal niche is the intersection of:
Skill: ${skill}
Interest: ${interest}
Opportunity: ${opportunity}

Do two things.

1) RATIONALE: one sharp sentence on why THIS specific crossing gives them an edge. Punchy, concrete, no hedging.

2) THREE business ideas they could pitch to people this week. Exactly one of each type:
- service: a consulting/coaching/done-for-you offering
- physical: a tangible product they could make/sell
- digital: an app, course, content, or software

For EACH idea write these fields in plain, simple language anyone can understand (no jargon):
- name: short punchy name
- target: who exactly it's for
- what: 1-2 sentences, what the thing actually is
- why: 1-2 sentences, why it matters / the real problem it solves
- how: 2-3 short imperative steps for how to pitch this idea to real people and collect honest feedback
- pitch: one spoken line they can say out loud to a friend
- money: integer 1-5 for realistic dollar potential if executed well. 1 = pocket money, 2 = side income, 3 = solid living, 4 = real business, 5 = scalable venture. Be honest, not hype.

Return ONLY this JSON (no markdown):
{
  "rationale": "one sentence",
  "ideas": {
    "service":  { "name": "", "target": "", "what": "", "why": "", "how": "", "pitch": "", "money": 3 },
    "physical": { "name": "", "target": "", "what": "", "why": "", "how": "", "pitch": "", "money": 3 },
    "digital":  { "name": "", "target": "", "what": "", "why": "", "how": "", "pitch": "", "money": 3 }
  }
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1600,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  return parseJson(textFrom(message));
}

// --- Ideas for a chosen crossing (runner-up click) ---
app.post('/api/ideas', async (req, res) => {
  try {
    const { skill, interest, opportunity } = req.body;
    if (!skill || !interest || !opportunity) {
      return res.status(400).json({ error: 'Need skill, interest, and opportunity.' });
    }
    const parsed = await ideasFor({ skill, interest, opportunity });
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Ideas error:', error);
    res.status(500).json({ error: 'Failed to generate ideas', message: error.message });
  }
});


// --- Static frontend (serve same-origin so no CORS needed locally) ---
app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`COLLIDER running on http://localhost:${PORT}  (model: ${MODEL})`);
});
