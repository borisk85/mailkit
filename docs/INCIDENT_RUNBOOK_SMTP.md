# MailKit — SMTP Incident Runbook (AWS SES architecture)

Operational runbook на случай отказа SMTP backend (SES tenant suspension,
account-level issue, region downtime, ротация credentials). Файл для
архитектора/dev'а — что делать по шагам когда инцидент случается.

Не для юзеров. Юзерам — секция "User responsibilities" в ToS.

Updated 2026-04-29 после migration с Brevo на AWS SES Tenant Management.

---

## Trigger conditions (когда запускается этот runbook)

**Tenant-level (single customer):**
1. CloudWatch alarm — bounce rate > 3% либо complaint rate > 0.1%
   на конкретном tenant'е.
2. SES tenant suspension notification (email от AWS).
3. Spike send-failures > 10% в течение 30 минут на конкретном tenant'е.

**Account-level (все customers):**
4. AWS SES account suspension либо downgrade reputation на entire account.
5. SES region outage в primary region (us-east-1).
6. Account-level SendingPaused metric flag.
7. AWS billing-related account hold.

Tenant-level incidents — частые, mitigation автоматизирована (suspend
конкретный tenant, остальные не затронуты). Account-level — редкие,
требуют region failover.

---

## Phase 1: Detection и triage (T+0 до T+15 min)

1. CloudWatch alarms триггерят SNS → Sentry alert + Telegram bot
   notification на owner.
2. Подтвердить scope — tenant-level либо account-level через AWS SES
   Console (Account dashboard → Reputation metrics).
3. Если tenant-level — automated tenant suspension flow срабатывает,
   incident closed без user notification (только affected customer
   получает email о suspension с описанием причины и appeal flow).
4. Если account-level — переход к Phase 2.

## Phase 2: Account-level backend switch (T+15 min до T+2h)

**Scenario A: Region outage (us-east-1 down).**
1. Switch backend config на secondary region (us-west-2) — environment
   variable `AWS_SES_REGION` change на нашем backend.
2. Re-issue SMTP credentials под us-west-2 SES для всех affected tenants
   (automated script: обходим tenants table, для каждого создаём IAM
   user в us-west-2, генерим access keys).
3. Обновить DKIM records в CF DNS — у us-west-2 SES tokens отличаются
   от us-east-1 tokens (automated через CF API).

**Scenario B: AWS account suspension.**
1. Контакт с AWS Support immediately (Premium Support tier рекомендуется
   для production). Описать situation, провести root cause analysis.
2. Параллельно — provision secondary AWS account (Boris держит в
   pre-approved state как DR plan).
3. Mass migration tenants на secondary account — re-create tenants,
   re-verify domains, re-issue credentials.

## Phase 3: User notification (T+2h до T+3h)

1. Mass email через работающий канал (secondary region SES либо secondary
   account) каждому пострадавшему юзеру:
   - Subject: "Action required: update your MailKit SMTP credentials"
   - Содержание: что произошло (одно предложение, без паники), новые
     credentials (host/port/login/password), deep link в Gmail Settings,
     screenshot guide на 4 шага, ссылка на support.
   - У письма high priority headers, чтобы попало в primary inbox.
2. Banner в app.getmailkit.com: красный, sticky-top, "Action required:
   update SMTP credentials. [Migrate now →]". Banner не убирается до
   подтверждения миграции.
3. Update status page (`getmailkit.com/status`): "Active incident —
   SMTP infrastructure migration in progress. Action may be required
   on your side. Check your email."
4. Twitter post через @MailKitHQ.

## Phase 4: Follow-up (T+24h до T+14d)

Каждому юзеру который не подтвердил migration:
- T+24h — reminder email
- T+72h — reminder + push в Telegram bot если подключен
- T+7d — reminder с warning что после T+14d индивидуальная помощь
  переходит в paid режим
- T+14d — final notice, banner меняется на "Your SMTP credentials are
  outdated. Email sending may not work."
- T+30d — закрываем incident, support по миграции переходит в paid
  ($15 per mailbox).

Migration confirmation tracker: юзер приходит из email на специальную
страницу `/setup/verify-migration`, мы делаем тестовый send через
обновлённые creds, если работает — флаг `migrated_at` в БД, banner
снимается.

---

## Operational requirements (что нужно построить ДО launch)

- [ ] CloudWatch alarms на bounce rate > 3% / complaint rate > 0.1% per
  tenant + SNS topic для notifications.
- [ ] SNS → Sentry integration для alert routing.
- [ ] Telegram bot notification на owner при alarm trigger.
- [ ] Encrypted storage SMTP credentials per tenant в БД.
- [ ] Скрипт массового создания SES tenants + identities в secondary
  region (для Scenario A).
