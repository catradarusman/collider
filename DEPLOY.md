# 🚀 DEPLOYMENT GUIDE FOR NON-CODERS

Follow these steps exactly. Copy-paste commands when you see them.

---

## STEP 1: GET YOUR FILES ON GITHUB

### 1.1 Create GitHub Account
1. Go to [github.com](https://github.com)
2. Click "Sign up"
3. Choose a username (e.g., "yourname")
4. Verify email

### 1.2 Upload Your Code
1. On GitHub, click the **+** icon (top right) → "New repository"
2. Name it: `collider`
3. Make it **Public**
4. Check "Add a README file"
5. Click "Create repository"

6. Click "Add file" → "Upload files"
7. Drag the entire `collider-deploy` folder into the upload area
8. Wait for upload to complete
9. Click "Commit changes"

**✓ Done!** Your code is now on GitHub.

---

## STEP 2: GET YOUR ANTHROPIC API KEY

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up / Log in
3. Click "Get API Keys" or go to Settings
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-...`)
6. **Save it somewhere safe** (you'll need it in Step 3)

---

## STEP 3: DEPLOY BACKEND (RAILWAY)

### 3.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub

### 3.2 Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `collider` repository
4. Railway will ask which folder to deploy
5. Select `backend` folder (or set Root Directory to `/backend`)
6. Click "Deploy"

### 3.3 Add Your API Key
1. In Railway, click on your project
2. Go to "Variables" tab
3. Click "New Variable"
4. Add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** (paste your API key from Step 2)
5. Click "Add"

### 3.4 Get Your Backend URL
1. Go to "Settings" tab
2. Click "Generate Domain"
3. Copy the URL (looks like: `https://collider-production.up.railway.app`)
4. **Save this URL** - you need it for Step 4

**✓ Done!** Your backend is live.

---

## STEP 4: UPDATE FRONTEND WITH BACKEND URL

### 4.1 Edit Frontend File
1. Go back to your GitHub repository
2. Navigate to: `frontend/index.html`
3. Click the **pencil icon** (top right) to edit
4. Find line 15: `const API_URL = 'http://localhost:3000';`
5. Replace it with:
   ```javascript
   const API_URL = 'https://your-railway-url.up.railway.app';
   ```
   (Use the URL you copied in Step 3.4)
6. Scroll down, click "Commit changes"

---

## STEP 5: DEPLOY FRONTEND (NETLIFY)

### 5.1 Create Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Click "Sign up" → "Sign up with GitHub"
3. Authorize Netlify

### 5.2 Deploy Site
1. Click "Add new site" → "Import an existing project"
2. Choose "Deploy with GitHub"
3. Select your `collider` repository
4. Configure build settings:
   - **Base directory:** `frontend`
   - **Build command:** (leave empty)
   - **Publish directory:** `.` (just a dot)
5. Click "Deploy site"

### 5.3 Wait for Deployment
- Netlify will build and deploy (takes ~1 minute)
- You'll get a random URL like: `https://random-name-123.netlify.app`

### 5.4 (Optional) Custom Domain
1. In Netlify, go to "Site settings"
2. Click "Change site name"
3. Enter: `collider` or any available name
4. Your site becomes: `https://collider.netlify.app`

**✓ Done!** Your COLLIDER is live!

---

## STEP 6: TEST IT

1. Open your Netlify URL
2. Type some skills/interests (e.g., "design, music, startups")
3. Click "CATEGORIZE →"
4. If it works → **Success!**
5. If it fails → Check troubleshooting below

---

## ❌ TROUBLESHOOTING

### "Failed to categorize" error
**Problem:** Frontend can't reach backend

**Fix:**
1. Check Railway backend is running (green checkmark in Railway dashboard)
2. Verify you updated `API_URL` in `frontend/index.html` correctly
3. Make sure Railway URL doesn't have trailing slash (remove `/` at end)
4. Check Railway logs for errors

### "API key is required" error
**Problem:** Backend missing API key

**Fix:**
1. Go to Railway → Variables
2. Verify `ANTHROPIC_API_KEY` is set correctly
3. Restart the backend (in Railway: Settings → Restart)

### Backend won't deploy
**Problem:** Railway can't find the code

**Fix:**
1. Check your GitHub repo has the `backend` folder
2. In Railway settings, set Root Directory to `/backend`
3. Redeploy

---

## 💰 COSTS (Updated)

- **Railway:** Free $5/month credit
  - Your backend uses ~$0.50-2/month (depending on usage)
  - Easily covers 50-200 users/month
- **Netlify:** Completely free for your traffic level
- **Anthropic API:** 
  - ~$0.02 per collision (categorize + generate ideas)
  - 10 users/day = ~$6/month
  - 100 users/day = ~$60/month

**Total: ~$7-10/month** for moderate usage (10-20 users/day)

---

## 📝 WHAT YOU JUST DID

1. ✓ Put your code on GitHub (version control)
2. ✓ Deployed backend on Railway (API server)
3. ✓ Connected backend to Anthropic (AI brain)
4. ✓ Deployed frontend on Netlify (website)
5. ✓ Made frontend talk to backend (API connection)

**You now have a live AI-powered web app.** Not bad for a non-coder.

---

## 🔄 UPDATING YOUR SITE

When you want to change something:

1. Edit files on GitHub (click pencil icon)
2. Commit changes
3. Railway/Netlify auto-redeploy (takes ~1 min)

No need to repeat the whole process.

---

## 🆘 NEED HELP?

1. Check Railway logs (Railway dashboard → Deployments → Logs)
2. Check browser console (F12 → Console tab)
3. Verify all URLs match (no http vs https mixups)

---

**That's it. Your COLLIDER is live.**

Share the Netlify URL with friends and watch them find their intersections.
