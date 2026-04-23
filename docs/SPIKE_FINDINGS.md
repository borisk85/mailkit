# MailKit — Spike Findings (Ticket #1)

Результаты feasibility-спайка, прогнанного 2026-04-20 на домене `mailkit-test.ru`
с личным Gmail-аккаунтом `bkomarov85@gmail.com`.

Код спайка перемещен в [`/reference/spike/`](../reference/spike/) — это справочник
для дев-тима, не продакшн-код. Продакшн будет переписан на TypeScript и портирован
в `/lib/integrations/`.

---

## Что работает полностью через API

### Cloudflare — полная автоматизация ✅

| Операция | Endpoint | Статус |
|---|---|---|
| Enable Email Routing | `POST /zones/{zone}/email/routing/enable` | OK |
| Add destination address | `POST /accounts/{id}/email/routing/addresses` | OK (требует клик по verify-ссылке) |
| Add routing rule | `POST /zones/{zone}/email/routing/rules` | OK |
| Add MX records (3 routes) | `POST /zones/{zone}/dns_records` | OK |
| Merge SPF TXT | `PUT /zones/{zone}/dns_records/{id}` | OK |
| Add DMARC TXT | `POST /zones/{zone}/dns_records` | OK |

**Подтверждение:** после прогона `dig TXT mailkit-test.ru @8.8.8.8` показывает
валидные SPF + brevo-code, `dig CNAME brevo1._domainkey.mailkit-test.ru` —
правильный DKIM target.

**Единственный ручной шаг:** верификация destination address (Cloudflare шлёт
письмо с клик-ссылкой на Gmail юзера, одноразово per destination). Для MVP это
приемлемо — юзер и так кликает «Allow» в OAuth, дополнительный клик погоды не
делает.

### Brevo — полная автоматизация ✅

| Операция | Endpoint | Статус |
|---|---|---|
| Create sender domain | `POST /v3/senders/domains` | OK |
| Получение DNS-записей (DKIM+brevo_code) из ответа | ☝️ | OK |
| Trigger authenticate | `PUT /v3/senders/domains/{domain}/authenticate` | OK (идемпотентно) |
| Poll verification status | `GET /v3/senders/domains/{domain}` | OK |
| SMTP credentials fallback | `GET /v3/account` | OK |

**Результат:** `verified=true` достигается на первой итерации polling'а после
того как DNS-записи прописаны через Cloudflare API.

### Brevo SMTP credentials — API НЕ СУЩЕСТВУЕТ (Ticket #6 pre-flight)

Нужно для Ticket #6 (Gmail Send-As wizard раздает SMTP login/key юзеру
чтобы он вбил в Gmail Settings). Я проверил developers.brevo.com +
help.brevo.com + OpenAPI spec + прогнал query в context7 по всей базе
документации — endpoint'а для programmatic create/list/rotate SMTP keys
**нет**. Управление SMTP keys полностью UI-only:
`app.brevo.com/settings/keys/smtp` → SMTP tab → "Generate a new SMTP
key". Можно сгенерировать несколько key'ев per account, но все они
account-level (не scoped к sender/domain).

