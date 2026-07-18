# COLLIDER v2 — PRD

**Find where your dots intersect. Get ideas worth pitching. Find your light.**

---

## 1. Objective (canonical — everything serves this)

Help people who are **stuck for ideas** find and build their **personal niche** from three inputs — Skills, Interests, Opportunities. Their unique intersection generates **3 concrete business ideas** (a **service**, a **physical** product, a **digital** product) that they can **pitch to people around them for feedback** — so they start finding lights for a new direction.

Everything below serves that sentence. The grader, the fun, the Butcher framing, and the optional web3 layer are all in service of: *stuck person → personal niche → 3 pitchable ideas → real-world feedback → a lit path forward.*

## 2. Who it's for (access is universal)

Collider is **not** a Farcaster-exclusive miniapp. It runs as a normal web app anyone can open.

| Tier | Who | Gets |
|---|---|---|
| **Web2 (default, no login)** | anyone with a link | Full flow: collect → grade → 3 ideas → pitch → feedback. Save locally, share via image/link. |
| **Web3 (optional, Farcaster/wallet)** | crypto-native users | Everything above **plus** optional mint/cast: onchain first-finder receipt, public board, grade decay. |

**Rule: no web3 feature may gate a core objective.** A web2 user with no wallet completes the entire journey and gets full value. Minting is a bonus lane, never a toll booth.

## 3. The problem with v1

The user does real work (list dots, sort them) and gets a **coin flip**: `Math.random()` picks one skill + one interest + one opportunity ([index.html:184-188](index.html)), then Claude writes ideas for whatever fell out.

- **No trust** — same list, different answer each pull. Reads as a toy.
- **No pitch loop** — you get ideas, then... nothing. No way to test them against real people, which is the whole point ("find lights").
- **No memory** — close tab, gone.
- **Open wallet** — backend has open CORS, no auth, no rate limit ([backend/server.js:10](backend/server.js)); anyone can drain the API budget.

## 4. The 10x — three pillars

