// grader.js — deterministic niche scorer.
// Rules over taste: the number is computed by fixed code + fixed weights,
// never by the model and never by random. Same input list -> same output, always.
//
// A triple = (skill, interest, opportunity). We score every possible triple
// across the user's three lists, then rank them. Three transparent components,
// each normalized 0..1, combined with fixed weights.
//
// v1 note: "coherence/surprise" uses character-trigram similarity (zero deps,
// deterministic). Swapping in real sentence embeddings later improves the
// semantic signal without changing this interface.

const WEIGHTS = {
  surprise: 0.4, // unexpected cross-domain collisions score higher
  pull: 0.3, // market/momentum weight of the opportunity
  rarity: 0.3, // how uncommon this triple's words are across the user's own dots
};

// Opportunity "momentum" signal. Deterministic keyword list. Presence of these
// stems in the opportunity text raises its pull. Intentionally simple + legible.
const MOMENTUM = [
  'ai', 'agent', 'llm', 'automation', 'remote', 'creator', 'sustainab',
  'climate', 'health', 'wellness', 'longevity', 'crypto', 'web3', 'onchain',
  'privacy', 'security', 'no-code', 'nocode', 'saas', 'community', 'local',
  'aging', 'senior', 'gen z', 'genz', 'solo', 'micro', 'niche', 'data',
  'energy', 'ev', 'biotech', 'space', 'defi', 'fintech', 'edtech', 'mental',
];

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(s) {
  return normalize(s).split(' ').filter(Boolean);
}

function trigrams(s) {
  const n = normalize(s).replace(/\s/g, '');
  const set = new Set();
  if (n.length < 3) {
    if (n) set.add(n);
    return set;
  }
  for (let i = 0; i <= n.length - 3; i++) set.add(n.slice(i, i + 3));
  return set;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Build inverse-frequency map of every token across all three lists.
// Rare personal dots -> higher rarity contribution.
function buildFreq(lists) {
  const freq = new Map();
  let total = 0;
  for (const list of lists) {
    for (const item of list) {
      for (const t of tokens(item)) {
        freq.set(t, (freq.get(t) || 0) + 1);
        total++;
      }
    }
  }
  return { freq, total: total || 1 };
}

function rarityOf(text, freq, total) {
  const ts = tokens(text);
  if (ts.length === 0) return 0;
  let sum = 0;
  for (const t of ts) {
    const f = freq.get(t) || 1;
    sum += Math.log(total / f); // higher for rarer tokens
  }
  const mean = sum / ts.length;
  // squash to 0..1; log(total) is the max possible, use it as a soft ceiling
  const ceil = Math.log(total) || 1;
  return Math.min(1, mean / ceil);
}

function pullOf(opportunity) {
  const norm = normalize(opportunity);
  let hits = 0;
  for (const kw of MOMENTUM) if (norm.includes(kw)) hits++;
  // diminishing returns; 3+ momentum signals ~= max
  return Math.min(1, hits / 3);
}

function surpriseOf(skill, interest, opportunity) {
  const s = trigrams(skill), i = trigrams(interest), o = trigrams(opportunity);
  const avgSim = (jaccard(s, i) + jaccard(s, o) + jaccard(i, o)) / 3;
  // unexpected trios (low overlap) are more interesting collisions
  return 1 - avgSim;
}

function bandOf(grade) {
  // bands halve toward the top (scarcity curve)
  if (grade >= 90) return 'S';
  if (grade >= 78) return 'A';
  if (grade >= 62) return 'B';
  if (grade >= 45) return 'C';
  return 'D';
}

// Raw component values collapse to their ceiling when a user's items are all
// lexically distinct (the common case). So we min-max normalize each component
// across the user's own set of triples: the grade ranks YOUR crossings against
// each other and always spreads. A component with no variance contributes a
// neutral 0.5. (Grade is therefore relative to your own dots in v1; real
// embeddings give an absolute cross-user coherence signal later.)
function normalizer(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return () => 0.5;
  return (v) => (v - min) / (max - min);
}

// Public: score + rank all triples. Deterministic ordering.
function rankIntersections({ skills, interests, opportunities }, limit = 3) {
  const { freq, total } = buildFreq([skills, interests, opportunities]);

  const raw = [];
  for (const skill of skills) {
    for (const interest of interests) {
      for (const opportunity of opportunities) {
        raw.push({
          skill, interest, opportunity,
          surprise: surpriseOf(skill, interest, opportunity),
          pull: pullOf(opportunity),
          rarity: (rarityOf(skill, freq, total) + rarityOf(interest, freq, total) + rarityOf(opportunity, freq, total)) / 3,
        });
      }
    }
  }

  const nS = normalizer(raw.map(r => r.surprise));
  const nP = normalizer(raw.map(r => r.pull));
  const nR = normalizer(raw.map(r => r.rarity));

  const rows = raw.map(r => {
    const surprise = nS(r.surprise), pull = nP(r.pull), rarity = nR(r.rarity);
    const score = WEIGHTS.surprise * surprise + WEIGHTS.pull * pull + WEIGHTS.rarity * rarity;
    const grade = Math.round(score * 100);
    return {
      skill: r.skill, interest: r.interest, opportunity: r.opportunity,
      grade, band: bandOf(grade),
      breakdown: { surprise: +surprise.toFixed(3), pull: +pull.toFixed(3), rarity: +rarity.toFixed(3) },
    };
  });

  // deterministic: grade desc, then stable lexical tie-break
  rows.sort((a, b) => {
    if (b.grade !== a.grade) return b.grade - a.grade;
    const ka = `${a.skill}|${a.interest}|${a.opportunity}`;
    const kb = `${b.skill}|${b.interest}|${b.opportunity}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return rows.slice(0, limit);
}

export { rankIntersections, WEIGHTS };
