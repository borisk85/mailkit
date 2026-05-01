/**
 * Canonical Terms of Service text — EN + RU. Source of truth lives in
 * docs/LEGAL_PROTECTIONS.md sections 2.1 / 2.2; architect directive is
 * to copy verbatim. Any wording change must originate in that doc and
 * land here in the same commit so the published page never drifts from
 * the legally-vetted source.
 *
 * Plain string (not JSX) so the page renders it via
 * `whitespace-pre-wrap` — preserves the source paragraph + numbered
 * structure exactly. Avoids per-paragraph translation drift between
 * EN and RU.
 *
 * Last sync with docs/LEGAL_PROTECTIONS.md: 2026-04-26.
 */

export const TERMS_EN = `MailKit — Terms of Service

Last updated: 2026-04-24

These Terms of Service govern your use of MailKit (getmailkit.com, the
"Service"), operated by an independent contractor (the "Operator").

1. What MailKit does

MailKit automates the technical configuration required to send and
receive email on your own domain, specifically:
- Cloudflare Email Routing setup (MX records, forwarding rules)
- Brevo SMTP domain authentication (DKIM, SPF, DMARC records)
- Guided manual configuration of Gmail Send-As feature

MailKit does NOT:
- Provide an email inbox or mailbox storage
- Send marketing or bulk email on your behalf
- Guarantee email deliverability to any specific recipient
- Warm up sender reputation for you
- Protect your domain from blacklisting caused by your sending
  practices

2. Pricing and payment

MailKit is a one-time payment service priced at $5 USD per mailbox
setup. Payment is processed by Lemon Squeezy as Merchant of Record.
Prices may change; current pricing applies at the time of purchase.

3. Refund policy

See our full refund policy at /guarantee. Summary:
- Automatic full refund within 24 hours if our automated setup
  (Cloudflare or Brevo phases) fails on our side
- 30-day functional guarantee: if you cannot send or receive email
  after our setup is complete and our support cannot resolve the
  issue, full refund on request

4. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR'S
TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE
SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU TO MAILKIT IN
CONNECTION WITH THE SERVICE (typically $5 USD for a single mailbox
setup).

THE OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING
BUT NOT LIMITED TO: lost profits, lost business opportunities, loss
of reputation, loss of data, loss of contracts, cost of substitute
services, or any other commercial damages or losses, whether or not
foreseeable, even if the Operator has been advised of the
possibility of such damages.

5. What is explicitly not guaranteed

- Email deliverability to any specific recipient. Whether your email
  lands in the inbox, spam folder, or is rejected depends on the
  recipient's mail server policies, your sender reputation, your
  content, and factors outside our control.
- Continuous availability of third-party services (Cloudflare, Brevo,
  Google). Service interruptions at these providers may temporarily
  affect MailKit functionality. We make reasonable efforts to mitigate
  but do not guarantee uptime.
- Preservation of your configuration if you modify DNS records,
  Cloudflare settings, Gmail settings, or domain registrar settings
  after our setup completes.
- Protection against suspension by Brevo or any other third-party
  provider due to your sending practices (spam complaints, bounce
  rates, content policy violations).

6. User responsibilities

By using MailKit, you agree that:
- You own or have authority to configure the domain you are setting
  up email for
- You will not use the service to send spam, phishing, malware, or
  any content that violates laws or the anti-spam policies of
  Cloudflare, Brevo, or Google
- You understand that excessive bounce rates, spam complaints, or
  policy violations may result in suspension of your specific domain
  or the underlying Brevo infrastructure that supports the service
- You will warm up sender reputation on your domain gradually before
  sending high volumes of email

7. Sending limits

The Service operates on a shared email relay subject to the following
per-domain rate limits:
- 500 emails per day
- 50 emails per hour
- 5 emails per minute

These limits are enforced automatically. Exceeding them will pause
outbound delivery for the remainder of the window. For most
small-business use these limits are not a constraint. If you need
higher throughput after 30 days of use, contact support@getmailkit.com
— requests are reviewed individually based on sending history.

8. Account suspension

We reserve the right to suspend or terminate service for any account
that exhibits signs of abuse, including but not limited to:
- Bounce rate exceeding 5% over a 7-day rolling window
- Complaint rate exceeding 0.1% over a 7-day rolling window
- Sending volume that repeatedly hits the daily limit in patterns
  consistent with bulk or unsolicited email
- Reports of spam, phishing, or malicious content originating from
  the domain

Suspension may be immediate if abuse signals are severe. Refund
eligibility follows the refund policy.

9. Data and privacy

- Your Cloudflare API token is used to configure your domain and is
  discarded after the setup pipeline completes. We do not retain
  copies on our servers.
- Your SMTP credentials are generated and displayed to you during the
  Gmail Send-As wizard. You paste them directly into Gmail. We do not
  retain the password after the session ends.
- We do not read, store, or send emails on your behalf beyond the
  one-time verification process during setup.
- For detailed security notes see /security.

10. Changes to terms

We may update these Terms. Changes take effect when posted at /terms.
Continued use of the Service after changes constitutes acceptance.

11. Governing law

These Terms are governed by the laws of the Operator's jurisdiction.
Disputes should first be addressed to support@getmailkit.com. If
unresolved, disputes shall be subject to the exclusive jurisdiction of
the courts of the Operator's residence.

11. Contact

Questions: support@getmailkit.com
`;

