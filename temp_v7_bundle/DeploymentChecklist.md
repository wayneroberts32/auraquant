# AuraQuant V7 – Deployment Checklist ✅

## 1. Preparation
- [ ] Load `Warp_AI_Master_Prompt_v7.txt`
- [ ] Configure `.env` from `AuraQuant_V7_env.sample`
- [ ] Verify file structure `AuraQuant_V7_build_file_tree.txt`

## 2. Build
- [ ] Assemble backend (Render) + frontend (Cloudflare)
- [ ] Integrate MongoDB
- [ ] Connect WebSockets + Webhooks

## 3. Test
- [ ] Run full `ReadinessReport.md`
- [ ] Health check (latency, spread, slippage, uptime)
- [ ] Compliance sync (AML/KYC, tax)

## 4. Deploy
- [ ] Deploy backend → Render
- [ ] Deploy frontend → Cloudflare
- [ ] Confirm DB sync → MongoDB

## 5. Explain
- [ ] Generate `ExplainabilityReport.md`
- [ ] Generate `ComplianceReport.md`
- [ ] Log symbolic overlays in Codex

## 6. Trade
- [ ] Enable paper/live mode (manual check)
- [ ] Verify broker balances (no margin, overdraft, borrowing)
- [ ] Monitor fallback feeds (TradingView, Plus500, DexScreener, Pump.fun)
- [ ] Confirm Perth time + exchange time alignment

## 7. After Deployment
- [ ] Generate post-deploy `ReadinessReport.md`
- [ ] Archive logs in Codex
- [ ] Notify Wayne (Telegram + Email)