Spike это уже знал. В [reference/spike/modules/brevo.py:169-199](../reference/spike/modules/brevo.py)
явный комментарий: *«Brevo не отдает SMTP key через API — только через
UI»*. Два источника SMTP credentials там: (a) env-vars
`BREVO_SMTP_LOGIN` + `BREVO_SMTP_KEY`, (b) fallback через `GET
/v3/account.email` + API key как password (исторический "master SMTP
password = API key" pattern).

**Production решение (#6):** env-only, без fallback. Owner один раз
генерит SMTP key в Brevo UI, кладет в Vercel env
(`BREVO_SMTP_HOST=smtp-relay.brevo.com`, `BREVO_SMTP_PORT=587`,
`BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, опциональный
`BREVO_SMTP_KEY_VERSION=1`). Модуль [lib/integrations/brevo-smtp.ts](../lib/integrations/brevo-smtp.ts)
читает env, возвращает display-object для UI. Shared account-level
credentials раздаются всем customer'ам — ограничения и abuse mitigations
в [docs/SECURITY.md](SECURITY.md) раздел "Shared Brevo SMTP model".

**From-address gate:** Brevo пропускает `sender.email` через domain-level
DKIM + brevo-code records, не через per-sender registration. Нашему
#4b pipeline'у достаточно `PUT /senders/domains/{d}/authenticate` +
polling до `authenticated=true`. Отдельно делать `POST /senders` (для
single-email sender verification через OTP) не требуется — это
альтернативный flow для юзеров без DNS-контроля, к нашему кейсу не
применим.

**Предупреждение следующему dev'у:** если выпрыгнет задача «давайте
генерить SMTP key per customer через API» — не трать время на поиск
endpoint'а, его нет. Либо multi-account architecture (один Brevo account
на customer, дорого и не scale'ится), либо принимаем shared model и
строим rate-limit + monitoring compensating controls.

---

## Что НЕ работает через API

### Gmail Send-As — ❌ КРИТИЧЕСКИЙ БЛОК

**Ошибка:**
```
HTTP 403 Forbidden
URL: https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs
Body: {
  "error": {
    "code": 403,
    "message": "Access restricted to service accounts that have been delegated domain-wide authority",
    "errors": [{
      "message": "Access restricted to service accounts that have been delegated domain-wide authority",
      "domain": "global",
      "reason": "forbidden"
    }]
  }
}
```

**Как воспроизвести:**
1. OAuth с scopes `gmail.settings.sharing`, `gmail.settings.basic`, `gmail.modify`, `gmail.send`, `gmail.readonly`
2. Получить валидный access token для личного `@gmail.com`
3. `POST https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs` с body `{sendAsEmail, smtpMsa: {...}}`
4. Мгновенный 403 до каких-либо проверок payload'а

**Корневая причина:** метод `gmail.users.settings.sendAs.create` в документации
Google помечен как доступный только для service accounts с domain-wide delegation.
Это конфигурация уровня Google Workspace admin — недоступна на личных @gmail.com.
Метод `users.settings.sendAs.verify` имеет то же ограничение.

**Подтверждение документацией:** https://developers.google.com/gmail/api/reference/rest/v1/users.settings.sendAs/create — секция "Authorization Scopes" + "Important" note.

**Исследованные обходы (все провалились):**

| Попытка | Результат |
|---|---|
| Скрейпинг `mail-settings.google.com` от имени юзера с OAuth-токеном в header | 401 — страница требует полноценной Gmail session cookies |
| `google-api-python-client` с разными scope-комбинациями | 403 тот же |
| Через Gmail MCP / старые Gmail IMAP подходы | Не дают программно добавлять Send-As, только читают mail |

---

## Архитектурные выводы

### Изначальная идея не реализуема в чистом виде

Value proposition «0 кликов после OAuth для индивидуального Gmail-юзера» —
**недостижим** из-за Gmail API limitation. Пересматриваем.

### Принятое решение архитектора — Hybrid MVP

Решение (2026-04-20, после спайка):

1. **MVP v1 — Hybrid flow для личных Gmail.** Автоматизируем Cloudflare + Brevo
   полностью через API. Phase 3 (Gmail Send-As) делаем полу-ручным:
   - Наш UI показывает красивый step-by-step с **уже сгенерированными** SMTP creds
   - Pre-filled значения: host `smtp-relay.brevo.com`, port `587`, username, password
   - Deep-link в `https://mail.google.com/mail/u/0/#settings/accounts`
   - Юзер копирует 4 поля → кликает verification link из своего inbox
   - **Time to setup: ~3 минуты вместо 30+.** Всё ещё ×10 быстрее и ×10 надёжнее.

2. **v2 — Workspace-segment.** Таргет агентства / SMB на Google Workspace:
   domain-wide delegation доступна через Workspace admin → полная автоматизация
   реализуется. Это отдельный flow с сегрегацией юзеров и более высокой ценой.

3. **v3 (опционально) — альтернативный мейлер.** Если будут запросы —
   давать выбор «Gmail (hybrid)» vs «встроенный webmail».

### Что это значит для scaffold'а (Ticket #2)

- UI должен быть построен вокруг пошагового wizard'а, не «нажал и готово»
- Нужен механизм показа SMTP credentials и tracking'а «юзер подтвердил что добавил»
- Будущий выбор Workspace vs Personal Gmail — флаг на user account, разводить flow'ы
- DB schema от стадии MVP должна предусматривать состояния mailbox: `pending_dns`,
  `pending_gmail_setup`, `active`, `failed`

---

## Knowledge base (неочевидные грабли)

### 1. Brevo response structure

Актуальный `POST /v3/senders/domains` возвращает **обе** схемы DKIM одновременно:

```jsonc
{
  "dns_records": {
    "dkim_record":   { "value": "", "host_name": "", ... },    // LEGACY, пустой
    "dkim1Record":   { "type": "CNAME", "value": "b1...dkim.brevo.com",
                       "host_name": "brevo1._domainkey", "status": false },
    "dkim2Record":   { "type": "CNAME", "value": "b2...dkim.brevo.com",
                       "host_name": "brevo2._domainkey", "status": false },
    "brevo_code":    { "type": "TXT", "value": "brevo-code:...",
                       "host_name": "@", "status": false },
    "dmarc_record":  { ... }  // можно игнорировать, конфликтует с нашим DMARC
  }
}
```

Context7 доки показывают только legacy `dkim_record` — реальность другая.

### 2. Brevo `host_name` форматы в одном ответе

- `"brevo1._domainkey"` — relative, без домена, без точки
- `"@"` — корень домена
- `"_dmarc"` — relative
- `"mail._domainkey."` — relative с конечной точкой (legacy)

Cloudflare DNS API **не принимает** `@` и `mail._domainkey.` — нужна нормализация
к FQDN (`brevo1._domainkey.mycompany.com`).

### 3. Brevo authenticate idempotency quirk

`PUT /v3/senders/domains/{domain}/authenticate` на уже верифицированном домене
возвращает `400 bad_request` с сообщением «cannot be authenticated». Выглядит
как ошибка, но `GET /v3/senders/domains/{domain}` показывает `verified: true`.
Игнорируем 400 на authenticate, доверяем GET.

### 4. Brevo SMTP credentials через API — нет endpoint'а

Нельзя программно сгенерировать SMTP key. Fallback: `GET /v3/account` возвращает
email аккаунта → используем его как SMTP username + Brevo API key как password.
Работает для relay. Для прода лучше заранее сгенерировать SMTP key через UI и
хранить в серверных env.

### 5. Cloudflare Email Routing destination verification

`POST /accounts/{id}/email/routing/addresses` создает destination, но routing
rule к неверифицированному destination **не сработает** — трафик роняется в
bounce. Cloudflare шлет verification email юзеру, клик по ссылке обязателен.

### 6. Google OAuth test-users gate

В test mode consent screen юзер должен быть в списке Test users, иначе
`access_denied` 403 до каких-либо действий. Для MVP нужна либо OAuth verification
(2-4 недели review), либо скрипт добавления emails в Test users при регистрации.

### 7. Cloudflare API `code: 9000 DNS name is invalid`

Появляется когда передаешь `@` или имя с финальной точкой. Всегда нормализуй
в FQDN без финальной точки.

---

## Test evidence

### Cloudflare + Brevo работают полностью

```
14:43:33 INFO [root] MailKit spike: domain=mailkit-test.ru, target=hello@mailkit-test.ru, forward=bkomarov85@gmail.com
14:43:40 INFO [modules.cloudflare] [PHASE 1] Cloudflare — done
14:43:41 INFO [modules.brevo] [PHASE 2] domain mailkit-test.ru found in Brevo (verified=True)
14:43:41 INFO [modules.brevo] [PHASE 2] add dkim1Record: CNAME brevo1._domainkey.mailkit-test.ru
14:43:42 INFO [modules.brevo] [PHASE 2] add dkim2Record: CNAME brevo2._domainkey.mailkit-test.ru
14:43:42 INFO [modules.brevo] [PHASE 2] add brevo_code: TXT mailkit-test.ru
14:43:44 INFO [modules.brevo] [PHASE 2] Brevo — done
```

### Gmail блокер воспроизводится стабильно

```
14:43:44 INFO [modules.gmail] [PHASE 3] Gmail — start
14:43:45 WARNING [googleapiclient.http] Encountered 403 Forbidden with reason "forbidden"
14:43:45 ERROR [root] [PHASE 3] FAILED: <HttpError 403 ...
  "Access restricted to service accounts that have been delegated domain-wide authority"
```

Полный лог — в PR #1 description.

---

## Ссылки

- PR #1: https://github.com/borisk85/mailkit/pull/1
- Код спайка: [`/reference/spike/`](../reference/spike/)
- Product brief: [`/BRIEF.md`](../BRIEF.md)
