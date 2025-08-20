# Clear Render Backend - Simple Guide

## Your File Structure is CORRECT ✅

Your directory structure at `D:\AuraQuant_Rich_Bot\Warp\AuraQuant` is properly organized:

```
AuraQuant/
├── backend/          ← This goes to Render
├── css/             ← Frontend (Cloudflare)
├── js/              ← Frontend (Cloudflare)
├── assets/          ← Frontend (Cloudflare)
├── index.html       ← Frontend (Cloudflare)
├── help.html        ← Frontend (Cloudflare)
└── deploy scripts   ← For deployment
```

## Option 1: Quick Manual Clear & Deploy

### Step 1: Clear Render via Dashboard
1. Go to https://dashboard.render.com
2. Find your AuraQuant backend service
3. Click on the service
4. Go to Settings → Delete Service (if you want complete reset)
5. OR go to Manual Deploy → Clear Build Cache & Deploy

### Step 2: Prepare Your .env File
```bash
# Navigate to backend folder
cd D:\AuraQuant_Rich_Bot\Warp\AuraQuant\backend

# Create .env file from template
copy .env.example .env

# Edit .env and add your API keys
notepad .env
```

### Step 3: Deploy Fresh Backend via Git

```powershell
# From AuraQuant directory
cd D:\AuraQuant_Rich_Bot\Warp\AuraQuant

# Initialize git (if not done)
git init

# Add only backend files
git add backend/
git add .gitignore

# Commit
git commit -m "Fresh backend deployment"

# Add Render remote (get URL from Render dashboard)
git remote add render YOUR_RENDER_GIT_URL

# Force push to clear old and deploy new
git push render main --force
```

## Option 2: Use the Automated Script

```powershell
# From AuraQuant directory
cd D:\AuraQuant_Rich_Bot\Warp\AuraQuant

# Run the clear and deploy script
.\clear_render_backend.ps1
```

## Option 3: Create New Render Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo OR use "Public Git repository"
4. Configure:
   - **Name**: auraquant-backend
   - **Root Directory**: backend
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3
5. Add Environment Variables:
   ```
   ENVIRONMENT=production
   DATABASE_URL=your_database_url
   REDIS_URL=your_redis_url
   SECRET_KEY=your_secret_key
   
   # Add all your API keys here
   ALPACA_API_KEY=xxx
   ALPACA_SECRET_KEY=xxx
   BINANCE_API_KEY=xxx
   BINANCE_SECRET_KEY=xxx
   # ... etc
   ```

## What Gets Deployed Where

### To Render (Backend):
- `backend/` folder and all its contents
- Python backend API
- Bot engine
- Webhook handlers
- Database models
- Trading strategies

### To Cloudflare (Frontend):
- `index.html`
- `help.html`
- `css/` folder
- `js/` folder
- `assets/` folder

## Environment Variables Checklist

Add these in Render Dashboard → Environment:

```env
# Core Settings
ENVIRONMENT=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@host/dbname
REDIS_URL=redis://localhost:6379

# Broker APIs
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets

BINANCE_API_KEY=
BINANCE_SECRET_KEY=

IB_ACCOUNT=
IB_USERNAME=
IB_PASSWORD=

COINBASE_API_KEY=
COINBASE_API_SECRET=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=

# Social/Notifications
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=1407369896089616635
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TWITTER_API_KEY=
TWITTER_API_SECRET=

# Market Data
POLYGON_API_KEY=
ALPHA_VANTAGE_API_KEY=
FRED_API_KEY=

# News
NEWS_API_KEY=
BENZINGA_API_KEY=

# Webhooks
WEBHOOK_SECRET=
TRADINGVIEW_WEBHOOK_SECRET=
```

## Testing After Deployment

1. Check backend is running:
   ```
   https://your-service.onrender.com/health
   ```

2. Test WebSocket connection:
   ```
   wss://your-service.onrender.com/ws
   ```

3. Check API docs:
   ```
   https://your-service.onrender.com/docs
   ```

## Common Issues & Solutions

### Issue: Old files still showing
**Solution**: Use `git push render main --force` to force update

### Issue: Build fails
**Solution**: Check requirements.txt has all dependencies

### Issue: Service crashes
**Solution**: Check logs in Render dashboard, usually missing env variables

### Issue: Can't connect to database
**Solution**: Add DATABASE_URL in environment variables

## Next Steps After Backend Deploy

1. ✅ Backend deployed to Render
2. ⏳ Deploy frontend to Cloudflare using `wrangler.toml`
3. ⏳ Update frontend config.js with your Render backend URL
4. ⏳ Test complete integration
5. ⏳ Switch from paper to live trading when ready

## Support Commands

```powershell
# Check what will be deployed
git status

# See backend files only
dir backend

# Test backend locally first
cd backend
python -m uvicorn app:app --reload

# Check Python version
python --version
```

---

**Remember**: Your file structure is correct! The "Warp" folder is just your project container. Everything important is properly organized in the AuraQuant subfolder.
