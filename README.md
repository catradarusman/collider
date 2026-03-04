# COLLIDER

**Find where your dots intersect.**

A tool for discovering unique niche intersections by colliding your skills, interests, and market opportunities.

---

## 🚀 Quick Deploy

### Prerequisites
- GitHub account
- Railway account (free tier)
- Netlify account (free tier)
- Anthropic API key ([get one here](https://console.anthropic.com/))

### 1. Deploy Backend (Railway)

1. Fork this repo on GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your forked repo
5. Choose the `backend` folder
6. Add environment variable:
   - `ANTHROPIC_API_KEY` = your API key from Anthropic
7. Click "Deploy"
8. Copy your deployment URL (e.g., `https://collider-production.up.railway.app`)

### 2. Deploy Frontend (Netlify)

1. Update `frontend/index.html`:
   - Find line 15: `const API_URL = ...`
   - Replace with your Railway URL from step 1
2. Push changes to GitHub
3. Go to [netlify.com](https://netlify.com)
4. Click "Add new site" → "Import an existing project"
5. Connect to GitHub, select your repo
6. Build settings:
   - Base directory: `frontend`
   - Build command: (leave empty)
   - Publish directory: `.`
7. Click "Deploy"

Done! Your COLLIDER is live.

---

## 💰 Costs

- **Railway:** Free tier ($5/month credit) - enough for ~500 users/month
- **Netlify:** Free tier - unlimited bandwidth
- **Anthropic API:** ~$0.01 per collision
  - 10 users/day = ~$3/month
  - 100 users/day = ~$30/month

---

## 🛠 Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm start
```

### Frontend
Open `frontend/index.html` in your browser.

---

## 📁 Project Structure

```
collider/
├── frontend/
│   └── index.html          # React app (all-in-one)
├── backend/
│   ├── server.js           # Express API
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## 🔧 Tech Stack

- **Frontend:** React (inline), Space Grotesk + JetBrains Mono fonts
- **Backend:** Node.js + Express
- **AI:** Anthropic Claude Sonnet 4
- **Hosting:** Netlify (frontend) + Railway (backend)

---

## 📝 License

MIT - Use it however you want.

---

Built with the DICE Framework (Diverge → Converge → Emerge)
