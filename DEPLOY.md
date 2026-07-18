# Deploying COLLIDER

Collider is **one Node web service**. The same server runs the API and serves the website — so there is a single thing to deploy. No separate frontend host, no `API_URL` to edit, no CORS to wire up.

Any Node host works (Railway, Render, Fly.io, a VPS). Steps below use Railway; the idea is identical everywhere.

---

## Step 1 — Get the code on GitHub

Already at [github.com/catradarusman/collider](https://github.com/catradarusman/collider). Fork it, or push your own copy.

## Step 2 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create a key (starts with `sk-ant-...`)
3. Keep it somewhere safe — you paste it in Step 3.

**Never commit the key.** It belongs in the platform's environment variables (below) or a local `.env` (which is gitignored).

## Step 3 — Deploy on Railway

1. [railway.app](https://railway.app) → **Login with GitHub**.
2. **New Project** → **Deploy from GitHub repo** → pick `collider`.
3. Leave the root directory as the repo root (`/`). Do **not** point it at `/backend` — the server serves `index.html` and `assets/` from the repo root.
   - Build command: (none needed)
   - Start command: `npm start` (auto-detected from `package.json`)
4. **Variables** tab → add:
   - `ANTHROPIC_API_KEY` = your key from Step 2
   - *(optional)* `MODEL`, `PORT` — sensible defaults already exist.
5. **Settings** → **Generate Domain**. You get something like `https://collider-production.up.railway.app`. That single URL is the whole app.

Done. Open the URL — the site loads and the API answers on the same origin.

### Render / Fly / VPS

Same shape: deploy the whole repo, run `npm start`, set `ANTHROPIC_API_KEY`. On a VPS, `npm install && npm start` behind a reverse proxy is enough.

---

## Step 4 — (Optional) Farcaster miniapp

Collider ships a Farcaster miniapp manifest, but it is pinned to a specific domain. If you deploy to your own domain and want the miniapp embed to work, you must update it for **your** domain:

1. In `.well-known/farcaster.json` and the `fc:miniapp` meta tag in `index.html`, replace `collider-tool.netlify.app` with your deploy domain and update the `imageUrl` / `splashImageUrl` / `homeUrl` accordingly.
2. Re-generate the `accountAssociation` (header/payload/signature) for your domain using the Farcaster developer tools — the existing signature only validates the original domain and cannot be reused.

If you are not using the Farcaster miniapp, ignore this step; the plain web app works everywhere.

---

## Step 5 — Test it

1. Open your deploy URL.
2. Click **Start**, dump a few skills/interests/problems, **Sort my dots**, then **Collide**.
3. You get a graded niche + three pitches → success.

---

## Troubleshooting

**`Failed to collide` / API errors** — the key is missing or wrong. Check the `ANTHROPIC_API_KEY` variable on the platform, then redeploy/restart. Platform logs show the exact error.

**Page loads but calls 404** — you deployed only the `backend/` folder. Deploy the whole repo from the root so `index.html` and `assets/` are present next to `backend/`.

**Works locally, not in prod** — locally the key comes from `.env`; in prod it must be set as a platform environment variable (the `.env` file is not committed).

---

## Costs

- **Host (Railway/Render free tier):** ~$0.50–2/month at low traffic.
- **Anthropic API:** ~$0.01–0.02 per collision (categorize + ideas on Haiku 4.5).
  - 10 collisions/day ≈ a few dollars/month.

---

## Updating

Push to `main` → the platform auto-redeploys. One service, one deploy.
