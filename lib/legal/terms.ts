/**
 * Canonical Terms of Service text — EN only. Source of truth lives in
 * docs/LEGAL_PROTECTIONS.md section 2.1; architect directive is
 * to copy verbatim. Any wording change must originate in that doc and
 * land here in the same commit so the published page never drifts from
 * the legally-vetted source.
 *
 * Plain string (not JSX) so the page renders it via
 * `whitespace-pre-wrap` — preserves the source paragraph + numbered
 * structure exactly. Plain string, rendered via whitespace-pre-wrap.
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
- Postmark SMTP domain authentication (DKIM, SPF, DMARC records)
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
  (Cloudflare or Postmark phases) fails on our side
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
- Continuous availability of third-party services (Cloudflare, Postmark,
  Google). Service interruptions at these providers may temporarily
  affect MailKit functionality. We make reasonable efforts to mitigate
  but do not guarantee uptime.
- Preservation of your configuration if you modify DNS records,
  Cloudflare settings, Gmail settings, or domain registrar settings
  after our setup completes.
- Protection against suspension by Postmark or any other third-party
  provider due to your sending practices (spam complaints, bounce
  rates, content policy violations).

6. User responsibilities

By using MailKit, you agree that:
- You own or have authority to configure the domain you are setting
  up email for
- You will not use the service to send spam, phishing, malware, or
  any content that violates laws or the anti-spam policies of
  Cloudflare, Postmark, or Google
- You understand that excessive bounce rates, spam complaints, or
  policy violations may result in suspension of your specific domain
  or the underlying Postmark infrastructure that supports the service
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
