/**
 * Canonical deliverability disclaimer text — EN + RU. Single source of
 * truth for the four placement points listed in #24:
 *   1. Landing FAQ "Why might my emails go to spam?" (#11 этап 3)
 *   2. /terms section 5 — already embedded in lib/legal/terms.ts
 *   3. Welcome email after purchase — pending docs/EMAIL_TEMPLATES.md
 *      from the architect
 *   4. Gmail Send-As wizard "done" panel — short warmup tip is
 *      consumed via i18n keys gmail.steps.done.warmupTip (this file
 *      is the long-form text the FAQ + email use)
 *
 * The three short hooks below (FULL, ATTRIBUTION_ONLY, WARMUP_TIP)
 * cover the placement points without each consumer reinventing
 * wording. Any update lands here first; the FAQ + email pull it.
 */

export const DELIVERABILITY_DISCLAIMER_EN = {
  /**
   * Long form — for /terms (already embedded), /faq, and the welcome
   * email "responsibility" paragraph. This is the architect's verbatim
   * text from docs/TICKETS_BACKLOG.md #24.
   */
  full: `MailKit configures technically correct SPF/DKIM/DMARC authentication. Whether email lands in a specific recipient's inbox depends on sender reputation, content, sending practices, and the recipient's policies — all of that is outside our control and outside our responsibility. Domain warmup, recipient list hygiene, and consent compliance are the sender's job.`,

  /**
   * Short form — for FAQ answer "Why might my emails go to spam?" if
   * a tighter version reads better than the full paragraph.
   */
  attributionOnly: `Email deliverability to a specific recipient depends on sender reputation, content, sending practices, and the recipient's policies — factors outside MailKit's control. We configure correct SPF/DKIM/DMARC; warmup and list hygiene are the sender's job.`,

  /**
   * Single-sentence warmup tip — for the wizard "done" panel and the
   * welcome email's tail line. Soft, action-oriented, doesn't dwell
   * on disclaimers.
   */
  warmupTip: `Tip: warm up the domain gradually — 10–20 emails per day in the first week, then ramp up. Bursts from a fresh domain are the fastest way to land in spam.`,
};

export const DELIVERABILITY_DISCLAIMER_RU = {
  full: `MailKit настраивает технически корректную SPF/DKIM/DMARC аутентификацию. Доставляемость писем конкретному получателю зависит от репутации отправителя, содержимого, практик отправки и политик получающей стороны — всё это вне нашего контроля и ответственности. Прогрев домена, работа со списком получателей, соблюдение согласия на рассылку — задача отправителя.`,

  attributionOnly: `Доставляемость писем конкретному получателю зависит от репутации отправителя, содержимого, практик отправки и политик получающей стороны — факторов вне контроля MailKit. Мы настраиваем корректные SPF/DKIM/DMARC; прогрев и гигиена списка — задача отправителя.`,

  warmupTip: `Совет: прогревай домен постепенно — 10–20 писем в день первую неделю, дальше увеличивай. Резкие всплески с нового домена — самый короткий путь в спам.`,
};

export function disclaimerForLocale(locale: string) {
  return locale === "ru"
    ? DELIVERABILITY_DISCLAIMER_RU
    : DELIVERABILITY_DISCLAIMER_EN;
}
