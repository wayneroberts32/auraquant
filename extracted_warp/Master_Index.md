# Warp Load Directive
This file contains the complete AuraQuant specification. Load and deploy directly.

**Timestamp:** 2025-09-17 00:03:22

---

# AuraQuant V8+V9 Sovereign Quantum Infinity — FINAL WARP PACKAGE

## GOLDEN RULES
1. Build strictly from this file. Ignore older prompts or files.
2. Homes: MongoDB (Atlas), Render (backend), Cloudflare Pages (frontend).
3. Enable WebSockets & Webhooks for live trading and bot redundancy.
4. Stop at Go/No-Go before live trading unless Wayne approves.
5. Always update Help Centre and Event Journal Hub.
6. Use single-tab UX, AWST (Perth) + symbol exchange clock.

---

## DEPLOYMENT SEQUENCE (MongoDB → Render → Cloudflare)

### MongoDB
- Cluster: Atlas
- Database: `auraquant`
- Collections: `users`, `trades`, `positions`, `logs`, `configs`, `bots`
- Role-based access: admin (Wayne), bot (execution)
- Env key: `MONGODB_URI`

### Render (Backend)
- Runtime: FastAPI (Python)
- Entrypoint: `uvicorn main_v8v9:app --host 0.0.0.0 --port $PORT`
- Env keys:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `ALPACA_KEY`, `ALPACA_SECRET`
  - `BINANCE_KEY`, `BINANCE_SECRET`
  - `TELEGRAM_TOKEN`
  - `DISCORD_TOKEN`
  - `BOT_ENABLED`, `BOT_AUTO_TRADE`
- Health endpoint: `/healthz`
- WebSocket endpoint: `/ws`

### Cloudflare Pages (Frontend)
- Framework: React + TypeScript
- Build: `npm ci && npm run build`
- Output: `dist`
- Env: `VITE_API_URL` → Render backend URL
- Enable WS for live updates
- Project name: `auraquant-frontend`

### Bots (Redundancy)
- Telegram + Discord bots
- Commands: `/status`, `/pause`, `/resume`, `/switch`, `/unlock`
- Mirror each other’s actions
- Log events to MongoDB

---

## AUTO LOG
- Log every action to MongoDB `logs`
- Fields: timestamp, actor, action, params, result
- On failure → halt + notify Wayne via bots

---

## UNLOCK POLICY (V9+)
- V9+ locked by default
- Unlock requires:
  - Phrase: **"meggie moo"**
  - 2FA code via Telegram/Discord bot
- Start with 10% capital, scale if ProfitFactor ≥ 1.75 & MaxDD ≤ 5%

---

## UI/GUI REQUIREMENTS
- Charts: TradingView Lightweight Charts
- Grids: AG Grid
- Indicators: Volume bars, MACD crossover
- Hotkeys: configurable
- Layouts: draggable, resizable, saved workspaces
- One-tab UX
- AWST (Perth) + symbol time displayed

---

## SAFEGUARDS
- MaxDrawdown: 5%
- SlippageThreshold: 1.2 pips → pause execution
- Spread, Latency, Liquidity guards active
- Paper trading ON by default

---

## CHECKLISTS (Flattened)

### Go/No-Go Bot Handover Checklist
- [ ] Backend deployed to Render (health OK)
- [ ] Frontend deployed to Cloudflare (build OK)
- [ ] MongoDB connected, auth OK
- [ ] Bots online (Telegram/Discord)
- [ ] Paper trading ON
- [ ] GUI charts + AG Grid render
- [ ] Risk safeguards armed
- [ ] Wayne approval: __________ Date: _________

### Deployment Readiness Report
- Backend status: __
- Frontend status: __
- DB status: __
- Bots status: __
- Safeguards: __
- Result: READY / HOLD

### Health Check
- Render /healthz: PASS/FAIL
- MongoDB ping: PASS/FAIL
- WS echo test: PASS/FAIL
- Error log scan: CLEAN/ISSUES

### GUI Validation Test
- Charts load live data
- Volume bars visible
- MACD crossover plotted
- AG Grid renders positions/orders
- Hotkeys respond
- One-tab UX enforced

### Trading Graph Validation
- Timeframe switching works
- Indicators: MACD, EMA, Bollinger
- 60fps render
- Snapshot archived in Help Centre

---

## POLICIES & MODULES

### Backend Run Fix
If backend stalls:
- Use uvicorn: `main_v8v9:app`
- Bind to `$PORT`
- Upgrade fastapi/pydantic if needed

### Manual Controls
- Pause, Resume, Paper/Live toggle
- Broker switch, Restore, Override
- All actions logged, confirmations required

### Event Journal Hub
- Logs every trade, override, safeguard trigger
- Fields: ts, actor, action, params, result
- Stored in MongoDB, permanent retention

### Broker Capital Safety
- No overdraft, no margin borrowing
- Risk per trade: ≤1%
- Max exposure: ≤25%

### Auto Upgrade Policy
- Trigger at ≥20K balance
- Upgrade infra & models
- Notify Wayne

### Compliance & Explainability
- ComplianceReportTemplate inline
- ExplainabilityReportTemplate inline
- Every trade must log "why + how"

### Bots Build Spec
- Telegram + Discord python bots
- Shared command handler
- Mirrored logging

### Help Centre
- Tutorials, FAQs, Codex viewer
- Updated after each deploy

### Business Plan & Membership
- Member_Onboarding_Guide inline
- BusinessPlan inline

---

## FINAL DELIVERY NOTE
This bundle is Warp-native (flattened). Build from this file only.

---

# SHA256SUM
Will be provided in SHA256SUM.txt
