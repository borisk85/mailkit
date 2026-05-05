/**
 * Canonical refund-guarantee text — EN + RU. Source of truth lives
 * in `docs/GUARANTEE_POLICY.md` "Formal policy — legal-style text"
 * (EN and RU canonical blocks). Architect directive matches the
 * /terms + /privacy posture: copy verbatim, no paraphrase.
 *
 * Required by:
 *   - Hero "(see policy)" link → `/{locale}/guarantee`
 *   - llms.txt manifest entry
 *   - JSON-LD structured-data descriptions reference the guarantee
 *   - /terms section 3 mentions /guarantee for the full text
 *   - Receipt email (post-launch via #47) signs off with the link
 *
 * Last sync with docs/GUARANTEE_POLICY.md: 2026-04-28.
 */

export const GUARANTEE_EN = `MailKit Guarantee

1. Automation Failure Refund (automatic). If our automated setup of
Cloudflare Email Routing or Postmark SMTP fails to complete for your
domain within the combined automation phase (typically under 2
minutes), we issue a full refund automatically within 24 hours of
the failure. No action required on your part. The automation phase
is measured server-side from the start of setup to the completion
of the SMTP verification step. Failure means our system returned
an error and did not reach the Gmail wizard phase.

2. 30-Day Functional Guarantee (by request). If, within 30 days of
purchase, you cannot send or receive email through the setup we
configured — even after we've attempted to assist you via support
— you are entitled to a full refund. Submit a request to
support@getmailkit.com describing the issue. We respond within 48
hours on business days.

What is not covered:

- Time you spend on the Gmail Send-As guided step. We provide a
  step-by-step wizard with copy-paste fields; the actual clicks
  happen in your Gmail account, at your pace.
- Failures caused by changes you make to DNS records, Cloudflare
  settings, or Gmail account settings after setup completion.
- Email deliverability issues (messages marked as spam by
  recipients, reputation problems). These are addressed by our
  optional Deliverability Monitoring subscription ($3/month per
  domain).
- Failures caused by your domain expiration, registrar changes, or
  account suspensions at third-party services (Cloudflare, Postmark,
  Google) outside our control.

How refunds are processed: Refunds are issued through the original
payment method via Lemon Squeezy. Processing time depends on your
card issuer, typically 3-10 business days.

Fraud note: We track refund requests per account. Multiple refund
requests from the same account may result in account restriction.
`;

export const GUARANTEE_RU = `Гарантия MailKit

1. Автоматический возврат при сбое автоматики. Если наша
автоматическая настройка Cloudflare Email Routing или Postmark SMTP
не завершается для твоего домена в рамках этой фазы (обычно меньше
2 минут), мы возвращаем деньги полностью автоматически в течение
24 часов после сбоя. Тебе ничего делать не надо. Время этой фазы
измеряется на нашем сервере — с момента старта настройки до
завершения верификации SMTP. Сбой означает, что наша система
вернула ошибку и не дошла до шага Gmail-мастера.

2. 30-дневная функциональная гарантия (по запросу). Если в течение
30 дней с момента покупки ты не можешь отправлять или получать
email через настройку, которую мы сделали — даже после того, как
наш support попытался помочь — ты имеешь право на полный возврат.
Отправь запрос на support@getmailkit.com с описанием проблемы. Мы
отвечаем в течение 48 часов в рабочие дни.

Что НЕ покрывается гарантией:

- Время, которое ты тратишь на Gmail Send-As шаг. Мы даем
  пошаговый мастер с готовыми полями для копирования; сами клики
  происходят в твоем Gmail-аккаунте, в твоем темпе.
- Сбои, вызванные изменениями DNS-записей, настроек Cloudflare или
  настроек Gmail-аккаунта, которые ты внес после завершения
  настройки.
- Проблемы доставляемости email (письма попадают в спам у
  получателей, проблемы с репутацией отправителя). Это покрывается
  нашей опциональной подпиской Deliverability Monitoring ($3/месяц
  на домен).
- Сбои из-за истечения срока твоего домена, смены регистратора или
  блокировки аккаунтов в сторонних сервисах (Cloudflare, Postmark,
  Google), которые вне нашего контроля.

Как обрабатывается возврат: Деньги возвращаются на ту же карту, с
которой была оплата, через Lemon Squeezy. Срок зачисления зависит
от твоего банка, обычно 3-10 рабочих дней.

Антифрод: Мы отслеживаем запросы на возврат по каждому аккаунту.
Несколько запросов на возврат от одного аккаунта могут привести к
ограничению доступа.
`;
