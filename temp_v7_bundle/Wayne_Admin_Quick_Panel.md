# Wayne Admin Quick Panel – AuraQuant V7 Supercharged

## 🔑 Core Authority
- You = **Admin (God Mode)**
- Only you can authorize critical overrides
- Warp must obey this panel above all else

---

## 🛠️ Manual Overrides
- **Pause Trading** → `ManualControlsPolicy` → trigger `pauseExecution()`
- **Resume Trading** → `ManualControlsPolicy` → trigger `resumeExecution()`
- **Switch Broker** → `ManualControlsPolicy` → `switchBroker(<brokerID>)`
- **Force Backup** → `BackupPolicy` → `initiateBackup()`
- **Force Restore** → `DisasterRecoveryPolicy` → `restoreFromSnapshot()`

---

## 📊 Trading Mode Controls
- **Paper Trading** → `PaperTradingPolicy` → toggle ON/OFF manually
- **Live Trading** → must be explicitly toggled by you
- **Balance Adjustments** → configurable in `.env` or dashboard UI

---

## 🚨 Emergency Safeguards
- **Stop All Trades** → `circuitBreaker()` → halts instantly
- **Drawdown Breach (>2%)** → auto-halt + notify Wayne
- **Latency Breach (>150ms)** → auto-reroute or failover
- **Slippage Breach (>1.2 pips)** → cancel order

---

## 💰 Capital & Compliance
- Never margin, never borrow, never overdraft
- Auto-upgrade infra only if ≥20K balance
- Tax & FX Hub shows real-time rules + exchange rates

---

## ⏱️ Time & Sync
- Perth AWST (UTC+8) always shown as primary clock
- Exchange local time shown alongside
- Warp auto-syncs clocks with NTP servers

---

## 🩺 Health Hub Snapshot
- MongoDB [OK/FAIL]
- Render Backend [OK/FAIL]
- Cloudflare Frontend [OK/FAIL]
- WebSockets/Webhooks [OK/FAIL]
- Latency, Spread, Slippage live monitors

---

## 📝 Daily Reports (Auto-Generated)
- **ReadinessReport.md** → before every deploy
- **ComplianceReport.md** → for audits
- **ExplainabilityReport.md** → narrates each trade
- **HealthCheck.md** → heartbeat check

---

## 🔒 Password & Access
- Reset link → triggers secure reset + 2FA (Telegram + Email)
- API Keys locked in vault (MongoDB encryption)

---

## 📣 Notifications
- All alerts → Telegram + Email
- Critical system alerts → direct Wayne ping
