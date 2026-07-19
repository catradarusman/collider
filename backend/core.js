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

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 1600,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });
  return parseJson(textFrom(message));
}

// Deterministic grade of the strongest crossing + its 3 ideas.
export async function collide({ skills, interests, opportunities }) {
  const s = cleanItems(skills), i = cleanItems(interests), o = cleanItems(opportunities);
  if (!s?.length || !i?.length || !o?.length) {
    throw badRequest('Need at least one skill, one interest, and one opportunity.');
  }
  const ranking = rankIntersections({ skills: s, interests: i, opportunities: o }, 3);
  const top = ranking[0];
  const parsed = await ideasFor(top);
  return { success: true, data: { ranking, top: { ...top, rationale: parsed.rationale, ideas: parsed.ideas } } };
}

// Ideas for a chosen crossing (runner-up click).
export async function ideas({ skill, interest, opportunity }) {
  if (!skill || !interest || !opportunity) throw badRequest('Need skill, interest, and opportunity.');
  const parsed = await ideasFor({ skill, interest, opportunity });
  return { success: true, data: parsed };
}
