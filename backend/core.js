// core.js — host-agnostic AI logic shared by the local Express server and the
// Netlify Functions. No web framework here: each function validates its input,
// calls Claude, and returns a plain result object (or throws an Error whose
// `.status` is the HTTP code to send).

import Anthropic from '@anthropic-ai/sdk';
import { rankIntersections } from './grader.js';

export const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';

let _client;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }

// Analytics log to Supabase REST. No-op when env is unset so local dev and prod
// both run without it. Never throws into the request path.
//
// MUST be awaited by callers: serverless runtimes (Netlify/Lambda) freeze the
// execution environment as soon as the handler returns, which suspends any
// un-awaited promise. Fire-and-forget writes are silently lost or land minutes
// later on a warm invocation.
function logEvent(type, payload) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return Promise.resolve();
  return fetch(`${url}/rest/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ type, payload }),
  }).then(() => {}, () => {});
}

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

export function cleanItems(items) {
  if (!Array.isArray(items)) return null;
  return items
    .filter(i => typeof i === 'string')
    .map(i => i.trim())
    .filter(i => i.length > 0 && i.length <= 200);
}

// Sort raw items into skills / interests / opportunities.
export async function categorize(rawItems) {
  const items = cleanItems(rawItems);
  if (!items || items.length === 0) throw badRequest('Invalid input. Expected a non-empty array of strings.');
  if (items.length > 50) throw badRequest('Too many items. Maximum 50 items allowed.');

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

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const categorized = parseJson(textFrom(message));
  if (!categorized.skills || !categorized.interests || !categorized.opportunities) {
    throw new Error('Invalid response structure from AI');
  }

  // Reconcile: no item silently dropped; anything missing falls back to interests.
  const seen = new Set([...categorized.skills, ...categorized.interests, ...categorized.opportunities]);
  for (const item of items) {
    if (!seen.has(item)) categorized.interests.push(item);
  }

  // Nothing the user typed is stored here — the sort happens before they have
  // been asked. Content is only ever logged at /collide, and only with consent.
  await logEvent('categorize', { count: items.length });
  return { success: true, data: categorized, metadata: { totalItems: items.length } };
}

// Rationale + 3 ideas for a single crossing.
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
- what: 2-3 sentences. First, plainly what the thing actually is. Then name the specific problem inside this niche that it tackles, and who is stuck with that problem today.
- why: 1-2 sentences, why it matters / the real problem it solves
- how: 2-3 short imperative steps for how to pitch this idea to real people and collect honest feedback
- pitch: one spoken line they can say out loud to a friend
- money: integer 1-5 for realistic dollar potential if executed well. 1 = pocket money, 2 = side income, 3 = solid living, 4 = real business, 5 = scalable venture. Be honest, not hype.

Never use em dashes (—) anywhere in your writing. Use a period, comma, or colon instead. Write the way a person talks.

Return ONLY this JSON (no markdown):
{
  "rationale": "one sentence",
  "ideas": {
    "service":  { "name": "", "target": "", "what": "", "why": "", "how": "", "pitch": "", "money": 3 },
    "physical": { "name": "", "target": "", "what": "", "why": "", "how": "", "pitch": "", "money": 3 },
    "digital":  { "name": "", "target": "", "what": "", "why": "", "how": "", "pitch": "", "money": 3 }
  }
}`;

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 1600,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  return parseJson(textFrom(message));
}

// `share` is the user's explicit consent, sent from the Collide step. When it is
// false we still record that a collision happened (an anonymous +1 for the public
// counter) but never the words they typed, so nothing of theirs reaches the
// Chamber or the ticker.
const shared = v => v === true;

