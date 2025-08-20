# AuraQuant Backend API

## Professional Live Trading Platform Backend

This is the backend API for AuraQuant Infinity trading platform, featuring:
- 🤖 Infinity Bot Engine with V1 to V∞ modes
- 📊 Multi-broker integration (Alpaca, Binance, IB, Coinbase, NAB)
- 🎯 Advanced risk management with 2% max drawdown
- 🔄 Real-time WebSocket connections
- 🪝 Webhook support for TradingView & Plus500
- 🤖 AI integration (GPT-4, Claude, DeepSeek)
- 📱 Social media broadcasting
- ✅ Regulatory compliance (ASIC, SEC, MiFID II)

## 🚀 Deployment on Render

### Prerequisites
- Render account
- GitHub repository
- API keys for brokers and services

### Deploy to Render

1. Push this code to GitHub
2. Create new Web Service on Render
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

### Environment Variables

Set these in Render Dashboard:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/dbname

# Security
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

# Brokers
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
BINANCE_API_KEY=
BINANCE_SECRET_KEY=
IB_USERNAME=
IB_PASSWORD=
COINBASE_API_KEY=
COINBASE_SECRET=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=

# Market Data
POLYGON_API_KEY=
FINNHUB_API_KEY=
ALPHA_VANTAGE_KEY=

# Social Media
DISCORD_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TWITTER_API_KEY=
TWITTER_API_SECRET=
SENDGRID_API_KEY=

# Webhook Security
WEBHOOK_SECRET=
ALLOWED_IPS=52.89.214.238,34.212.75.30,54.218.53.128,52.32.178.7
```

## 📡 API Endpoints

### Bot Control
- `POST /api/bot/start` - Start bot with mode selection
- `POST /api/bot/stop` - Stop bot
- `POST /api/bot/pause` - Pause trading
- `POST /api/bot/resume` - Resume trading
- `POST /api/bot/emergency-stop` - Emergency stop all positions
- `GET /api/bot/status` - Get bot status

### Trading
- `POST /api/orders` - Place order
- `DELETE /api/orders/{order_id}` - Cancel order
- `GET /api/positions` - Get positions
- `POST /api/positions/{symbol}/close` - Close position

### Webhooks
- `POST /api/webhooks/tradingview` - TradingView alerts
- `POST /api/webhooks/plus500` - Plus500 signals
- `POST /api/webhooks/fills` - Broker fill notifications

### WebSocket
- `WS /ws` - Real-time data stream

## 🔧 Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/auraquant-backend.git
cd auraquant-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your keys
cp .env.example .env

# Run development server
uvicorn app:app --reload --port 8000
```

## 🏗️ Architecture

```
backend/
├── app.py              # Main FastAPI application
├── core/
│   ├── bot_engine.py   # Bot trading engine
│   ├── infinity_engine.py # Infinity precision engine
│   ├── risk_manager.py # Risk management
│   └── target_manager.py # Target & goals
├── brokers/
│   ├── base_broker.py  # Base broker interface
│   ├── alpaca_broker.py
│   ├── binance_broker.py
│   └── ...
├── strategies/
│   └── quantum_infinity.py # Advanced strategies
├── webhooks/
│   └── webhook_handler.py # Webhook processing
├── compliance/
│   └── compliance.py   # Regulatory compliance
└── models/
    └── database.py     # Database models
```

## 🔒 Security

- JWT authentication
- IP whitelisting for webhooks
- Rate limiting
- HTTPS/WSS only in production
- Environment variables for secrets

## 📊 Monitoring

- Health check: `/api/health`
- Metrics: `/api/metrics`
- Status: `/api/status`

## 🤝 Support

For issues or questions:
- Check logs in Render Dashboard
- Review error messages
- Ensure all API keys are set

## 📄 License

Proprietary - AuraQuant © 2024
