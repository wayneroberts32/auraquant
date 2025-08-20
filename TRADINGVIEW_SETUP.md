# TradingView Webhook Setup Guide

## Complete Setup for TradingView → AuraQuant → Discord/Telegram → Manual Trading

### Step 1: Backend Webhook Endpoint

Your webhook endpoint is already configured at:
```
https://auraquant-backend.onrender.com/webhook/tradingview
```

### Step 2: TradingView Alert Setup

#### A. Create a Pine Script Strategy/Indicator

```pinescript
//@version=5
indicator("AuraQuant Signal Generator", overlay=true)

// Example strategy conditions
ema_fast = ta.ema(close, 9)
ema_slow = ta.ema(close, 21)

// Buy signal
buy_signal = ta.crossover(ema_fast, ema_slow)

// Sell signal  
sell_signal = ta.crossunder(ema_fast, ema_slow)

// Plot signals
plotshape(buy_signal, "Buy", shape.labelup, location.belowbar, color.green, text="BUY")
plotshape(sell_signal, "Sell", shape.labeldown, location.abovebar, color.red, text="SELL")

// Alert conditions
alertcondition(buy_signal, "Buy Signal", "Buy Signal Detected")
alertcondition(sell_signal, "Sell Signal", "Sell Signal Detected")
```

#### B. Create Alert in TradingView

1. **Click on the Alert button (clock icon) in TradingView**

2. **Configure Alert Settings:**
   - **Condition:** Select your indicator/strategy and signal
   - **Options:** Once Per Bar Close
   - **Expiration:** Set as needed

3. **Alert Actions:**
   - ✅ **Webhook URL:** 
     ```
     https://auraquant-backend.onrender.com/webhook/tradingview
     ```

4. **Alert Message (JSON Format):**

For **BUY Signal**:
```json
{
  "symbol": "{{ticker}}",
  "action": "BUY",
  "price": {{close}},
  "time": "{{time}}",
  "exchange": "{{exchange}}",
  "volume": {{volume}},
  "strategy": "EMA_Cross",
  "timeframe": "{{interval}}",
  "confidence": 85,
  "stop_loss": {{low}},
  "take_profit": {{high}},
  "requires_manual": true,
  "broker": "NAB",
  "message": "EMA crossover buy signal on {{ticker}}"
}
```

For **SELL Signal**:
```json
{
  "symbol": "{{ticker}}",
  "action": "SELL", 
  "price": {{close}},
  "time": "{{time}}",
  "exchange": "{{exchange}}",
  "volume": {{volume}},
  "strategy": "EMA_Cross",
  "timeframe": "{{interval}}",
  "confidence": 85,
  "stop_loss": {{high}},
  "take_profit": {{low}},
  "requires_manual": true,
  "broker": "NAB",
  "message": "EMA crossunder sell signal on {{ticker}}"
}
```

### Step 3: Webhook Security

Add to your webhook message for authentication:
```json
{
  "token": "MzMxMjFhMTAtYTk4Ni00OWE0LTgwNDItNTg4M2RhYzFjMWRl",
  "symbol": "{{ticker}}",
  ...
}
```

### Step 4: Signal Flow

```
TradingView Alert
    ↓
Webhook to Backend
    ↓
Backend Processing
    ↓
Notifications Sent
    ├── Discord Channel
    ├── Telegram Bot
    └── Frontend Dashboard
    ↓
Manual Execution
    ├── NAB Trading
    └── Plus500 WebTrader
```

### Step 5: Testing Your Setup

#### Test Webhook Manually:

```bash
# Windows PowerShell
$body = @{
    token = "MzMxMjFhMTAtYTk4Ni00OWE0LTgwNDItNTg4M2RhYzFjMWRl"
    symbol = "AAPL"
    action = "BUY"
    price = 150.50
    confidence = 90
    strategy = "Test"
    requires_manual = $true
    broker = "NAB"
    message = "Test signal from manual webhook"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://auraquant-backend.onrender.com/webhook/tradingview" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

```bash
# Linux/Mac
curl -X POST https://auraquant-backend.onrender.com/webhook/tradingview \
  -H "Content-Type: application/json" \
  -d '{
    "token": "MzMxMjFhMTAtYTk4Ni00OWE0LTgwNDItNTg4M2RhYzFjMWRl",
    "symbol": "AAPL",
    "action": "BUY",
    "price": 150.50,
    "confidence": 90,
    "strategy": "Test",
    "requires_manual": true,
    "broker": "NAB",
    "message": "Test signal"
  }'
