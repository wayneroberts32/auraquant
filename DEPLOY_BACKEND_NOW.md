# 🚀 DEPLOY YOUR NEW BACKEND TO RENDER - STEP BY STEP

## Current Situation
- ❌ Old backend on Render (not working with webhooks)
- ✅ New backend ready in `D:\AuraQuant_Rich_Bot\Warp\AuraQuant\backend`
- ✅ All files prepared for deployment

## 🔧 Step 1: Open PowerShell in Backend Directory
```powershell
cd D:\AuraQuant_Rich_Bot\Warp\AuraQuant\backend
```

## 📦 Step 2: Create New GitHub Repository
1. Go to: https://github.com/new
2. Create repository:
   - Name: `auraquant-backend`
   - Description: "AuraQuant Trading Platform Backend API"
   - Private repository: Yes
   - DO NOT initialize with README (we have one)
3. Copy the repository URL (e.g., `https://github.com/wayneroberts32/auraquant-backend.git`)

## 🎯 Step 3: Run Deployment Script
```powershell
.\deploy-to-render.ps1
```
When prompted:
- Paste your GitHub repository URL
- The script will push code to GitHub

## 🔄 Step 4: Update Render Service

### Option A: Update Existing Service
1. Go to: https://dashboard.render.com/web/srv-d1r5mmodl3ps73f3mdog
2. Click "Settings" tab
3. In "Build & Deploy" section, update:
   - **GitHub Repository**: `https://github.com/wayneroberts32/auraquant-backend`
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Click "Save Changes"
5. Go to "Manual Deploy" → "Deploy latest commit"

### Option B: Create New Service (Recommended)
1. Go to: https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your new GitHub repo: `auraquant-backend`
4. Configure:
   - **Name**: `auraquant-backend-v2`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click "Create Web Service"

## 🔑 Step 5: Add Environment Variables in Render

Go to Environment tab and add these ESSENTIAL variables:

```bash
# Minimum Required for Testing
SECRET_KEY=your-secret-key-here-change-this-123456
JWT_SECRET_KEY=your-jwt-secret-here-change-this-123456
DATABASE_URL=sqlite:///./auraquant.db
WEBHOOK_SECRET=your-webhook-secret-123456
ALLOWED_IPS=52.89.214.238,34.212.75.30,54.218.53.128,52.32.178.7

# Add your broker keys as you get them
ALPACA_API_KEY=your-key-here
ALPACA_SECRET_KEY=your-secret-here
# ... etc
```

## ✅ Step 6: Verify Deployment
1. Check Render logs for successful startup
2. Wait for "Live" status (usually 2-3 minutes)
3. Open test page: `test-connection.html`
4. Test endpoints:
   - Basic: `https://auraquant-backend.onrender.com`
   - Health: `https://auraquant-backend.onrender.com/api/health`
   - Webhooks: `https://auraquant-backend.onrender.com/api/webhooks/tradingview`

## 🔗 Step 7: Update Frontend Config (if new URL)
If you created a new service with different URL:
1. Edit `js/config.js`
2. Update URLs to your new backend URL
3. Save and test

## 🎉 Success Checklist
- [ ] GitHub repository created
- [ ] Backend code pushed to GitHub
- [ ] Render service updated/created
- [ ] Environment variables configured
- [ ] Deployment successful (check logs)
- [ ] Test connection working
- [ ] Webhook endpoints accessible
- [ ] Frontend connected to backend

## 🆘 Troubleshooting

### If deployment fails:
1. Check Render logs for errors
2. Verify all files are in GitHub
3. Check Python version compatibility
4. Ensure requirements.txt is valid

### If webhooks still fail:
1. Verify ALLOWED_IPS includes TradingView IPs
2. Check WEBHOOK_SECRET is set
3. Test with curl:
```bash
curl -X POST https://auraquant-backend.onrender.com/api/webhooks/tradingview \
  -H "Content-Type: application/json" \
  -d '{"action":"test"}'
```

### If connection fails:
1. Check CORS settings in app.py
2. Verify backend is actually running
3. Check browser console for errors

## 📞 Quick Commands

Test backend is running:
```powershell
curl https://auraquant-backend.onrender.com
```

Test health endpoint:
```powershell
curl https://auraquant-backend.onrender.com/api/health
```

## 🎯 READY TO DEPLOY!

Your new backend with full webhook support is ready. Follow the steps above to deploy it to Render and replace the old backend.

Once deployed, your trading platform will have:
- ✅ Working webhooks for TradingView
- ✅ Bot control endpoints
- ✅ Real-time WebSocket
- ✅ Multi-broker support
- ✅ Risk management
- ✅ All the features we built!