export const TERMS_RU = `MailKit — Условия пользования

Последнее обновление: 2026-04-24

Данные Условия пользования регулируют использование сервиса MailKit
(getmailkit.com, далее "Сервис"), управляемого независимым оператором
(далее "Оператор").

1. Что делает MailKit

MailKit автоматизирует техническую настройку необходимую для отправки
и приёма почты на вашем собственном домене, а именно:
- Настройку маршрутизации писем через Cloudflare Email Routing
  (MX-записи, правила пересылки)
- Аутентификацию домена-отправителя в Brevo SMTP (DKIM, SPF, DMARC
  записи)
- Пошаговую ручную настройку функции Send-As в Gmail

MailKit НЕ делает:
- Не предоставляет почтовый ящик или хранилище для писем
- Не отправляет маркетинговые или массовые рассылки от вашего имени
- Не гарантирует доставляемость писем конкретному получателю
- Не прогревает репутацию вашего домена-отправителя
- Не защищает ваш домен от попадания в чёрные списки из-за ваших
  практик отправки

2. Цена и оплата

MailKit — разовый платёж, 5 долларов США за настройку одного ящика.
Платёж обрабатывается компанией Lemon Squeezy в роли Merchant of
Record. Цены могут меняться; к вашей покупке применяется цена на
момент совершения оплаты.

3. Политика возврата

Полная политика возврата на странице /guarantee. Коротко:
- Автоматический полный возврат в течение 24 часов если наша
  автоматическая настройка (фазы Cloudflare или Brevo) не завершилась
  по нашей вине
- 30-дневная функциональная гарантия: если после завершения настройки
  вы не можете отправлять или принимать почту и наша поддержка не
  смогла решить проблему — полный возврат по запросу

4. Ограничение ответственности

В МАКСИМАЛЬНОЙ СТЕПЕНИ РАЗРЕШЁННОЙ ПРИМЕНИМЫМ ЗАКОНОМ, СОВОКУПНАЯ
ОТВЕТСТВЕННОСТЬ ОПЕРАТОРА, ВОЗНИКАЮЩАЯ ИЗ ИЛИ СВЯЗАННАЯ С СЕРВИСОМ,
НЕ ПРЕВЫШАЕТ ОБЩЕЙ СУММЫ УПЛАЧЕННОЙ ВАМИ СЕРВИСУ MAILKIT В СВЯЗИ С
ОКАЗАНИЕМ УСЛУГИ (как правило 5 долларов США за настройку одного
ящика).

ОПЕРАТОР НЕ НЕСЁТ ОТВЕТСТВЕННОСТИ ЗА ЛЮБЫЕ КОСВЕННЫЕ, СЛУЧАЙНЫЕ,
КОНСЕКВЕНЦИАЛЬНЫЕ, СПЕЦИАЛЬНЫЕ, ШТРАФНЫЕ ИЛИ ПОКАЗАТЕЛЬНЫЕ УБЫТКИ,
ВКЛЮЧАЯ НО НЕ ОГРАНИЧИВАЯСЬ: упущенная прибыль, упущенные
возможности, потеря репутации, потеря данных, потеря контрактов,
стоимость замещающих услуг, любые другие коммерческие убытки или
потери, независимо от их предвидимости, даже если Оператор был
предупреждён о возможности таких убытков.

5. Что явно не гарантируется

- Доставляемость писем конкретному получателю. Попадёт ли письмо во
  входящие, в спам или будет отклонено, зависит от политик почтового
  сервера получателя, репутации отправителя, содержимого письма и
  факторов вне нашего контроля.
- Непрерывная доступность сторонних сервисов (Cloudflare, Brevo,
  Google). Перебои у этих провайдеров могут временно влиять на работу
  MailKit. Мы предпринимаем разумные усилия для смягчения, но не
  гарантируем время доступности.
- Сохранение конфигурации если вы изменяете DNS-записи, настройки
  Cloudflare, настройки Gmail или настройки регистратора домена после
  завершения нашей настройки.
- Защита от приостановки со стороны Brevo или другого стороннего
  провайдера из-за ваших практик отправки (жалобы на спам, процент
  отказов, нарушение политик содержимого).

6. Обязанности пользователя

Используя MailKit, вы соглашаетесь что:
- Вы являетесь владельцем домена для которого производится настройка,
  или имеете полномочия его конфигурировать
- Вы не будете использовать сервис для отправки спама, фишинга,
  вредоносного содержимого или любого материала нарушающего законы
  или антиспамовые политики Cloudflare, Brevo и Google
- Вы понимаете что чрезмерный процент отказов, жалобы на спам или
  нарушения политик могут привести к приостановке вашего домена или
  инфраструктуры Brevo обеспечивающей работу сервиса
- Вы будете постепенно прогревать репутацию отправителя на вашем
  домене прежде чем отправлять большие объёмы писем

7. Приостановка аккаунта

Мы оставляем за собой право приостановить или прекратить
обслуживание любого аккаунта демонстрирующего признаки
злоупотребления, включая но не ограничиваясь:
- Процент отказов более 5 процентов за скользящие 7 дней
- Процент жалоб более 0.1 процента за скользящие 7 дней
- Отправка более 500 писем в сутки с одного домена без
  предварительного согласования
- Сообщения о спаме, фишинге или вредоносном содержимом исходящем с
  домена

Приостановка может быть немедленной при серьёзных признаках
злоупотребления. Право на возврат определяется политикой возврата.

8. Данные и конфиденциальность

- Ваш Cloudflare API-токен используется для настройки домена и
  удаляется после завершения процесса настройки. Мы не сохраняем его
  копии на наших серверах.
- Ваши SMTP-реквизиты для Brevo (логин и пароль) генерируются
  компанией Brevo и отображаются вам во время мастера настройки
  Gmail Send-As. Вы вставляете их напрямую в Gmail. Мы не сохраняем
  пароль после завершения сессии.
- Мы не читаем, не храним и не отправляем ваши письма помимо разового
  процесса верификации во время настройки.
- Подробные заметки по безопасности см. на /security.

9. Изменения условий

Мы можем обновлять данные Условия. Изменения вступают в силу с момента
публикации на /terms. Продолжение пользования Сервисом после
изменений означает их принятие.

10. Применимое право

Данные Условия регулируются законами юрисдикции Оператора. Споры
следует направлять в первую очередь на support@getmailkit.com. При
неурегулировании споры подлежат исключительной юрисдикции судов по
месту жительства Оператора.

11. Контакты

Вопросы: support@getmailkit.com
`;
