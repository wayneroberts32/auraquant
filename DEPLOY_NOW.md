# 🚀 DEPLOY AURAQUANT NOW - STEP BY STEP

## ✅ Already Completed:
- ✓ Code pushed to GitHub: https://github.com/wayneroberts32/auraquant
- ✓ Deployment configurations created
- ✓ Environment variables prepared

---

## 📋 STEP 1: Deploy Backend to Render (5 minutes)

1. **Open Render Dashboard**
   - Go to: https://dashboard.render.com
   - Sign in or create account

2. **Create New Web Service**
   - Click the "New +" button
   - Select "Web Service"

3. **Connect GitHub Repository**
   - Click "Connect GitHub"
   - Authorize Render to access your GitHub
   - Search for "auraquant"
   - Click "Connect" next to `wayneroberts32/auraquant`

4. **Configure Service Settings**
   Fill in these exact values:
   ```
   Name: auraquant-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: (leave empty)
   Runtime: Python 3
   Build Command: cd backend && pip install -r requirements.txt
   Start Command: cd backend && python app.py
   Instance Type: Free
   ```

5. **Add Environment Variables**
   - Scroll down to "Environment Variables"
   - Click "Add from .env file"
   - Copy ALL content from `RENDER_ENV_VARS.txt` file
   - Paste it in the box
   - Click "Add Variables"

6. **Create Web Service**
   - Click "Create Web Service" button at bottom
   - Wait for deployment (takes 3-5 minutes)
   - Your backend URL will be: `https://auraquant-backend.onrender.com`

---

## 📋 STEP 2: Deploy Frontend to Cloudflare Pages (3 minutes)

1. **Open Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com
   - Sign in or create account

2. **Create Pages Project**
   - Click "Pages" in left sidebar
   - Click "Create a project"
   - Click "Connect to Git"

3. **Connect GitHub Repository**
   - Select "GitHub"
   - Authorize Cloudflare
   - Search for "auraquant"
   - Select `wayneroberts32/auraquant`

4. **Configure Build Settings**
   Fill in these exact values:
   ```
   Project name: auraquant-dashboard
   Production branch: main
   Build command: (LEAVE EMPTY)
   Build output directory: /
   Root directory: /
   ```

5. **Deploy**
   - Click "Save and Deploy"
   - Wait for deployment (takes 1-2 minutes)
   - Your frontend URL will be: `https://auraquant-dashboard.pages.dev`

---

## 📋 STEP 3: Verify Deployment (2 minutes)

### Test Frontend:
1. Open: https://auraquant-dashboard.pages.dev
2. You should see your AuraQuant dashboard

### Test Backend:
1. Open: https://auraquant-backend.onrender.com
2. You should see a response from your API

### Test WebSocket:
Open browser console (F12) on your frontend and run:
```javascript
const ws = new WebSocket('wss://auraquant-backend.onrender.com/ws');
ws.onopen = () => console.log('Connected!');
```

### Test Webhook:
Run this in PowerShell:
```powershell
$body = @{
    token = "MzMxMjFhMTAtYTk4Ni00OWE0LTgwNDItNTg4M2RhYzFjMWRl"
    symbol = "AAPL"
    action = "BUY"
    price = 150.50
    confidence = 90
    strategy = "Test"
    broker = "NAB"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://auraquant-backend.onrender.com/webhook/tradingview" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

## ✅ DEPLOYMENT COMPLETE!

### Your Live URLs:
- **Dashboard**: https://auraquant-dashboard.pages.dev
- **API**: https://auraquant-backend.onrender.com
- **Webhook**: https://auraquant-backend.onrender.com/webhook/tradingview
- **WebSocket**: wss://auraquant-backend.onrender.com/ws

### Configure TradingView:
1. Go to TradingView
2. Add webhook URL: `https://auraquant-backend.onrender.com/webhook/tradingview`
3. Include token in alert message

### Future Updates:
Just push to GitHub and both services auto-deploy:
```bash
git add .
git commit -m "Update message"
git push
```

---

## 🛠️ Troubleshooting

### If Render deployment fails:
- Check logs in Render dashboard
- Verify all environment variables are set
- Make sure Python version is 3.9+

### If Cloudflare deployment fails:
- Check build logs in Cloudflare
- Verify no build command is set
- Check output directory is /

### If webhook doesn't work:
- Verify token matches
- Check Render logs for errors
- Test with PowerShell command above

---

## 📞 Need Help?

- Render Support: https://render.com/docs
- Cloudflare Support: https://developers.cloudflare.com/pages
- GitHub Issues: https://github.com/wayneroberts32/auraquant/issues