// Deterministic grade of the strongest crossing + its 3 ideas.
export async function collide({ skills, interests, opportunities, share }) {
  const s = cleanItems(skills), i = cleanItems(interests), o = cleanItems(opportunities);
  if (!s?.length || !i?.length || !o?.length) {
    throw badRequest('Need at least one skill, one interest, and one opportunity.');
  }
  const ranking = rankIntersections({ skills: s, interests: i, opportunities: o }, 3);
  const top = ranking[0];
  const parsed = await ideasFor(top);
  const result = { ranking, top: { ...top, rationale: parsed.rationale, ideas: parsed.ideas } };
  await logEvent('collide', shared(share)
    ? { shared: true, input: { skills: s, interests: i, opportunities: o }, result }
    : { shared: false });
  return { success: true, data: result };
}

// Ideas for a chosen crossing (runner-up click).
export async function ideas({ skill, interest, opportunity, share }) {
  if (!skill || !interest || !opportunity) throw badRequest('Need skill, interest, and opportunity.');
  const parsed = await ideasFor({ skill, interest, opportunity });
  await logEvent('ideas', shared(share)
    ? { shared: true, crossing: { skill, interest, opportunity }, result: parsed }
    : { shared: false });
  return { success: true, data: parsed };
}

// Fit rating on a generated idea (thumbs from the frontend). Logged only.
export async function feedback({ niche, ideaType, ideaName, rating, share }) {
  if (!rating) throw badRequest('Need a rating.');
  await logEvent('feedback', shared(share)
    ? { shared: true, niche, ideaType, ideaName, rating }
    : { shared: false, rating });
  return { success: true };
}

// Aggregate public stats from the logged events (read side of the analytics).
// Powers the home counters and the Collective page. Gracefully empty when
// Supabase is unconfigured or unreachable — never throws into the request path.
const EMPTY_STATS = { totals: { skills: 0, interests: 0, opportunities: 0, collisions: 0 }, categories: { skills: [], interests: [], opportunities: [] }, recent: [] };
const CAT_SINGULAR = { skills: 'skill', interests: 'interest', opportunities: 'opportunity' };

export async function stats() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { success: true, data: EMPTY_STATS };

  let rows;
  try {
    const res = await fetch(`${url}/rest/v1/events?select=type,payload&order=ts.desc&limit=2000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { success: true, data: EMPTY_STATS };
    rows = await res.json();
  } catch { return { success: true, data: EMPTY_STATS }; }

  const cat = { skills: new Map(), interests: new Map(), opportunities: new Map() };
  const bump = (m, v) => { if (typeof v === 'string') { const t = v.trim(); if (t) m.set(t, (m.get(t) || 0) + 1); } };
  const n = { skills: 0, interests: 0, opportunities: 0 };
  let collisions = 0;

  // Recent stream for the live ticker: newest distinct items first (rows are ts desc).
  const recent = [], seen = new Set();

  // Only consented lists carry content: `collide` events with shared:true, plus
  // legacy `categorize` events from before consent existed. Everything else
  // contributes nothing but the anonymous collision count.
  const absorb = lists => {
    for (const c of ['skills', 'interests', 'opportunities']) {
      for (const item of lists[c] || []) {
        bump(cat[c], item); n[c]++;
        const t = typeof item === 'string' ? item.trim() : '';
        const key = c + '|' + t.toLowerCase();
        if (t && recent.length < 50 && !seen.has(key)) { seen.add(key); recent.push({ label: t, cat: CAT_SINGULAR[c] }); }
      }
    }
  };

  for (const r of rows) {
    if (r.type === 'categorize') {
      absorb(r.payload?.result || {});
    } else if (r.type === 'collide') {
      collisions++;
      if (r.payload?.shared) absorb(r.payload.input || {});
    }
  }

  const top = m => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([label, count]) => ({ label, count }));
  return {
    success: true,
    data: {
      totals: { skills: n.skills, interests: n.interests, opportunities: n.opportunities, collisions },
      categories: { skills: top(cat.skills), interests: top(cat.interests), opportunities: top(cat.opportunities) },
      recent,
    },
  };
}
