# 🚀 AuraQuant Deployment Guide

## Complete Step-by-Step Deployment to Render (Backend) and Cloudflare (Frontend)

---

## 📋 Pre-Deployment Checklist

✅ Backend code in `D:\AuraQuant_Rich_Bot\Warp\AuraQuant\backend`
✅ Frontend code in `D:\AuraQuant_Rich_Bot\Warp\AuraQuant`
✅ Environment variables configured in `.env`
✅ Git installed on your system
✅ GitHub account ready

---

## Part 1: Initialize Git Repository

### Step 1: Open PowerShell in Project Root
```powershell
cd D:\AuraQuant_Rich_Bot\Warp\AuraQuant
```

### Step 2: Initialize Git
```powershell
git init
git config user.email "wayneroberts32@gmail.com"
git config user.name "Wayne Roberts"
```

### Step 3: Create GitHub Repository
Go to https://github.com/new and create a new repository:
- Repository name: `auraquant`
- Private repository: ✅
- Don't initialize with README

### Step 4: Add Git Remote
```powershell
git remote add origin https://github.com/wayneroberts32/auraquant.git
```

### Step 5: Initial Commit
```powershell
# Add all files
git add .

# Commit
git commit -m "Initial AuraQuant platform commit"

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy Backend to Render

### Step 1: Connect Render to GitHub
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select repository: `wayneroberts32/auraquant`

### Step 2: Configure Render Service
Fill in these settings:

```yaml
Name: auraquant-backend
Environment: Python 3
Build Command: cd backend && pip install -r requirements.txt
Start Command: cd backend && python app.py
Instance Type: Free
Branch: main
Root Directory: /
```

### Step 3: Add Environment Variables in Render
Go to "Environment" tab and add these variables from your `.env`:

```bash
# Core Settings
APP_NAME=AuraQuant
APP_ENV=production
SECRET_KEY=FlzDnh9AqwZ!rYXuQ4NHJg75RbVG0T^%mE*8i&UIo1Pte2s$xcKkCLa#dMpjOvB6
JWT_SECRET_KEY=sME8eZg7SnCjd4AmGQohKDp09iVXwuJcykO$YB2&#Nx@f1*3RbvTIU!Hqz^P5tL6

# Database (Render provides DATABASE_URL automatically)
REDIS_URL=memory://

# Discord
DISCORD_BOT_TOKEN=MTQwNzM2NzQ2NzAzODQwODc5NA.GNuady.lj0eb0VcX-BLMKMLsNyYC-Ezgp8nnXvooy0CoI
DISCORD_CHANNEL_ID=1407369896089616635

# Telegram
TELEGRAM_BOT_TOKEN=8186673555:AAEZx3hK7kOYOXPQMqOw3ciZlXG2BW_WJnI
TELEGRAM_CHAT_ID=6995384125

# Binance
BINANCE_API_KEY=t2IeL6n2H05aSYJiCizIoReqlQU9cThwltCSvTpBfchWGUo79dK5LJtJhbbfQa70
BINANCE_SECRET_KEY=uMsThZIQzn08Nnveyilham0qJYGIZwCTs89SvRF8yce12gUmDsS1bQRwLvYrfhys

# Alpaca
ALPACA_API_KEY=PKKU0X6TZ1QEUUTX0RVQ
ALPACA_SECRET_KEY=cbwy35qhIGILXIY0GRme739c52E6Sk84uJPXrRTA
ALPACA_ENDPOINT=https://paper-api.alpaca.markets

# OpenAI
OPENAI_API_KEY=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

# Webhook
WEBHOOK_SECRET_TOKEN=MzMxMjFhMTAtYTk4Ni00OWE0LTgwNDItNTg4M2RhYzFjMWRl

# OneDrive Backup
ONEDRIVE_BACKUP_URL=https://1drv.ms/f/c/1ec835c4b2d19c09/Ei4R7054hcVGgY947FKxUO4BYoGj9hxx4pq9AaTdjta_mg?e=o10vl4
ONEDRIVE_PASSWORD=Zeke29072@22
```

### Step 4: Deploy Backend
Click "Create Web Service" - Render will automatically deploy

### Step 5: Note Your Backend URL
After deployment, your backend URL will be:
```
https://auraquant-backend.onrender.com
```

---

## Part 3: Deploy Frontend to Cloudflare Pages

### Step 1: Prepare Frontend Config
Create `D:\AuraQuant_Rich_Bot\Warp\AuraQuant\js\api-config.js`:

```javascript
// API Configuration for Production
window.API_CONFIG = {
    BACKEND_URL: 'https://auraquant-backend.onrender.com',
    WEBSOCKET_URL: 'wss://auraquant-backend.onrender.com',
    WEBHOOK_URL: 'https://auraquant-backend.onrender.com/webhook/tradingview'
};
```

### Step 2: Update index.html
Add this before other scripts:
```html
<script src="js/api-config.js"></script>
```

### Step 3: Commit Frontend Changes
```powershell
git add .
git commit -m "Add production API configuration"
git push
```

### Step 4: Connect Cloudflare Pages
1. Go to https://dash.cloudflare.com
2. Click "Pages" → "Create a project"
3. Connect to Git → Select `wayneroberts32/auraquant`

### Step 5: Configure Build Settings
```yaml
Project name: auraquant-dashboard
Production branch: main
Build command: # Leave empty (static site)
Build output directory: /
Root directory: /
```

### Step 6: Deploy Frontend
Click "Save and Deploy"

Your frontend will be available at:
- `https://auraquant-dashboard.pages.dev`
- `https://ai-auraquant.com` (after domain setup)

