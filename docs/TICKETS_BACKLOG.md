# MailKit — Tickets Backlog

## ✅ Completed
- #1 Feasibility Spike

## 🔨 MVP v1 (build now, 3-4 weeks total)
- #2 Production scaffold (in progress)
- #3 Auth + Google OAuth flow
- #4 Setup pipeline backend (Cloudflare + Brevo in TS)
- #5 Onboarding UI wizard
- #6 Gmail Send-As guided step UI
- #7 Lemon Squeezy payment ($5 single SKU)
- #11 Landing copy polish + demo video

## 🚫 Post-validation (do NOT build until ≥100 paying users or explicit architect approval)
- #8 Self-serve diagnostics & re-setup flow
- #9 Deliverability monitoring subscription
- #10 3-mailbox bundle SKU ($12)
- #12 Chrome Extension for Gmail step
- #13 Workspace-only automation (Phase B)
- #14 White-label for agencies
- #15 Multi-domain dashboard

## 🧹 Tech debt
- [#6](https://github.com/borisk85/mailkit/issues/6) Tighten waitlist insert via anon key + RLS INSERT policy (switch off service_role for public form)
- Проверить Vercel Framework Preset = Next.js при каждом мажорном
  merge в main (автоматизировать через GitHub Action в будущем)
