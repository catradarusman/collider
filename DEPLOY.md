# Deploying COLLIDER

Production runs on **Netlify**: the static site (`index.html` + `assets/`) is served from the repo root, and the three API endpoints run as **Netlify Functions**. There is no build step and nothing to run yourself — `netlify.toml` wires it up.

Locally you run a single Node server (`npm start`) that serves the same page and API on one origin. Both share the logic in `backend/core.js`.

---

## Step 1 — Anthropic API key

1. [console.anthropic.com](https://console.anthropic.com/) → create a key (`sk-ant-...`).
2. Keep it safe — it goes in Netlify's environment variables (Step 2), never in the repo.

## Step 2 — Deploy on Netlify

1. [netlify.com](https://netlify.com) → **Add new site** → **Import from Git** → pick `catradarusman/collider`.
2. Build settings — leave them empty. `netlify.toml` already sets:
   - Publish directory: `.` (repo root)
   - Functions directory: `netlify/functions`
   - No build command (the app is inline React).
3. **Site settings → Environment variables** → add:
   - `ANTHROPIC_API_KEY` = your key from Step 1
   - *(optional)* `MODEL` to override the default `claude-haiku-4-5-20251001`
4. **Deploy**. Netlify installs dependencies from `package.json`, bundles the functions, and publishes.

The frontend calls `/api/categorize`, `/api/collide`, `/api/ideas`; `netlify.toml` redirects each to its function, so `API_URL` stays `""` (same origin).

## Step 3 — Custom domain (collider.catra.fyi)

DNS is already set at Porkbun (CNAME `collider` → your Netlify site). To finish:

1. Netlify → **Domain management** → **Add a domain** → `collider.catra.fyi`.
2. Netlify verifies the CNAME and provisions Let's Encrypt SSL automatically (a few minutes).

The Farcaster manifest (`.well-known/farcaster.json`) and `fc:miniapp` embed already point at `collider.catra.fyi`, with a matching signed `accountAssociation`.

## Step 4 — Test

Open https://collider.catra.fyi → **Start** → dump a few dots → **Sort** → **Collide**. A graded niche + three pitches means the functions are live.

---

## Local development

```bash
git clone https://github.com/catradarusman/collider
cd collider
npm install
cp .env.example .env        # paste ANTHROPIC_API_KEY
npm start
```

http://localhost:3000 — one Node server serves the page and the API.

*(Optional: `npx netlify dev` runs the functions locally the way prod does, if you want to exercise that path.)*

---

## Notes & troubleshooting

- **No serverless rate limiting.** `express-rate-limit` only guards the local server; Netlify Functions have no shared memory to rate-limit against. Netlify provides basic platform-level abuse protection. Add an external store (e.g. Upstash) later if you need real limits.
- **Function timeout.** Netlify's default is 10s; the Claude calls (Haiku 4.5) finish in ~2–4s.
- **`Failed to collide` in prod** — check `ANTHROPIC_API_KEY` is set in Netlify env vars, then redeploy.
- **Works locally, not in prod** — locally the key comes from `.env`; in prod it must be a Netlify env var (`.env` is not committed).

## Alternative: single Node host

You can also skip Netlify and deploy the whole repo as one Node service (Railway, Render, Fly): set `ANTHROPIC_API_KEY`, start command `npm start`. Point the domain there instead. The functions are ignored in that mode.

---

## Updating

Push to `main` → Netlify auto-redeploys.
