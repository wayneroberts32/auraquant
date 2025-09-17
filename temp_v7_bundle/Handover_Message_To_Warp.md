# Warp Handover Instructions – AuraQuant V7 Supercharged

## Source of Truth
- Use **this bundle only** as the master baseline:
  "D:\AuraQuant_Rich_Bot\AI Prompts\AuraQuant_V7_Supercharged_Handover_Bundle_FINAL_ALL_SUMMARY.zip"
- Ignore all older prompts, partial builds, or previous bundles.

## Required Scan Folders
After loading the Final V7 bundle, Warp must scan, update, and redeploy using these directories:
- "D:\AuraQuant_Rich_Bot\AI Prompts\AuraQuant_V7_Supercharged_Handover_Bundle_FINAL_ALL_SUMMARY.zip"
- "D:\AuraQuant_Rich_Bot\TRadingView Coding"
- "D:\AuraQuant_Rich_Bot\Warriot Trading Info"
- "D:\AuraQuant_Rich_Bot\All New Updated Coding"
- "D:\AuraQuant_Rich_Bot\Errors"
- "D:\AuraQuant_Rich_Bot\Key Features"
- "D:\AuraQuant_Rich_Bot\Logos"
- "D:\AuraQuant_Rich_Bot\Synthetic_Intelligence_Bot"

## Workflow
1. **Ingest** the Final V7 Supercharged Handover Bundle.
2. **Scan** the folders listed above for existing code and assets.
3. **Update** all old code to align with Final V7 bundle.
4. **Redeploy**:
   - Backend → Render
   - Frontend → Cloudflare
   - Database → MongoDB
5. **Test** → Generate ReadinessReport.md and HealthCheck.md.
6. **Explain** → Generate ComplianceReport.md and ExplainabilityReport.md.
7. **Trade** → Enable safe trading cycle (paper/live toggle as per policy).
8. **Notify Admin (Wayne)** via Telegram/Email when deployment is live.

## Rules
- Do not strip, downgrade, or alter any file from Final V7.
- Must follow **Build → Test → Deploy → Explain → Trade** every cycle.
- Wayne (Admin God Mode) is the only authority for overrides.
