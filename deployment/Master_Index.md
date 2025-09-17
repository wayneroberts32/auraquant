# AuraQuant WARP FINAL DEPLOY (Flattened)

## Golden Rules
- Paper mode ON for markets by default
- Crypto only live if funded
- Zero-balance safeguard: no funds = no trades
- No overdraft, no borrowing, no margin unless explicitly enabled
- MaxDrawdown: 5%, SlippageThreshold: 1.2 pips
- V9 dormant until unlock phrase "meggie moo"

## Deployment Sequence
1. Remove old backend from Render
2. Deploy backend (FastAPI, WebSocket, trading logic) to Render
3. Remove old frontend from Cloudflare
4. Deploy React/TypeScript frontend with TradingView-style GUI to Cloudflare
5. Connect MongoDB Atlas (collections: users, trades, logs)
6. Start Telegram + Discord bots
7. Run UI, GUI, Graph validations
8. Generate DeploymentReport + HealthCheck
9. Log results to MongoDB (AUTO_LOG.md)

## Unlock Command
```
unlock bot with "meggie moo" and enable V9 live trading now
```