---

## Part 4: Setup Automatic Deployments

### GitHub Actions for Auto Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Auto Deploy

on:
  push:
    branches: [main]

jobs:
  notify-render:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST https://api.render.com/deploy/srv-d1r5mmodl3ps73f3mdog?key=${{ secrets.RENDER_DEPLOY_KEY }}
```

### Add Deploy Key to GitHub
1. Go to GitHub repo → Settings → Secrets
2. Add new secret: `RENDER_DEPLOY_KEY`
3. Get key from Render dashboard → Service → Settings → Deploy Hook

---

## Part 5: Test Webhooks & WebSockets

### Test TradingView Webhook
```powershell
# Test webhook from PowerShell
$body = @{
    token = "MzMxMjFhMTAtYTk4Ni00OWE0LTgwNDItNTg4M2RhYzFjMWRl"
    symbol = "AAPL"
    action = "BUY"
    price = 150.50
    confidence = 90
    strategy = "Test"
    requires_manual = $true
    broker = "NAB"
    message = "Deployment test signal"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://auraquant-backend.onrender.com/webhook/tradingview" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Test WebSocket Connection
Open browser console at `https://auraquant-dashboard.pages.dev`:
```javascript
// Test WebSocket
const ws = new WebSocket('wss://auraquant-backend.onrender.com/ws');
ws.onopen = () => console.log('WebSocket connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send(JSON.stringify({type: 'ping'}));
```

---

## Part 6: Setup Custom Domain (Optional)

### For Cloudflare Pages (ai-auraquant.com)
1. Go to Cloudflare Pages → Custom domains
2. Add domain: `ai-auraquant.com`
3. Follow DNS configuration instructions

---

## Part 7: Monitor & Maintain

### View Logs
- **Render Backend Logs**: https://dashboard.render.com/web/srv-d1r5mmodl3ps73f3mdog/logs
- **Cloudflare Pages**: https://dash.cloudflare.com → Pages → View build logs

### Auto-Deploy on Git Push
Every time you push to GitHub:
```powershell
# Make changes
git add .
git commit -m "Update feature X"
git push

# Both Render and Cloudflare will auto-deploy!
```

---

## 🎉 Deployment Complete!

Your AuraQuant platform is now live:

### URLs:
- **Frontend**: https://auraquant-dashboard.pages.dev
- **Backend API**: https://auraquant-backend.onrender.com
- **Webhook Endpoint**: https://auraquant-backend.onrender.com/webhook/tradingview
- **WebSocket**: wss://auraquant-backend.onrender.com/ws

### Discord Bot:
Will automatically connect to channel: `1407369896089616635`

### Telegram Bot:
Will send notifications to chat: `6995384125`

---

## Quick Commands Reference

### Daily Development Workflow
```powershell
# Navigate to project
cd D:\AuraQuant_Rich_Bot\Warp\AuraQuant

# Check status
git status

# Add and commit changes
git add .
git commit -m "Description of changes"

# Deploy (automatic on push)
git push

# Check deployment status
# Render: https://dashboard.render.com
# Cloudflare: https://dash.cloudflare.com
```

### Rollback if Needed
```powershell
# Revert last commit
git revert HEAD
git push

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force
```

---

## Troubleshooting

### Backend Not Starting?
Check Render logs for errors. Common issues:
- Missing dependencies in requirements.txt
- Environment variables not set
- Port binding issues (use PORT env var)

### WebSocket Not Connecting?
- Ensure backend supports WebSocket upgrade
- Check CORS settings in backend
- Verify wss:// protocol in frontend

### Webhook Not Working?
- Verify webhook secret token matches
- Check IP whitelist if enabled
- Test with curl/PowerShell first

---

## Support

- **Render Status**: https://status.render.com
- **Cloudflare Status**: https://cloudflarestatus.com
- **GitHub Status**: https://githubstatus.com

Ready to trade! 🚀