- [ ] Скрипт обновления DKIM в CF DNS per tenant (после region switch).
- [ ] Email templates (EN) для migration notice + 4 follow-up'а.
- [ ] Banner UI компонент в app.getmailkit.com с sticky-top, dismissable
  только после migration verification.
- [ ] Status page минимальная (`/status`) — даже статичная заглушка для
  launch, полноценная (UptimeRobot/Better Stack) post-launch.
- [ ] Page `/setup/verify-migration` с автоматическим тестовым send.
- [ ] Twitter @MailKitHQ настроен и готов к incident posting.
- [ ] AWS Premium Support tier подключен (для timely response при account
  level issues).
- [ ] Secondary AWS region (us-west-2) pre-configured (Tenant Management
  enabled, IAM роли созданы, готов к activation).

Всё что ⬜ — должно быть готово до Product Hunt launch.

---

## Tenant-level automated suspension (default flow)

При срабатывании CloudWatch alarm на single tenant:

1. Backend cron (каждые 5-10 мин) видит alarm state.
2. Automated `suspendTenant(tenantId, reason)` call — pause SMTP sending
   для конкретного tenant'а через SES API.
3. Email customer'у: "Your sender domain is paused due to deliverability
   issues. Reason: [bounce rate / complaint rate / abuse pattern]. Appeal:
   reply to this email with explanation."
4. Audit row в `abuse_events` table с full context.
5. Owner notification через Telegram bot.
6. **Other tenants — продолжают работать без изменений.** Это главное
   преимущество SES Tenant Management vs старая Brevo архитектура.

Customer может оспорить через support@getmailkit.com. Owner проверяет
case, либо разблокирует через `unsuspendTenant(tenantId)` либо
подтверждает permanent suspension.

---

## Legal protection (через ToS)

Юридическая защита от исков если юзер игнорит migration notice:

1. ToS clause "User responsibility on operational notices" — 14-дневный
   срок на действие после уведомления.
2. ToS clause "Liability cap" — наша ответственность ограничена суммой
   оплаты ($5 per mailbox).
3. Checkout consent checkbox — обязательный до оплаты. Сохраняем
   timestamp в `purchases.consent_accepted_at`.
4. ToS clause "Force majeure" для AWS-side outages (region failures,
   account suspensions вне нашего контроля).
5. ToS clause "Acceptable Use Policy" — anti-spam, anti-phishing, авто
   suspension при нарушении без возврата setup fee.

Тексты — в директиве на ветку `feat/smtp-dependency-disclosure` (rebased
поверх `feat/ses-backend-swap` и `feat/remove-russian-locale`) от 2026-04-29.
Implemented в `messages/en.json` под ключом `terms.smtpDependency`,
`terms.userResponsibilitiesOnNotices`, `terms.acceptableUse`,
`checkout.consent`.

---

## Post-incident retrospective

После closure incident'а — обязательная retro в `docs/incidents/<date>.md`:
- Timeline event'ов
- Что сработало
- Что не сработало
- Action items для предотвращения повторения

---

## Auto-suspend behavior (ABUSE-4)

When `flagSuspended` fires (rate_limit or deliverability threshold crossed),
the system automatically disables the customer's Postmark SMTP server:

**Mechanism:** `postmark.suspendServer(serverId)` → `editServer` with
`SmtpApiActivated: false` via Postmark Account API. The server continues
to exist; SMTP auth fails until re-enabled. NOT destructive (≠ delete).

**Outcome logged in `abuse_events.notes`:**
- `auto_suspend_postmark_server:ok` — server disabled
- `auto_suspend_postmark_server:skipped` — no `postmark_server_id` in
  `setup_runs`, or `POSTMARK_ACCOUNT_TOKEN` env not set
- `auto_suspend_postmark_server:failed=<reason>` — API error; DB
  suspension still completed, manual Postmark action required

**False-positive risk:** Low. Thresholds (5%+ bounce, 0.1%+ complaint,
500+ msg/day rate limit) are conservative. A legit sender hitting these
is already causing deliverability damage. If owner determines false-positive:

**To unsuspend manually:**
1. Postmark Dashboard → Servers → find server by ID from `setup_runs`
2. Re-enable SmtpApiActivated (Server Settings → toggle SMTP API)
3. DB rollback: `UPDATE purchases SET suspended_at = NULL, suspension_reason = NULL WHERE id = '<purchase_id>'`
4. Notify customer via support email

**POSTMARK_ACCOUNT_TOKEN** must be set in Vercel Production env for
auto-suspend to execute. Without it, the DB flag still fires but Postmark
server stays active. Add to env var audit before launch.

---

## Review cadence

Этот runbook пересматривается:
- После каждого реального 