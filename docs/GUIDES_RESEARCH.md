# Research: "Do It Yourself" Guides — Cloudflare Email + Gmail

**Date:** 2026-06-20  
**Purpose:** Understand what free guides teach users, their limitations, and why they are not a real competitor to MailKit.

---

## What the guides recommend

All top-ranking guides use **Gmail's own SMTP** (`smtp.gmail.com`) with an App Password — not Brevo, Mailgun, Postmark, or any third-party ESP. Reason: it's free and requires no new account.

### Typical steps (7–8)

1. Enable 2FA on Google account
2. Generate App Password (16-char, one-time)
3. Enable Cloudflare Email Routing + set forwarding address
4. Add SPF record in Cloudflare DNS
5. Add DMARC record (`p=none` — monitoring only, not enforcement)
6. Gmail → Settings → Accounts → Send mail as → enter `smtp.gmail.com` + App Password
7. Click confirmation link sent by Gmail
8. Send a test email

**Time:** None of the guides state an estimate. For a non-technical SMB user: realistically 1–2 hours with errors and re-reading.

---

## Sources

- [pradeepsingh.com — Send Mail as Gmail for Cloudflare](https://pradeepsingh.com/send-mail-as-gmail-cloudflare/) — 7 steps, Gmail SMTP
- [dawid.dev — Gmail SMTP + Cloudflare Complete Guide](https://dawid.dev/dev/ops/gmail-smtp-cloudflare-email-routing-complete-guide) — 8 steps, mentions 500 emails/day Gmail limit, suggests Workspace or dedicated ESP for higher volume
- [dev.to — Use Gmail Send-As with Cloudflare Email Routing](https://dev.to/jaygooby/use-a-basic-gmail-account-to-send-mail-as-with-a-domain-that-uses-cloudflare-email-routing-89b)
- [dev.to — Custom domain emails for free](https://dev.to/evgenii_zinner/custom-domain-emails-for-free-6o5)
- [nonprofitpress.cloud — Cloudflare + Gmail for nonprofits](https://www.nonprofitpress.cloud/guides/how-nonprofits-can-use-cloudflare-email-routing-gmail-to-send-and-receive-custom-domain-emails-for-free/)

---

## Why guides are not a real competitor — key gaps

### 1. No custom domain DKIM (biggest deliverability issue)
Gmail SMTP signs outgoing email with `@gmail.com` DKIM, **not** the user's domain DKIM. This breaks DKIM alignment. Without alignment, DMARC cannot be enforced. Spam filters trust the email less.

MailKit via Postmark sets up DKIM specifically for the user's domain — proper alignment, real deliverability.

### 2. DMARC stays at `p=none` forever
Guides set DMARC to monitoring-only (`p=none`). Users never progress to `p=quarantine` or `p=reject` because Gmail SMTP would fail those checks. Domain stays unprotected against spoofing.

### 3. App Password is fragile
Google can revoke App Passwords silently if they detect unusual activity. No warning to the user — email just stops working one day.

### 4. No error recovery, no support, no refund
If something breaks mid-setup, the user is on their own. Guides have no support channel. MailKit has auto-refund on failure + 30-day functional guarantee.

### 5. Complexity for SMB without tech background
7–8 manual steps involving DNS records, App Passwords, and SMTP configuration is a real barrier for non-technical small business owners. Each step is a potential failure point with no guidance on recovery.

### 6. "Works" ≠ "works well"
Guides solve "technically sends email." They don't address inbox delivery, DMARC enforcement, or long-term reliability. MailKit solves the complete problem.

---

## Conclusion

Free guides are not a competitor — they are a **conversion opportunity**. Users who find a guide, attempt the setup, get confused or hit a spam problem, are the exact audience for MailKit. The $5 price point vs 1–2 hours of frustrating manual work is a strong pitch.
