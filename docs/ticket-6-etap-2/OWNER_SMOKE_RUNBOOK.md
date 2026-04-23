# Ticket #6 etap 3 — owner live smoke runbook

Делает Boris на `mailkit-test.ru`. Dev (Claude) прогоняет pre-check до
этого шага и держит preview стабильным. Формат копирует runbook #4b.

## Pre-requisites (dev закрыл до передачи Boris)

- [ ] Preview URL доступен: `https://mailkit-git-feat-ticket-6-gmail-wizard-bkomarov85-2187s-projects.vercel.app/en/app/setup` отвечает 200 + Google OAuth redirect работает (Supabase `uri_allow_list` wildcard с #4b покрывает preview автоматом).
- [ ] Env-check debug log committed (commit `3bd4f5e`). Первый вызов `prepareGmailStep` пишет в Vercel logs: `smtp_login_set:true smtp_key_len:<N> smtp_host:smtp-relay.brevo.com smtp_port:587 smtp_key_version:<N>`. Если `smtp_login_set:false` или `smtp_key_len:0` — Boris re-save в Vercel env vars, rebuild, retry.
- [ ] 20 Playwright screenshots + lh-preview.txt коммитнуты (см. PR #12).
- [ ] Second inbox для доставки теста — **внешний** (не `bkomarov85@gmail.com`). Предлагаю: Yandex / Outlook / любой ящик Boris на другом провайдере. В runbook ниже обозначаю как `<external@>`.

## Что ты делаешь (Boris)

### Фаза 0 — вход

1. Открой preview URL в том же Chrome где твой `bkomarov85@gmail.com` залогинен.
2. Нажми «Sign in with Google» → выбери свой аккаунт → дай разрешения.
3. Должен увидеть Step 1 "Paste your Cloudflare API token".

### Фаза 1 — CF + Brevo (уже работают, быстро прогоняем)

4. Вставь CF API token (тот же что для `mailkit-test.ru` в #4a/#4b smoke). Mailbox: `hello`.
5. Дожми "Start setup". Pipeline должен за ~15 сек дойти до `brevo_done` (DKIM + brevo-code уже в DNS с #4b smoke, плюс `already_authenticated` short-circuit).
6. Если upstream ошибка в CF/Brevo — стоп, пришли мне error screenshot.

### Фаза 2 — Gmail Send-As (новое, это и есть smoke)

7. На terminal panel "Email infrastructure ready" нажми **"Continue to Gmail Send-As →"**. Ожидаешь 1-2 сек "loading credentials…" → 6-шаговый wizard.
8. **Открой новую вкладку** — нужно работать в двух одновременно.
9. **Шаг 1 MailKit**: прочитай инструкцию → в новой Gmail вкладке открой ⚙ → See all settings → Accounts and Import → Send mail as → **Add another email address**.
10. **Шаг 2 MailKit**: в диалоге Gmail вбей:
    - Name: `Hello` (или что показывает MailKit шаг 2)
    - Email address: `hello@mailkit-test.ru` (скопируй copy-button'ом)
    - **Важно**: НЕ снимай галочку "Treat as an alias" (для personal Gmail так ОК; на Workspace unchecked — но у тебя personal, оставь).

    ⚠️ Отклонение от UI текста: wizard говорит "UNCHECK Treat as an alias". Это формулировка изначально из директивы (architect directive step 2). Для **personal Gmail** правильная рекомендация — **leave checked**. Напомни мне результат: Gmail пускает либо не пускает дальше, и как реагировало.

11. Нажми "Next step" в Gmail → увидишь SMTP server форму.
12. **Шаг 3 MailKit — самый ответственный**:
    - SMTP Server: скопируй `smtp-relay.brevo.com`
    - Port: `587`
    - Username: скопируй из MailKit (account email Brevo)
    - **Password**: нажми 👁 на MailKit → скопируй 64-char SMTP key → **не закрывай MailKit tab до конца!** (если закроешь — password потерян до нового `prepareGmailStep`)
    - Secured connection: TLS (preselected)
13. Нажми "Add Account" в Gmail. Gmail отправит verification code на `hello@mailkit-test.ru`.
14. **Шаг 4 MailKit**: подожди 10-30 сек. CF Email Routing форвардит `hello@mailkit-test.ru → bkomarov85@gmail.com`, письмо от Google приходит в твой inbox.
15. Открой письмо в inbox: subject "Gmail Confirmation - Send Mail as hello@mailkit-test.ru". Клик по confirmation link (или скопируй 9-digit код и вставь в Gmail диалог).
16. **Шаг 5 MailKit**: вернись на вкладку MailKit → нажми "Next: verify" на шаге 4 → на шаге 5 поставь галочку "I've added the address and verified it in Gmail" → "Finish setup".
17. Должен увидеть зеленую terminal panel "Done — you're sending from your domain".

### Фаза 3 — send-test (acceptance criterion)

18. В Gmail открой Compose. Поле "From" должно предложить выбор между твоим основным email и `hello@mailkit-test.ru`.
19. Выбери `hello@mailkit-test.ru` как From. Получатель (To): `<external@>`.
20. Subject: `MailKit smoke test #6 <timestamp>`. Body: любой текст "If you see this, MailKit works end-to-end".
21. Отправь.
22. На `<external@>` открой полученное письмо, включи Show original / View raw headers.
23. **Acceptance — все три должны быть true**:
    - From header = `Hello <hello@mailkit-test.ru>` или `hello@mailkit-test.ru`
    - SPF: **pass**
    - DKIM: **pass**
    - (бонус: DMARC: pass)

## Что прислать обратно мне

Четыре скриншота в PR комментарий:

1. **Gmail Accounts and Import tab** с `hello@mailkit-test.ru` в Send mail as списке (статус "verified" / "confirmed")
2. **Gmail Compose** с открытым From dropdown, где видно выбор `hello@mailkit-test.ru`
3. **Полученное письмо** на `<external@>` — full headers с SPF=pass + DKIM=pass + From=hello@mailkit-test.ru (Gmail: ⋮ → Show original; Yandex/Outlook: эквивалентный action)
4. **Phase timings** — просто написать текстом в комментарии:
   - CF pipeline: `<start> → cf_done` (сек)
   - Brevo pipeline: `cf_done → brevo_done` (сек, должно быть ~instant из-за already_authenticated)
   - Gmail wizard: `brevo_done → gmail_done` (мин, сколько реально ушло на 6 шагов)

## Error branches — что я делаю

- **`smtp_login_set:false` в logs** → Boris re-save env vars в Vercel Dashboard → rebuild preview → retry.
- **Prepare step вечно `gmail_instructions_shown`, не переходит в `gmail_smtp_ready`** → я читаю Vercel logs на error в `loadSmtpDisplay`, коррект env.
- **Gmail отклоняет SMTP add** с ошибкой вроде "Authentication failed" → SMTP key невалиден / revoked. Я проверяю в Brevo Dashboard → rotate key → Boris re-save Vercel env → retry.
- **Verification email не приходит в 2 мин** → CF routing issue, Boris проверяет в CF Dashboard → Email Routing → mailkit-test.ru → routing rule `hello → bkomarov85@gmail.com`. Если сломалось — restart с фазы 1.
- **Полученное письмо — DKIM=fail или SPF=fail** → наш DNS corrupted либо Brevo rotate key без обновления DNS. Я диагностирую через `dig TXT mailkit-test.ru @8.8.8.8` + Brevo Dashboard domain status.
- **Полученное письмо — "via brevo.com" в From** → домен не authenticated в Brevo. Stop, I check `GET /v3/senders/domains/mailkit-test.ru` — если `authenticated:false`, запускать Brevo re-auth.

## Cleanup после smoke

Dev (Claude) делает:

- [ ] Убрать debug log из prepareGmailStep. Отдельный commit "cleanup: remove env-check log".
- [ ] Приложить 4 скриншота Boris'а + headers в PR #12 description "Live smoke verification".
- [ ] Final LH на `?mock=gmail_done` (terminal state) для полноты — n=3 EN+RU.
- [ ] `gh pr ready 12` → ping architect.
- [ ] Post-merge SOP: 60-мин окно prod re-measure landing + TTFB, артефакт в `docs/ticket-6-post-merge/`.
