# AuraQuant Platform Deployment Guide

## 🚀 Quick Start

### Windows Users
```powershell
# Run as Administrator
.\deploy.ps1
```

### Linux/Mac Users
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📋 Prerequisites

1. **Required Software**
   - Git
   - Node.js (v18+)
   - Python (3.10+)
   - PostgreSQL (for local development)
   - Redis (for local development)

2. **Required Accounts**
   - [Render Account](https://render.com) - Backend hosting
   - [Cloudflare Account](https://cloudflare.com) - Frontend hosting
   - GitHub/GitLab account - Version control

3. **API Keys Required**
   - **Trading**: Binance, Crypto.com, Independent Reserve, Alpaca
   - **AI**: OpenAI API
   - **Data**: News API, CoinGecko, CoinMarketCap
   - **Social**: Discord Bot Token, Telegram Bot Token, Twitter API
   - **Webhooks**: TradingView webhook secret

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare CDN                     │
│                  (Frontend Hosting)                  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Cloudflare Workers                      │
│         (Edge Computing & Caching)                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                   Render.com                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │   API      │  │  Workers   │  │  Webhooks  │     │
│  │  Service   │  │  Service   │  │  Service   │     │
│  └────────────┘  └────────────┘  └────────────┘     │
│        │              │                │              │
│        └──────────────┴────────────────┘              │
│                       │                               │
│         ┌─────────────┴──────────────┐               │
│         │                            │               │
│    ┌─────────┐              ┌─────────────┐         │
│    │PostgreSQL│              │    Redis    │         │
│    └─────────┘              └─────────────┘         │
└──────────────────────────────────────────────────────┘
```

## 🔧 Step-by-Step Deployment

### Step 1: Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/auraquant.git
cd auraquant
```

2. **Create environment file**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
cd ..
```

### Step 2: Backend Deployment (Render)

1. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the `render.yaml` file
   - Click "Apply"

3. **Configure Environment Variables**
   - In Render dashboard, go to your service
   - Click "Environment" tab
   - Add all required API keys:
```
BINANCE_API_KEY=your_key_here
BINANCE_API_SECRET=your_secret_here
CRYPTO_COM_API_KEY=your_key_here
CRYPTO_COM_API_SECRET=your_secret_here
INDEPENDENT_RESERVE_API_KEY=your_key_here
INDEPENDENT_RESERVE_API_SECRET=your_secret_here
OPENAI_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
DISCORD_BOT_TOKEN=your_token_here
TELEGRAM_BOT_TOKEN=your_token_here
TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_secret_here
ALPACA_API_KEY=your_key_here
ALPACA_API_SECRET=your_secret_here
COINMARKETCAP_API_KEY=your_key_here
COINGECKO_API_KEY=your_key_here
TRADINGVIEW_WEBHOOK_SECRET=your_secret_here
JWT_SECRET=generate_random_string_here
ENCRYPTION_KEY=generate_random_string_here
```

### Step 3: Frontend Deployment (Cloudflare)

1. **Login to Cloudflare**
```bash
wrangler login
```

2. **Configure Cloudflare**
   - Edit `wrangler.toml`
   - Add your account ID and zone ID

3. **Deploy to Cloudflare**
```bash
wrangler deploy --env production
```

4. **Add Secrets to Cloudflare**
```bash
wrangler secret put ALPACA_API_KEY
wrangler secret put BINANCE_API_KEY
wrangler secret put BINANCE_API_SECRET
wrangler secret put OPENAI_API_KEY
# Add all other secrets...
```

### Step 4: Configure Webhooks

1. **TradingView Webhook Setup**
   - In TradingView, create a new alert
   - Set webhook URL: `https://auraquant-webhooks.onrender.com/webhook/tradingview`
   - Use JSON format in alert message:
```json
{
  "ticker": "{{ticker}}",
  "exchange": "{{exchange}}",
  "price": {{close}},
  "action": "buy",
  "strategy": "your_strategy"
}
```

2. **Broker Webhooks**
   - Configure webhook URLs in your broker settings
   - Add IP whitelist if required

### Step 5: DNS Configuration

1. **Point domain to Cloudflare**
   - Add Cloudflare nameservers to your domain registrar
   - Configure DNS records in Cloudflare:
```
Type  Name           Value
A     @              192.0.2.1 (Cloudflare proxy)
A     www            192.0.2.1 (Cloudflare proxy)
CNAME api            auraquant-backend.onrender.com
CNAME webhooks       auraquant-webhooks.onrender.com
```

## 🔐 Security Configuration

### Login System
The platform includes a secure login system with:
- JWT authentication
- Session management
- 2FA support (optional)
- IP whitelisting for webhooks

Default login credentials (change immediately):
```
Username: admin
Password: ChangeMe123!
```

### API Key Management
1. Never commit API keys to git
2. Use environment variables
3. Rotate keys regularly
4. Use different keys for dev/prod

## 🧪 Testing

### Local Testing
```bash
# Start backend
cd backend
uvicorn app:app --reload --port 8000

# Start frontend (new terminal)
npm run dev

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Production Testing
1. **Test API endpoints**
```bash
curl https://auraquant-backend.onrender.com/health
```

2. **Test WebSocket connection**
```javascript
const ws = new WebSocket('wss://auraquant-backend.onrender.com/ws');
ws.onopen = () => console.log('Connected');
```

3. **Test webhook**
```bash
curl -X POST https://auraquant-webhooks.onrender.com/webhook/tradingview \
  -H "Content-Type: application/json" \
  -d '{"ticker":"BTC/USD","price":50000,"action":"buy"}'
```

## 📊 Monitoring

### Render Dashboard
- Monitor service health
- View logs
- Check resource usage
- Set up alerts

### Cloudflare Analytics
- Monitor traffic
- Check cache hit ratio
- View security events
- Performance metrics

## 🚨 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Check logs in Render dashboard
   - Verify all environment variables are set
   - Check database connection

2. **Frontend not loading**
   - Check Cloudflare Workers logs
   - Verify wrangler.toml configuration
   - Check API endpoints in config

3. **Webhooks not working**
   - Verify webhook secret
   - Check IP whitelist
   - Review webhook logs

4. **Authentication failing**
   - Verify JWT_SECRET is set
   - Check CORS configuration
   - Ensure cookies are enabled

## 📝 Maintenance

### Regular Tasks
- [ ] Weekly: Review logs for errors
- [ ] Monthly: Update dependencies
- [ ] Monthly: Rotate API keys
- [ ] Quarterly: Security audit
- [ ] Daily: Monitor trading performance

### Backup Strategy
- Database: Daily automated backups on Render
- Configuration: Version controlled in Git
- Trading data: Exported to CSV weekly

## 🆘 Support

### Documentation
- API Docs: `https://auraquant-backend.onrender.com/docs`
- Frontend Docs: See `/help` in the platform

### Contact
- GitHub Issues: [Report bugs](https://github.com/yourusername/auraquant/issues)
- Discord: Join our server (link in platform)

## 📄 License

This project is proprietary software. All rights reserved.

---

## Next Steps After Deployment

1. **Configure Trading Settings**
   - Set risk parameters
   - Configure position sizing
   - Set up alerts

2. **Connect Brokers**
   - Add API keys in settings
   - Test paper trading first
   - Enable live trading when ready

3. **Set Up Monitoring**
   - Configure Discord/Telegram alerts
   - Set up email notifications
   - Enable push notifications

4. **Customize Strategies**
   - Import Pine Scripts to TradingView
   - Configure strategy parameters
   - Backtest before going live

Remember: **Always test with paper trading before using real money!**
