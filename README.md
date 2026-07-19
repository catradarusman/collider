# COLLIDER

**Collide your skills, interests & opportunities into a niche worth building.**

Collider takes what you can do, what you love, and where the world is heading, then crashes them into one graded personal niche — with three concrete ideas (a service, a physical product, a digital product) you can pitch to people and download as a one-pager.

---

## How it works

```
01  COLLECT   — dump every skill, interest, obsession, and problem
02  CONVERGE  — AI sorts them into Skills / Interests / Opportunities; you fix the sort
03  COLLIDE   — a deterministic grader ranks every crossing and picks your strongest niche
```

For the top crossing (and any runner-up you tap into) you get:

- a **grade** 0–100 with a band (S/A/B/C/D) — deterministic: the same lists always score the same, no dice roll
- three **pitches** (service / physical / digital), each with *what it is*, *why it matters*, *how to pitch it*, a spoken one-liner, and a **1–5 $ opportunity meter**
- a **PNG one-pager** you can download and show people
- a **self-rating** ("does this fit what you want?") saved in your browser

## Architecture

The frontend is a static page (inline React, no build). The API logic lives in `backend/core.js` and is exposed two ways from one codebase:

- **Local dev:** `backend/server.js` (Express) serves the page and `/api/*` on one origin.
- **Production (Netlify):** the page is served statically and `/api/*` runs as Netlify Functions (`netlify/functions/*`). `netlify.toml` wires the redirects.

`API_URL` is `""` (same origin) in both.

```
collider/
├── index.html              # the whole React app (inline, no build step)
├── assets/                 # icon / og / splash images
├── .well-known/            # Farcaster miniapp manifest
├── backend/
│   ├── core.js             # shared AI logic (categorize / collide / ideas)
│   ├── grader.js           # deterministic niche scorer (pure code, no model)
│   └── server.js           # local Express server (dev)
├── netlify/functions/      # categorize.js / collide.js / ideas.js (prod)
├── netlify.toml            # publish root + /api/* → functions
├── package.json            # start script + deps
└── .env                    # ANTHROPIC_API_KEY (local only, gitignored)
```

The grader is pure code (never the model, never random) so grades are reproducible. Claude writes only the words: the rationale and the three ideas.

## Local development

```bash
git clone https://github.com/catradarusman/collider
cd collider
npm install
cp .env.example .env        # then paste your ANTHROPIC_API_KEY
npm start
```

Open http://localhost:3000. That's it — the same server serves the page and the API.

Get an API key at [console.anthropic.com](https://console.anthropic.com/).

## Deployment

See [DEPLOY.md](DEPLOY.md). Short version: connect the repo to **Netlify** (static site + Netlify Functions, no build), set `ANTHROPIC_API_KEY`, done — `netlify.toml` handles the rest. Live at [collider.catra.fyi](https://collider.catra.fyi). You can alternatively deploy the whole repo as one Node service (`npm start`) on Railway/Render/Fly.

## Tech stack

- **Frontend:** React 18 (inline via Babel standalone), Space Grotesk + JetBrains Mono. Swiss-poster design system, mono + one accent.
- **Backend:** Node + Express, deterministic grader, Anthropic Claude (Haiku 4.5 by default).
- **PNG export:** rendered on `<canvas>`, zero dependencies.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | required |
| `PORT` | `3000` | |
| `MODEL` | `claude-haiku-4-5-20251001` | any Claude model id |
| `ALLOWED_ORIGINS` | (unset) | comma-separated CORS allowlist. Not needed for the single-service setup, since the frontend is same-origin. Set it only if you host the frontend somewhere else. |

## License

MIT — use it however you want.

---

Built with the DICE framework (Diverge → Converge → Emerge).