### Pillar A — The Grader (trust: rules over taste)
Kill the random. Score every Skill×Interest×Opportunity triple with a deterministic code scorer, rank them, surface the **strongest intersection** as the hero (with #2/#3 available). Same dots always render the same #1 — the seed contains the work. This is what turns "a random idea" into "*your* niche, and here's why it scores."

### Pillar B — The 3 Ideas (the deliverable — stays core)
For the top intersection, generate the **3 business ideas** — service, physical, digital — exactly as the objective demands. These are the payload. Each idea is specific, actionable, has a clear target customer, and now carries a **one-line pitch** the user can say out loud. The grader chooses the *what*; Claude writes the *ideas*.

### Pillar C — The Pitch Loop (the fun + the "find lights" mechanic)
The new heart. After the 3 ideas land, the user **pitches** them to people around them and captures which one lights up.
- **One-tap shareable pitch card** per idea (image + one-liner + a feedback link).
- **Feedback capture** — the people they pitch to react ("would use / would pay / meh") and can leave a line. No account needed to give feedback.
- **The Spark board** — the user watches reactions land in real time and sees **which of their 3 ideas is catching light**. The crowd's behavior becomes the meaning (Butcher: format is the message).
- This is the fun: not "here are ideas," but "go find out which one people actually want — watch it light up."

## 5. Butcher alignment (kept at the core, mapped to the objective)

| Butcher instinct | In Collider v2 | Serves objective by |
|---|---|---|
| Rules over taste | deterministic grader, not `Math.random()` | making the niche feel *earned and true*, not arbitrary |
| The seed contains the work | same dots → same #1 collision | user trusts the result enough to act on it |
| Cheapest material, highest meaning | the user's own ambient dots | zero-cost input, deeply personal output |
| Format is the message | the Spark board — pitching *is* the appraisal | turns idea-validation into the product's core act |
| Scarcity from abundance | grade + bands (S/A/B), ranked reveal | one clear niche to chase, not infinite noise |
| Leave a receipt | shareable pitch card (web2) / optional mint (web3) | proof you found it, and a thing to pitch |
| The splinter (dilution) | *optional web3 only:* grade decays as others claim the same triple | tension for crypto users; never blocks web2 |

The unresolvable tension (your niche dilutes as it spreads) lives entirely in the **optional** web3 layer. Web2 users get a clean, resolving tool. Web3 users get the splinter. Both align with the objective.

## 6. Core user journey (web2, the default)

```
1. COLLECT   dump everything (skills, interests, problems, obsessions)
2. CONVERGE  AI sorts into Skills / Interests / Opportunities; user edits
3. GRADE     deterministic scorer ranks every intersection → your #1 niche,
             graded, with a one-line Butcher rationale ("why this crossing has an edge")
4. IDEAS     3 concrete ideas for that niche: SERVICE · PHYSICAL · DIGITAL,
             each with a one-line pitch
5. PITCH     share a pitch card for each idea to people around you
6. LIGHTS    feedback lands on the Spark board; watch which idea catches fire
7. (web3)    optionally mint/cast your niche as an onchain first-finder receipt
```

Steps 1–6 need no login, no wallet, no chain. Step 7 is opt-in.

---

## 7. Scope (phased, each independently shippable)

### Phase 0 — Stop the bleeding (security, ~1 day, ship first)
- **P0.1** Lock CORS to deployed origin(s); remove open `cors()`. [backend/server.js:10](backend/server.js)
- **P0.2** Rate limit per IP (`express-rate-limit`), N req/min.
- **P0.3** Lightweight abuse gate on `/api/*` — since web2/anonymous is allowed, use IP rate limit + a simple challenge/session token issued by the app, **not** a Farcaster-only gate (that would break web2). Farcaster token accepted as one valid credential, not the only one.
- **P0.4** Input hardening — validate `items` are strings, cap per-item length, cap total (50).
- **P0.5** Model bump — `claude-sonnet-4-20250514` → current Sonnet, or Haiku 4.5 for categorize. [backend/server.js:66,149](backend/server.js)

**Verify:** foreign-origin curl rejected; rapid requests 429; no wallet required to pass.

### Phase 1 — The Grader + the 3 Ideas (the product)
- **P1.1** Deterministic code scorer. For S×I×O, score each triple by fixed-weight measures: coherence (embedding distance between axes), opportunity pull, combo rarity (heuristic until P3 data exists). Weighted sum → grade 0-100. **Number owned by code, not the model.**
- **P1.2** Bands S/A/B/C/D, halving toward 100.
- **P1.3** Determinism guaranteed — same list → same #1, fixed tie-break. Pass/fail test, not a metric.
- **P1.4** Rank, don't roll — hero = #1; #2/#3 available (not random reroll).
- **P1.5** Rationale line (Claude, Butcher voice) on why the #1 crossing has an edge.
- **P1.6** **The 3 ideas stay central** — for the chosen niche, generate service/physical/digital, each with: the idea, target customer, and a **one-line spoken pitch**. Reuses/upgrades existing `/api/generate-ideas` ([backend/server.js:112](backend/server.js)).

**Verify:** same list twice → identical grade + #1 + same 3 idea *slots*; each idea has a usable one-line pitch.

### Phase 2 — The Pitch Loop (the fun, the "find lights")
- **P2.1** Pitch card per idea — shareable image (brutalist, monochrome) + one-liner + feedback link. Works via plain URL (web2) — no Farcaster required.
- **P2.2** Feedback capture — anyone with the link reacts (would use / would pay / meh) + optional one line. No account to respond.
- **P2.3** The Spark board — user sees reactions aggregate live per idea; the idea catching the most light is highlighted. This is the core "finding lights" moment.
- **P2.4** Save/history — localStorage for anonymous; the session's niche + ideas + feedback persist on the device. (Optional account sync later.)

**Verify:** open pitch link in a second browser with no login, leave feedback, see it appear on the owner's Spark board.

### Phase 3 — Optional web3 layer (bonus, never a gate)
- **P3.1** Cast/mint your niche — Farcaster cast + optional onchain artifact of the graded collision card.
- **P3.2** First-finder timestamp — `{fid, triple-hash, grade, timestamp}`; earlier finder wins provenance.
- **P3.3** Grade decay + public board — a triple's rarity component drops as more FIDs claim it; live decaying board. The splinter, for crypto users only.

**Verify:** web2 user completes P0–P2 with zero web3 calls; web3 user additionally mints and appears on the board.

## 8. Fix list (from audit, folded into phases)

| Item | Where | Phase |
|---|---|---|
| Open CORS / no auth / no rate limit | [backend/server.js:10](backend/server.js) | P0 |
| Random collision → deterministic grader | [index.html:184](index.html) | P1 |
| Keep the 3 service/physical/digital ideas central | [backend/server.js:112](backend/server.js) | P1 |
| `key={i}` on draggable list | [index.html:676](index.html) | P1 |
| `reroll` can pick same value | [index.html:220](index.html) | P1 (superseded by ranked reveal) |
| `alert()` breaks aesthetic | [index.html:100,134,177](index.html) | P1 |
| No button hierarchy (primary == secondary) | index.html buttons | P1 |
| `fontFamily: monospace` vs loaded JetBrains Mono | index.html buttons | P1 |
| `onKeyPress` deprecated | [index.html:721](index.html) | P1 |
| Categorize silently drops items | [backend/server.js:83](backend/server.js) | P0 (reconcile check) |
| `user-scalable=no` accessibility fail | [index.html:5](index.html) | P1 |
| Babel-in-browser compile (slow first paint) | [index.html:14](index.html) | P2 (prebuild bundle) |

## 9. Success metrics

- **Trust:** identical input → identical grade + #1, 100% (pass/fail).
- **Deliverable:** % of sessions that reach the 3 ideas. Target > 70%.
- **The point (lights):** % of users who pitch at least one idea and receive ≥1 feedback. This is the objective made measurable. Target > 30%.
- **Fun/loop:** avg feedback responses per pitched idea; % of owners who return to check their Spark board.
- **Reach:** sessions arriving from a shared pitch link (web2 loop — does not require chain).
- **Cost safety:** zero unauthenticated/over-limit calls reach Claude after P0.
- **Web3 opt-in:** % of web3 users who mint (bonus signal, not a core KPI).

## 10. Sequencing

```
P0 security     → 1 day, ship now, protects budget, web2-safe
P1 grader+ideas → the product: trusted niche + the 3 pitchable ideas
P2 pitch loop   → the fun + the objective's payoff (find lights)
P3 web3 layer   → optional bonus; needs P2 volume; never gates web2
```

## 11. Open questions

1. **Grader — DECIDED.** Code scorer owns the number (embeddings + fixed weights, fully deterministic, cheap); Claude owns only the rationale line and the 3 ideas.
2. **Feedback storage.** Pitch feedback needs a tiny backend store (lightweight KV or a serverless DB) so links work across devices. Confirm we can add one small store, or keep feedback link-based/manual for v2?
3. **Anonymous identity for the Spark board.** Web2 has no FID — use a per-session token in the share URL to route feedback back. OK?
4. **Decay curve (web3 only).** Linear per-finder or halving? Halving matches the band aesthetic.
5. **Idea count.** Keep exactly 3 (service/physical/digital) per the objective, or allow a "give me another angle" on any one slot?

---

*One line: stuck people don't need more ideas — they need one niche they trust and three pitches that might light up.*
