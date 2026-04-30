# MailKit — Strategic Risks Register

Документ фиксирует ключевые стратегические риски проекта. Не операционные
(rate limits, bug'и) — те живут в TICKETS_BACKLOG. Здесь только то что
может убить продукт целиком или критично переписать стратегию.

Обновляется по факту появления новых рисков либо при ре-оценке вероятности.
Последнее обновление: 2026-04-29.

---

## R1. Cloudflare выкатывает свой guided email setup wizard

**Вероятность:** средняя.
**Эффект:** критический — закрывает 90% нашей ценности.

**Что это значит.** Cloudflare уже владеет Email Routing (приём почты на
домене с forwarding в Gmail). У них есть техническая база и UX-команда
чтобы добавить guided wizard поверх своего сервиса: автоматизировать
DKIM/SPF/DMARC и интегрировать с Gmail Send-As через OAuth.

Если CF выпускает такой wizard внутри своего dashboard'а — наша уникальная
ценность (мы автоматизируем CF + Brevo + ведём через Gmail) исчезает.
Юзер пойдёт в CF напрямую.

**Аргументы за вероятность.** У CF большая product team, email Routing
уже есть, тренд на developer-friendly UX. Технически — недели работы для
их команды.

**Аргументы против.** Email — низкий приоритет в их portfolio (CF фокус
на DDoS/CDN/Workers). Email Routing был выпущен в 2022 и почти не
развивается с тех пор — это сигнал что приоритета нет. Также у CF нет
своего исходящего SMTP relay — им пришлось бы либо строить, либо
интегрироваться с третьим сервисом (как мы с Brevo). Для них это далеко
от core competency.

**Mitigation.**
1. Не строить весь moat на технической автоматизации CF setup'а. Добавлять
   ценность поверх — гарантия с auto-refund, мониторинг подписки $3/мес,
   bundle deals, премиум поддержка. Это всё не закроется CF wizard'ом.
2. Расширяться на не-CF DNS (v2 через ImprovMX) — снижает зависимость от
   одной платформы.
3. Build-in-public + community presence на r/cloudflare и Cloudflare
   Community forums — даёт early signal если CF начнёт двигаться в эту
   сторону, плюс шанс на partnership/featured.
4. Готовить exit strategy на случай если CF выпустит wizard: pivot на
   Workspace-сегмент (Phase B), агентства, white-label. Это другая аудитория
   которую CF wizard не закроет.

**Trigger для action.** Любой анонс Cloudflare про email automation,
Email Routing roadmap update упоминающий setup wizard, beta tests email
features в их dashboard. Мониторим Cloudflare blog и Twitter @Cloudflare,
@CloudflareDev раз в неделю.

---

## R2. AWS SES tenant suspension либо account-level issue (updated 2026-04-29)

**Вероятность:** низкая.
**Эффект:** средний — affected tenant теряет отправку, но другие tenants
продолжают работать (изолированная репутация per tenant).

**Что это значит.** В отличие от старой Brevo архитектуры (один shared
account = single point of failure для всех customers), AWS SES Tenant
Management обеспечивает изоляцию репутации. Если один customer спамит —
SES suspend'ит конкретный tenant, остальные не затрагиваются.

Account-level issue (suspension всего нашего AWS аккаунта) — крайне
редкий сценарий. SES банит entire account только за systemic abuse
patterns либо billing issues, не за одного спамера.

**Mitigation.**
1. Per-tenant abuse detection на нашей стороне — rate-limits, content
   filters, CloudWatch alarms на bounce/complaint rates per tenant.
2. **Secondary AWS region (us-west-2) как failover** для primary
   (us-east-1). При issue с primary — switch с автоматическим re-issue
   credentials.
3. Tenant suspension flow — automated на нашей стороне при detection
   abuse-patterns ДО того как SES сам среагирует. Это снижает риск
   account-level флага.
4. Billing alerts: $5/мес warning, $20/мес critical — предотвращает
   spending surprise который мог бы триггернуть billing-related suspension.

**Trigger для action.** SES warning emails, account-level reputation
metric drops в SES Console, CloudWatch alarms на bounce/complaint
thresholds.

**Operational runbook:** [INCIDENT_RUNBOOK_SMTP.md](INCIDENT_RUNBOOK_SMTP.md) —
пошаговый план incident response (detection, region switch либо tenant
re-creation, user notification, 14-day migration window, legal protection
через ToS).

## R2-legacy. Brevo bug (deprecated, kept for history)

Сохраняется в файле как контекст для будущего. Brevo был primary до
2026-04-29, заменён на AWS SES после обнаружения ToS §5.4 запрета
multi-tenant reselling. Историческая запись:

> Brevo блокирует наш shared corporate аккаунт. Все клиентские sender
> domains жили под одним нашим Brevo аккаунтом. Один юзер заспамит —
> Brevo банит весь аккаунт. Single point of failure без tenant
> isolation. Это и было главным аргументом для миграции на SES.

---

## R3. Silent failover ограничен моделью "юзер владеет credentials" (updated 2026-04-29)

**Вероятность:** структурная (не вероятность — характеристика модели).
**Эффект:** при failover между AWS regions либо при tenant re-creation
требуется обновление credentials на стороне юзера в Gmail Send-As. С
SES архитектурой эффект меньше чем был с Brevo (изолированная per-tenant
репутация снижает частоту необходимости failover).

**Что это значит.** Мы прописываем юзеру credentials которые указывают
напрямую на Brevo (`smtp-relay.brevo.com:587`). При смене backend нужны
другие credentials. Без своего proxy relay (как у SendMailAs) silent
failover невозможен — это противоречит позиционированию "ты владеешь
стеком".

**Mitigation — варианты.**
1. **Принять как trade-off позиционирования.** Честно проговорить в FAQ,
   pricing page (микрокопия), guarantee page. На лендинге визуально не
   выделять — anti-marketing для импульсной покупки. См. план копи в
   discussion от 2026-04-29.
2. **Свой SMTP proxy** (`smtp.getmailkit.com` → routes to Brevo/SES).
   Решает проблему silent failover, но создаёт lock-in уровня SendMailAs.
   Противоречит USP. Рассматривается только если будет signal что юзеры
   массово жалуются на dependency.
3. **Migration assistance как paid service** ($10-20) при закрытии MailKit
   или их собственном решении мигрировать на свой Brevo. Документация +
   step-by-step guide. Включить в Terms of Service как обязательство.

**Текущее решение:** вариант 1 (честность в копи) + вариант 3 как safety
net в ToS.

---

## R4. Google меняет Gmail Send-As API или политику

**Вероятность:** низкая.
**Эффект:** критический если Send-As отключат для @gmail аккаунтов.

**Что это значит.** Спайк показал что `users.settings.sendAs.create` API
не работает для личных Gmail (требует Workspace). Сейчас юзер делает
это вручную через Gmail UI. Если Google закроет ручной Send-As для
@gmail — наш core flow ломается.

**Mitigation.**
1. Workspace-сегмент (Phase B) — отдельный flow с domain-wide delegation,
   работает по другому API. Если @gmail Send-As прикроют — Workspace
   останется.
2. Chrome Extension (v2) — содержит логику автозаполнения Gmail UI. Если
   UI поменяется — мы быстрее адаптируемся чем юзеры вручную.

**Trigger для action.** Любые анонсы Google о deprecation Gmail features,
изменения в Gmail UI которые ломают наш wizard.

---

## R6. SES Sandbox to Production approval delay (NEW 2026-04-29)

**Вероятность:** низкая (один раз в начале).
**Эффект:** блокирующий — до approval'а SES в sandbox mode (200 писем/день,
только verified recipients), нельзя обслуживать реальных customer'ов.

