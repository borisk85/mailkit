# AWS SES Setup for Local Development

This guide covers running the SES integration layer locally.

---

## Required env vars

Copy `.env.example` entries to `.env.local`:

```
AWS_ACCESS_KEY_ID=<your-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_ACCOUNT_ID=<your-12-digit-account-id>
AWS_SES_REGION=us-east-1
```

---

## Sandbox vs Production mode

AWS SES accounts start in **sandbox mode** (default for new accounts).

| Capability | Sandbox | Production |
|---|---|---|
| Verify domain identities | ✅ | ✅ |
| Create tenants | ✅ | ✅ |
| Send emails | Only to verified recipients | Any recipient |
| Daily send quota | 200 emails/day | Starts at 50,000/day |
| CloudWatch metrics | ✅ | ✅ |

Sandbox is sufficient for all local development and integration tests.
Production access is submitted via AWS Console → SES → Account dashboard →
"Request production access" (owner action, 24-48h approval).

---

## Creating a sandbox AWS account for development

1. Go to https://aws.amazon.com/free/ → create account with a dev email
2. Enable MFA on root account (required before creating IAM users)
3. Open AWS Console → SES → Choose region `us-east-1`
4. No additional setup required — sandbox is active by default

Create the IAM user with the policy from the PR description:

```bash
# Using AWS CLI (or Console)
aws iam create-user --user-name mailkit-backend-dev
aws iam put-user-policy --user-name mailkit-backend-dev \
  --policy-name mailkit-backend-policy \
  --policy-document file://docs/iam-policy-dev.json
aws iam create-access-key --user-name mailkit-backend-dev
# → copy AccessKeyId + SecretAccessKey to .env.local
```

---

## Running smoke tests against SES sandbox

Use `mailkit-test.ru` (owned by Boris, CF zone available) or any test domain.

```bash
# Verify a test domain — triggers DKIM DNS record creation
node -e "
const ses = require('./lib/integrations/ses');
ses.createTenant('test-001').then(name => console.log('tenant:', name));
"
```

Or run the full integration test suite (uses mocks, no real SES calls):

```bash
pnpm test lib/integrations/ses.test.ts
```

---

## Smoke test e2e flow (real SES sandbox)

This requires a domain you control (can add DNS records to):

```bash
# 1. Create tenant
# 2. Create email identity — get back 3 CNAME + 1 TXT records
# 3. Add those records to the domain DNS
# 4. Poll until DkimAttributes.Status == "SUCCESS" (5–30 min)
# 5. Create SMTP credentials
# 6. Test SMTP send via nodemailer to a verified recipient address
```

Script: `scripts/smoke-test-ses.mjs` (create separately when needed).

---

## CloudWatch metrics (local debugging)

SES emits per-domain metrics to `AWS/SES` namespace automatically once
domain is verified and sending starts. No additional setup required.

View in AWS Console:
- CloudWatch → Metrics → AWS/SES → MailFromDomain → select domain

Or via CLI:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Bounce \
  --dimensions Name=MailFromDomain,Value=yourdomain.com \
  --start-time 2026-04-30T00:00:00Z \
  --end-time 2026-05-01T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

---

## IAM policy correction (important)

The initial IAM policy JSON in the PR commit used `sesv2:*` action prefixes.
**AWS SES IAM uses `ses:*` for both v1 and v2 operations.** If you see
`AccessDeniedException` on SES calls, update the policy to use `ses:` not
`sesv2:`.

Correct action prefixes:
- `ses:CreateEmailIdentity` (not `sesv2:CreateEmailIdentity`)
- `ses:GetEmailIdentity`
- `ses:DeleteEmailIdentity`
- `ses:SendEmail` / `ses:SendRawEmail`
- `ses:PutAccountSendingAttributes`

Tenant Management actions may use `ses:CreateTenant` etc. — verify in
AWS IAM policy simulator if AccessDeniedException occurs on tenant calls.
