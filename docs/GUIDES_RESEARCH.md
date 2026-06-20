# Research: "Do It Yourself" Guides — Cloudflare Email + Gmail

**Date:** 2026-06-20  
**Purpose:** Understand what free guides teach users and why they are not a real competitor to MailKit.

---

## Two types of guides found

### Type 1: Gmail SMTP (majority of guides)

Use `smtp.gmail.com` with an App Password. No third-party ESP needed.

**Steps (7–8):**
1. Enable 2FA on Google account
2. Generate App Password (16-char)
3. Enable Cloudflare Email Routing + set forwarding address
4. Add SPF record in Cloudflare DNS
5. Add DMARC record (`p=none`)
6. Gmail → Settings → Accounts → Send mail as → `smtp.gmail.com` + App Password
7. Click confirmation link
8. Test

**Time:** None of these guides state an estimate.

**Sources:**
- [pradeepsingh.com — Send Mail as Gmail for Cloudflare](https://pradeepsingh.com/send-mail-as-gmail-cloudflare/) — 7 steps
- [dawid.dev — Gmail SMTP + Cloudflare Complete Guide](https://dawid.dev/dev/ops/gmail-smtp-cloudflare-email-routing-complete-guide) — 8 steps, notes 500/day Gmail limit, suggests Workspace or dedicated ESP for higher volume
- [dev.to — Use Gmail Send-As with Cloudflare Email Routing](https://dev.to/jaygooby/use-a-basic-gmail-account-to-send-mail-as-with-a-domain-that-uses-cloudflare-email-routing-89b)
- [dev.to — Custom domain emails for free](https://dev.to/evgenii_zinner/custom-domain-emails-for-free-6o5)

---

### Type 2: Cloudflare + Brevo + Gmail (fewer guides, more steps)

Use Brevo free tier as SMTP relay instead of Gmail SMTP. Brevo provides domain DKIM.

**Steps (12–14):** ~5 for Cloudflare incoming, ~4 for Brevo domain/DKIM setup, ~3–4 for Gmail Send-As.

**Time:** One guide states "20–30 minutes" (optimistic — excludes DNS propagation waits).

**Pain points reported by the guides themselves:**
- Most common error: wrong SMTP username in Gmail (users paste email instead of Brevo Login)
- Multiple DNS records (SPF, DKIM, DMARC, CNAME) — conflicts if records already exist
- Email verification delays across three separate services (Brevo, Cloudflare, Gmail)
- New domain requires gradual warm-up over weeks regardless of correct setup
- Brevo free plan: 300 emails/day limit
- Multi-service coordination: three platforms, incoming/outgoing split across different services

**Sources:**
- [agentpedia.codes — Free Custom Domain Email with Cloudflare, Brevo & Gmail (2026)](https://agentpedia.codes/blog/free-custom-domain-email-cloudflare-brevo-gmail) — 8 steps + warm-up phase, time ~20–30 min stated
- [johnstool.net — Building custom domain email service with Cloudflare and Brevo](https://johnstool.net/blog/building-custom-domain-email-service-with-Cloudflare-and-Brevo) — 12–14 steps, notes Brevo 300/day free limit

---

### Type 3: Cloudflare + Postmark

No guides found in search results for this combination. Postmark has a free developer tier but does not appear in DIY guide ecosystems.

---

## Which SMTP service do people actually use — market data

From search results (Brevo, Mailgun, emailtooltester.com, 2026):

| Service | Free limit | Audience | Notes |
|---|---|---|---|
| **Brevo** | 300/day | SMB + developers | Most guides target this; all-in-one, provides domain DKIM |
| Gmail SMTP | 500/day | Anyone with Gmail | No domain DKIM; simplest path |
| Mailgun | 100/day | Developers | "Built for developers by developers" — not SMB-friendly |
| Resend | 3,000/month | Developers | Developer-first; no guides for this use case found |
| Mailtrap | 4,000/month | Testing | Originally a testing tool, not production |

**Conclusion from data:** For the Cloudflare + Gmail Send-As use case, Brevo is the de facto standard among guides that go beyond Gmail SMTP. Gmail SMTP is the "zero-effort" fallback. No guides use Postmark for this use case despite Postmark having a free developer tier.

Sources: [Brevo — 11 Best Free SMTP Servers (2026)](https://www.brevo.com/blog/free-smtp-servers/), [emailtooltester.com — 12 Best Free SMTP Servers 2026](https://www.emailtooltester.com/en/blog/free-smtp-servers/)

---

## Key gap confirmed by the guides themselves

The Brevo+Gmail guide explicitly states: using Gmail's native SMTP causes **DKIM misalignment** → "sent via gmail.com" warnings → emails landing in spam on Outlook and corporate servers. This is why they recommend Brevo instead of Gmail SMTP.

MailKit solves this with Postmark DKIM on the user's own domain — same fix, automated.

---

## Conclusion

Free guides are not a competitor — they are a conversion opportunity. Users who attempt the Brevo path (12–14 steps, DNS errors, username confusion, multi-service coordination) are the exact audience for MailKit at $5.
