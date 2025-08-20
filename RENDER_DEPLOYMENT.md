# AuraQuant Backend Deployment on Render

## Overview
Your AuraQuant backend is hosted on Render, providing the API and WebSocket services for your trading platform. The frontend connects directly to this hosted backend - **no local backend server needed**.

## 🚀 Quick Setup

### 1. Update Frontend Configuration
Edit `js/config.js` and replace the placeholder URLs with your actual Render backend URL:

```javascript
// Replace 'auraquant-backend' with your actual Render service name
API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api'
    : 'https://YOUR-SERVICE-NAME.onrender.com/api',  // ← UPDATE THIS

WS_URL: window.location.hostname === 'localhost'
    ? 'ws://localhost:8000/ws'
    : 'wss://YOUR-SERVICE-NAME.onrender.com/ws',     // ← UPDATE THIS
```

### 2. Render Backend Setup

#### A. Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: auraquant-backend (or your preferred name)
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.app:app --host 0.0.0.0 --port $PORT`

#### B. Environment Variables
Add these in Render Dashboard → Environment:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/auraquant

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# Broker API Keys
ALPACA_API_KEY=your-alpaca-key
ALPACA_SECRET_KEY=your-alpaca-secret
BINANCE_API_KEY=your-binance-key
BINANCE_SECRET_KEY=your-binance-secret
IB_USERNAME=your-ib-username
IB_PASSWORD=your-ib-password
COINBASE_API_KEY=your-coinbase-key
COINBASE_SECRET=your-coinbase-secret

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-claude-key
DEEPSEEK_API_KEY=your-deepseek-key

# Market Data
POLYGON_API_KEY=your-polygon-key
FINNHUB_API_KEY=your-finnhub-key
ALPHA_VANTAGE_KEY=your-alphavantage-key

# Social Media
DISCORD_WEBHOOK_URL=your-discord-webhook
TELEGRAM_BOT_TOKEN=your-telegram-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
TWITTER_API_KEY=your-twitter-key
TWITTER_API_SECRET=your-twitter-secret
SENDGRID_API_KEY=your-sendgrid-key

# Backup Services
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=auraquant-backups
GOOGLE_DRIVE_CLIENT_ID=your-google-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-secret

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret
ALLOWED_IPS=52.89.214.238,34.212.75.30,54.218.53.128,52.32.178.7
```

### 3. Backend File Structure

Ensure your backend repository has this structure:

```
backend/
├── app.py                 # Main FastAPI application
├── requirements.txt       # Python dependencies
├── api/
│   ├── __init__.py
│   ├── auth.py           # Authentication endpoints
│   ├── trading.py        # Trading endpoints
│   ├── bot.py            # Bot control endpoints
│   ├── webhooks.py       # Webhook handlers
│   └── websocket.py      # WebSocket handlers
├── brokers/
│   ├── __init__.py
│   ├── base.py           # Base broker interface
│   ├── alpaca.py         # Alpaca integration
│   ├── binance.py        # Binance integration
│   ├── interactive.py    # IB integration
│   └── coinbase.py       # Coinbase integration
├── core/
│   ├── __init__.py
│   ├── bot_engine.py     # Infinity bot engine
│   ├── risk_manager.py   # Risk management
│   ├── compliance.py     # Compliance checks
│   └── target_manager.py # Target management
├── strategies/
│   ├── __init__.py
│   ├── quantum_infinity.py
│   └── backtest_engine.py
├── models/
│   ├── __init__.py
│   └── database.py       # Database models
├── utils/
│   ├── __init__.py
│   ├── auth.py           # Auth utilities
│   └── helpers.py        # Helper functions
└── config/
    ├── __init__.py
    └── settings.py        # Configuration
```

### 4. Database Setup

#### Option A: Use Render PostgreSQL
1. In Render Dashboard, create a PostgreSQL database
2. Copy the connection string
3. Add as `DATABASE_URL` environment variable

#### Option B: Use External Database
1. Set up PostgreSQL on your preferred provider
2. Add connection string as environment variable

### 5. Backend Startup Script

Update `backend/app.py` to include CORS for your frontend:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="AuraQuant Backend")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://auraquant.pages.dev",  # Your Cloudflare Pages URL
    "https://auraquant.com",         # Your custom domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6. Webhook Configuration

Your backend automatically handles webhooks at:
- TradingView: `https://YOUR-SERVICE.onrender.com/api/webhooks/tradingview`
- Plus500: `https://YOUR-SERVICE.onrender.com/api/webhooks/plus500`
- Broker fills: `https://YOUR-SERVICE.onrender.com/api/webhooks/fills`

### 7. WebSocket Connection

The frontend will automatically connect to:
```
wss://YOUR-SERVICE.onrender.com/ws
```

No additional configuration needed - just ensure WebSocket support is enabled in Render.

## 🔧 Testing the Connection

### 1. Check Backend Health
```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "∞",
  "timestamp": "2024-12-19T09:00:00Z"
}
```

### 2. Test WebSocket
Open browser console and run:
```javascript
const ws = new WebSocket('wss://YOUR-SERVICE.onrender.com/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### 3. Frontend Connection Test
1. Open your frontend locally
2. Check browser console for:
   - "✅ Configuration loaded successfully"
   - "✅ Connected to backend API"
   - "✅ WebSocket connected"

## 📊 Monitoring

### Render Dashboard
- View logs: Dashboard → Your Service → Logs
- Monitor metrics: Dashboard → Your Service → Metrics
- Check deploys: Dashboard → Your Service → Events

### Custom Monitoring
Your backend includes endpoints for:
- `/api/metrics` - Performance metrics
- `/api/health` - Health check
- `/api/status` - System status

## 🚨 Troubleshooting

### Frontend Can't Connect
1. Check `config.js` has correct Render URL
2. Verify backend is running in Render dashboard
3. Check browser console for CORS errors
4. Ensure HTTPS/WSS protocols are used

### WebSocket Issues
1. Verify WSS URL is correct
2. Check Render supports WebSocket (it does by default)
3. Look for connection errors in browser console

### API Key Issues
1. Verify all environment variables are set in Render
2. Check backend logs for missing keys
3. Ensure keys have correct permissions

### Database Connection
1. Verify DATABASE_URL is correct
2. Check database is accessible from Render
3. Run migrations if needed

## 🔐 Security Notes

1. **Never commit API keys** - Use Render environment variables
2. **Enable HTTPS** - Render provides this automatically
3. **IP Whitelisting** - Configure for webhooks
4. **Rate Limiting** - Implemented in backend
5. **Authentication** - JWT tokens for API access

## 📝 Deployment Checklist

- [ ] Backend repository pushed to GitHub
- [ ] Render service created and connected
- [ ] Environment variables configured
- [ ] Database connected
- [ ] Frontend config.js updated with Render URL
- [ ] CORS origins include your frontend URLs
- [ ] Health check endpoint responding
- [ ] WebSocket connection working
- [ ] Webhook endpoints accessible
- [ ] API keys and secrets secured
- [ ] Monitoring setup
- [ ] Error logging configured

## 🚀 Go Live!

Once everything is configured:

1. Your backend is automatically running on Render
2. Frontend connects directly to Render backend
3. No local backend server needed
4. Updates deploy automatically when you push to GitHub

## Need Help?

- Render Documentation: https://render.com/docs
- FastAPI Documentation: https://fastapi.tiangolo.com
- Check backend logs in Render dashboard
- Frontend errors appear in browser console

---

**Remember**: Your backend is hosted on Render. The frontend connects to it remotely. You only need to run the frontend locally or deploy it to Cloudflare Pages.
