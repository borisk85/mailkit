# MailKit — feasibility spike

SaaS для автоматической настройки корпоративной почты на домене
(Cloudflare Email Routing + Brevo SMTP + Gmail Send-As) в один flow.

Этот репо сейчас содержит только feasibility-спайк: Python-скрипт, который
доказывает что вся цепочка собирается программно через API без ручных
кликов в UI (за исключением единичного OAuth-consent в браузере).

## Что делает `python spike.py`

| Phase | Модуль | Что проверяет |
|---|---|---|
| 1 | `modules/cloudflare.py` | включает Email Routing, создает destination, routing rule, MX/SPF/DMARC |
| 2 | `modules/brevo.py` | создает sender domain, прописывает DKIM + brevo-code через Cloudflare DNS, ждет верификации |
| 3 | `modules/gmail.py` | OAuth, добавляет Send-As alias с Brevo SMTP, ищет verification email, пытается завершить верификацию |
| 4 | `modules/e2e.py` | отправляет тестовое письмо с нового адреса, ждет прихода в inbox, проверяет `spf=pass dkim=pass dmarc=pass` |

## Prerequisites

- Python 3.11+
- Домен, добавленный в Cloudflare как зона, с NS делегированием
- Brevo аккаунт
- Google Cloud Console проект с включенным Gmail API и OAuth Desktop client

## Credentials — где взять

Заполнить `.env` по шаблону `.env.example`:

| Переменная | Откуда |
|---|---|
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens → Create Custom Token. Permissions: Zone.DNS Edit + Zone.Email Routing Rules Edit + Zone.Email Routing Addresses Edit |
| `CLOUDFLARE_ZONE_ID` | главная страница зоны в Cloudflare, справа внизу |
| `BREVO_API_KEY` | app.brevo.com → SMTP & API → API Keys (v3) |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` | console.cloud.google.com → OAuth Client ID → **Desktop app** |
| `DOMAIN` | домен, который тестируем (например `mailkit-test.ru`) |
| `TARGET_EMAIL` | адрес на домене, который создаем (`hello@mailkit-test.ru`) |
| `FORWARD_TO` | Gmail, на который форвардим inbound (`user@gmail.com`) |

Google Cloud Console — важные шаги:
1. Enable Gmail API для проекта
2. OAuth consent screen → User type: External → добавить свой email в Test users
3. Credentials → Create Credentials → OAuth client ID → Application type: **Desktop app**
4. Scopes (автоматически запросятся): `gmail.settings.sharing`, `gmail.settings.basic`,
   `gmail.readonly`, `gmail.modify`, `gmail.send`

### Brevo SMTP credentials

Brevo не дает создавать SMTP credentials через API — только через UI (app.brevo.com →
SMTP & API → SMTP). Два варианта:

1. **Рекомендуется:** создать SMTP key в UI и положить в `.env`:
   ```
   BREVO_SMTP_LOGIN=<id>@smtp-brevo.com
   BREVO_SMTP_KEY=xsmtpsib-...
   ```
2. Оставить пустыми — спайк попробует использовать API key как SMTP password (fallback).
   Скорее всего не сработает для relay — это один из открытых рисков.

## Запуск

```bash
python -m venv .venv
.venv\Scripts\activate           # Windows
# source .venv/bin/activate       # Unix
pip install -r requirements.txt
python spike.py
```

При первом запуске откроется браузер для Google OAuth consent — нажать разрешить.
Токен закэшируется в `token.json`.

Повторный запуск идемпотентен: уже созданные ресурсы (DNS, routing rule, домен в
Brevo, Send-As alias) не дублируются, только проверяются.

Вывод пишется в stdout и в `spike.log`.

## ⚠️ Feasibility verdict (2026-04-20)

**Phase 1 (Cloudflare):** ✅ OK — полностью автоматизируется через API
**Phase 2 (Brevo):** ✅ OK — домен verified=True, DKIM/brevo_code записаны в Cloudflare DNS автоматически. SMTP creds fallback: `account.email` + `BREVO_API_KEY` (работает для relay, но архитектурно нужно дать юзеру UI-шаг для генерации персонального SMTP key в app.brevo.com/settings/keys/smtp).
**Phase 3 (Gmail Send-As):** ❌ **BLOCKED**
**Phase 4 (E2E):** skipped (depends on Phase 3)

### Phase 3 blocker — критично для MVP

```
HTTP 403 from gmail.users.settings.sendAs.create:
"Access restricted to service accounts that have been delegated domain-wide authority"
```

Gmail API-метод `sendAs.create` **недоступен** на личных `@gmail.com` аккаунтах —
только в Google Workspace с domain-wide delegation (админ-права домена Workspace).
Это документировано Google и подтверждено нашим тестом с bkomarov85@gmail.com.

**Следствие:** полная автоматизация добавления Send-As в Gmail через API
**невозможна** для ICP (индивидуальные фаундеры на личных Gmail). Идея MailKit
«0 кликов после OAuth» в изначальном виде не реализуема.

### Варианты развития

1. **Hybrid MVP** — оставить автоматизацию Phase 1+2, а Phase 3 сделать
   «полуручной»: сгенерировать SMTP creds, показать юзеру красивый step-by-step
   с pre-filled SMTP host/port/username/password + deep link в Gmail Settings.
   Юзер копирует 4 поля + кликает verification link. Это всё ещё быстрее и
   надёжнее чем делать всё вручную. Time-to-setup: ~3 минуты вместо 30+.

2. **Workspace-only сегмент** — таргетить агентства/small business с Google
   Workspace (у них есть admin access → domain-wide delegation работает). Но
   это меняет ICP.

3. **Альтернатива Gmail** — дать юзеру выбор: Gmail (полуручной) или создать
   отдельный IMAP/webmail ящик. Уходит от ключевого value prop «оставайся в Gmail».

**Рекомендация архитектору:** принять вариант #1 как MVP. Ручной шаг неприятен,
но он одноразовый (per-mailbox), предсказуемый и решает проблему юзера «30 минут
ада через 3 UI» → «3 минуты через 1 экран с копипастом».

## Acceptance

- Финальный лог содержит `SUCCESS: all phases green` — все 4 фазы прошли
- Либо `BLOCKED at Phase N` с описанием первой упавшей фазы
- Либо `PARTIAL: spike complete with warnings` — цепочка собралась, но часть
  шагов требует ручных действий (задокументированы в note)

## Troubleshooting

- **"no accounts visible to token"** — Cloudflare token не имеет account-level
  permissions. Пересоздать с User Details → Read или добавить Account scope.
- **"invalid_parameter" при создании домена в Brevo** — проверить формат домена
  (не URL, без пробелов, TLD обязателен).
- **Authenticate не завершается (`verified=false` после 5 мин)** — DNS еще не
  пропагировалcя. Повторный запуск через 10-15 минут.
- **verification email не приходит в inbox** — Cloudflare routing rule создан но
  не активирован (destination не verified), либо MX-записи еще не пропагировались.
- **Send-As статус остается `pending`** — Gmail API не дает ввести 9-значный код
  программно. Нужно руками кликнуть ссылку в письме (оно лежит в форвард-inbox)
  ИЛИ ввести код в Gmail Settings → Accounts → Send mail as. Скрипт извлекает
  код и ссылку и печатает их в логе.

## Out of scope

UI, БД, auth, unit-тесты, деплой, рефакторинг — всё это за рамками спайка.
Цель спайка — доказать или опровергнуть feasibility.