```

### Step 6: Common Alert Strategies

#### 1. **Moving Average Cross**
```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "strategy": "MA_Cross",
  "ma_fast": {{plot_0}},
  "ma_slow": {{plot_1}}
}
```

#### 2. **RSI Oversold/Overbought**
```json
{
  "symbol": "{{ticker}}",
  "action": "BUY",
  "strategy": "RSI_Oversold",
  "rsi_value": {{plot("RSI")}},
  "condition": "oversold"
}
```

#### 3. **Breakout Strategy**
```json
{
  "symbol": "{{ticker}}",
  "action": "BUY",
  "strategy": "Breakout",
  "breakout_level": {{high}},
  "volume_surge": {{volume}} > {{plot("AvgVolume")}}
}
```

#### 4. **Multiple Timeframe Confirmation**
```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "strategy": "MTF_Confirmation",
  "timeframes": ["1h", "4h", "1d"],
  "confidence": 95
}
```

### Step 7: Plus500 Integration

Since Plus500 doesn't have an API, signals will:
1. Send notification to Discord/Telegram
2. Display in frontend dashboard
3. You manually execute on Plus500 WebTrader

**Plus500 Alert Format:**
```json
{
  "symbol": "{{ticker}}",
  "action": "BUY",
  "broker": "Plus500",
  "requires_manual": true,
  "plus500_link": "https://app.plus500.com/trade?symbol={{ticker}}",
  "message": "Open Plus500 and place {{strategy.order.action}} order for {{ticker}}"
}
```

### Step 8: NAB Integration

For NAB manual trading:
```json
{
  "symbol": "{{ticker}}.AX",
  "action": "BUY",
  "broker": "NAB",
  "requires_manual": true,
  "quantity": 100,
  "order_type": "LIMIT",
  "limit_price": {{close}},
  "message": "Login to NAB and place order"
}
```

### Step 9: Crypto Alerts (Binance)

For automated crypto trading:
```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "broker": "Binance",
  "requires_manual": false,
  "quantity": 0.01,
  "order_type": "MARKET",
  "message": "Automated Binance trade"
}
```

### Step 10: Monitoring & Logs

Check webhook reception:
1. **Backend Logs:** `https://dashboard.render.com/web/srv-d1r5mmodl3ps73f3mdog/logs`
2. **Discord Channel:** Check channel ID 1407369896089616635
3. **Frontend Dashboard:** Login to see signals
4. **Telegram Bot:** Check @YourBotName

### Troubleshooting

#### Webhook Not Received:
- Check TradingView alert is active
- Verify webhook URL is correct
- Check Render service is running
- Review IP whitelist settings

#### Notifications Not Sent:
- Verify Discord bot is online
- Check Telegram bot token
- Ensure channel IDs are correct
- Review notification settings

#### Manual Trading Issues:
- Ensure NAB/Plus500 accounts are logged in
- Check market hours
- Verify symbol format (e.g., .AX for ASX)

### Alert Management Commands

**Discord Commands:**
```
!status - Check bot status
!alerts pause - Pause all alerts
!alerts resume - Resume alerts
!balance - Check account balance
!positions - View open positions
```

**Telegram Commands:**
```
/start - Start bot
/status - Check status
/alerts - View active alerts
/pause - Pause notifications
/resume - Resume notifications
```

### Best Practices

1. **Start with Paper Trading**
   - Test signals thoroughly
   - Verify notification flow
   - Practice manual execution

2. **Risk Management**
   - Set stop losses in alerts
   - Use position sizing
   - Monitor drawdown limits

3. **Alert Frequency**
   - Avoid too many alerts
   - Focus on high-confidence signals
   - Use different timeframes

4. **Security**
   - Keep webhook token secret
   - Use HTTPS only
   - Rotate tokens regularly

### Support

For issues:
- Check backend logs
- Review Discord/Telegram messages
- Test with manual webhook
- Contact support with error details
