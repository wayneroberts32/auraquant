# Environment Variables for Render Deployment

Copy these environment variables to your Render service settings. 
**DO NOT commit actual values to git!**

## Required Variables

```bash
# Security Keys (generate new ones)
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here

# Database (optional for now)
DATABASE_URL=postgresql://user:password@host:port/dbname

# API Keys (from your credentials)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Discord Integration
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CHANNEL_ID=1407369896089616635

# Telegram Integration  
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id

# Trading APIs (use paper trading for testing)
ALPACA_KEY_ID=your-alpaca-paper-key
ALPACA_SECRET_KEY=your-alpaca-paper-secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Crypto Exchanges
BINANCE_API_KEY=your-binance-key
BINANCE_SECRET_KEY=your-binance-secret

# Data Providers
COINGECKO_API_KEY=your-coingecko-key
TRADINGVIEW_SESSION=your-tradingview-session

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Application Settings
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://ai-auraquant.com,https://auraquant-frontend.pages.dev
```

## How to Set on Render

1. Go to your Render service dashboard
2. Navigate to Environment > Environment Variables
3. Add each variable with its actual value
4. Click "Save Changes"
5. The service will automatically redeploy

## Generating Secret Keys

Use this PowerShell command to generate secure keys:
```powershell
-join ((1..32) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
```

Or Python:
```python
import secrets
print(secrets.token_hex(32))
```
