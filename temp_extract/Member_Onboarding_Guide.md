# Member Onboarding Guide – AuraQuant V7 Supercharged

## 1. Account Creation
- Each Member must create a secure login.
- Roles: **Member** (sandboxed broker), **Admin** (Wayne).
- No Member can override Admin/God Mode.

## 2. Broker Integration
- Member provides their own broker API key/secret.
- Keys stored encrypted (MongoDB vault).
- Broker sandboxed: no access to Admin balance.

## 3. Compliance
- AML/KYC check required for each Member.
- Jurisdictional rules applied per Member (ASIC, SEC, FCA, etc.).
- If compliance uncertain → deny trading + notify Admin.

## 4. Trading Rules
- Members trade only with their own broker balance.
- No margin, no borrowing, no overdraft.
- Paper/Live toggle must be explicitly enabled by Member.

## 5. Revenue Model (Future Toggle)
- Optional % revenue-sharing per Member trade.
- Configurable by Admin only.
- Audit logs generated for regulators + Members.

## 6. Audit & Transparency
- Every Member trade logged:
  - Trade details (symbol, price, broker).
  - Compliance checks applied.
  - Explainability narrative.
- Members can request audit reports.

## 7. Security
- 2FA login (Email + Telegram).
- Password reset flow per Member.
- API isolation between Members.

## 8. Admin Controls
- Admin can:
  - Add/Remove Members.
  - Suspend accounts.
  - Review compliance flags.
  - Adjust revenue-sharing model.