**Mitigation.**
1. Запросить production access ДО открытия для платежей (на этапе testing).
2. Обоснование use case в request: "SaaS platform for Cloudflare DNS users,
   automating Email Routing + transactional email setup. 1:1 tenant-to-customer
   mapping. <500 emails/day per tenant volume."
3. Approval typically 24-48h. Worst case 5 business days.

**Trigger.** Не зависит от нас — это AWS internal review process.

## R7. AWS billing surprise (NEW 2026-04-29)

**Вероятность:** низкая при правильной настройке alerts.
**Эффект:** средний — unexpected bill, потенциально triggers account
suspension если оплата не пройдёт.

**Mitigation.**
1. Billing alerts настроены с самого начала: $5/мес warning, $20/мес
   critical, $50/мес hard cap (через AWS Budgets с automated alert).
2. Monthly billing review — первого числа каждого месяца Boris проверяет
   AWS Cost Explorer на anomalies.
3. CloudWatch alarms на абнормальный send volume per tenant — может
   указывать на скомпрометированный customer credential либо abuse.

## R5. Lemon Squeezy banks/freezes наш магазин

**Вероятность:** низкая.
**Эффект:** средний — блок платежей до разрешения, но обходим через
backup payment provider.

**Mitigation.** Backup на Paddle или Gumroad как secondary payment
provider. Подключаем после первых $1K MRR — раньше overhead не оправдан.

---

## Review cadence

Этот файл пересматривается:
- При появлении нового конкурента или стратегического сигнала.
- Раз в квартал минимум — даже если ничего не произошло.
- Перед каждым крупным релизом (v2, v3).

Owner: Boris. Architect: Claude (этот файл).
