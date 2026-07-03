import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Email setup glossary — SPF, DKIM, DMARC, MX, SMTP explained",
    description:
      "Plain-English definitions of the email terms you hit when setting up a custom domain: SPF, DKIM, DMARC, MX records, SMTP, Cloudflare Email Routing and Gmail Send-As.",
    alternates: { canonical: "/glossary" },
  };
}

type Term = { term: string; short: string; body: string };

const TERMS: Term[] = [
  {
    term: "SPF (Sender Policy Framework)",
    short:
      "A DNS record listing which servers are allowed to send email for your domain.",
    body: "SPF is a TXT record in your domain's DNS. It names the mail servers permitted to send messages using your domain, so receiving servers can reject spoofed mail that claims to be from you. Without a valid SPF record, your legitimate email is far more likely to land in spam.",
  },
  {
    term: "DKIM (DomainKeys Identified Mail)",
    short:
      "A cryptographic signature that proves an email really came from your domain and wasn't altered.",
    body: "DKIM adds a digital signature to every message, using a private key held by the sending service and a public key published in your DNS. The receiving server checks the signature to confirm the message is authentic and untampered. It's one of the strongest signals that you're a real sender, not a spammer.",
  },
  {
    term: "DMARC (Domain-based Message Authentication)",
    short:
      "A policy telling receivers what to do when SPF or DKIM fails — and where to send reports.",
    body: "DMARC is a DNS record that builds on SPF and DKIM. It tells receiving servers whether to quarantine or reject mail that fails authentication, and it can send you reports about who is sending email using your domain. It's the piece that turns SPF and DKIM into an actual anti-spoofing policy.",
  },
  {
    term: "MX record",
    short:
      "The DNS record that says where your domain's incoming email should be delivered.",
    body: "MX (Mail Exchange) records point your domain at the servers that accept incoming mail. When someone emails hello@yourdomain.com, their server looks up your MX records to know where to deliver it. Setting them wrong means email silently fails to arrive.",
  },
  {
    term: "SMTP",
    short: "The protocol used to send email across the internet.",
    body: "SMTP (Simple Mail Transfer Protocol) is how mail is handed from one server to the next when you send a message. To send from your own domain you need valid SMTP credentials from a sending service — this is the part people most often misconfigure, because an API key is not the same as SMTP credentials.",
  },
  {
    term: "Cloudflare Email Routing",
    short:
      "A free Cloudflare feature that receives and forwards mail for your domain.",
    body: "Email Routing lets your domain receive mail and forward it to an existing inbox like Gmail, without running a mail server. It handles the incoming side (MX records and forwarding); you still need a sending path to reply from your domain address. It requires your domain's DNS to be managed on Cloudflare.",
  },
  {
    term: "Gmail Send-As",
    short:
      "A Gmail setting that lets you send email from an address on your own domain.",
    body: "Send-As adds your custom address (hello@yourdomain.com) to Gmail's \"From\" dropdown, routing outgoing mail through your domain's SMTP credentials. It's what makes replies come from your domain instead of your @gmail.com address, while you keep using the same Gmail inbox.",
  },
  {
    term: "Forwarding vs sending",
    short:
      "Forwarding delivers incoming mail to another inbox; sending lets you reply from your domain.",
    body: "Many cheap tools only forward — they get mail to your inbox but can't send from your domain. A complete custom-domain setup needs both: receiving (forwarding via MX) and sending (SMTP + Send-As), so a reply from hello@yourdomain.com actually leaves as hello@yourdomain.com.",
  },
];

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossary`,
    name: "Custom domain email glossary",
    description:
      "Definitions of the DNS and email terms involved in setting up professional email on a custom domain.",
    hasDefinedTerm: TERMS.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.short,
      inDefinedTermSet: `${SITE_URL}/glossary`,
    })),
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className="flex flex-col gap-5">
          <span className="mk-eyebrow text-mk-accent">Glossary</span>
          <h1 className="mk-display-2 text-balance text-mk-text-primary">
            Email setup, in plain English
          </h1>
          <p className="mk-body-large text-pretty text-mk-text-secondary">
            The DNS and email terms you run into when putting a real address on
            your own domain — each one explained without the jargon.
          </p>
        </div>

        <dl className="mt-16 flex flex-col gap-4">
          {TERMS.map((t) => (
            <div
              key={t.term}
              className="rounded-[16px] border border-mk-border-subtle bg-surface-elevated p-6 sm:p-8"
            >
              <dt className="mk-heading-2 text-mk-text-primary">{t.term}</dt>
              <dd className="mk-body mt-2 font-medium text-mk-text-primary">
                {t.short}
              </dd>
              <dd className="mk-body mt-3 text-pretty text-mk-text-secondary">
                {t.body}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 rounded-[16px] border border-mk-border-subtle bg-surface-elevated p-8 text-center">
          <p className="mk-body-large text-mk-text-primary">
            Don’t want to touch any of this yourself?
          </p>
          <p className="mk-body mt-2 text-mk-text-secondary">
            MailKit sets all of it up for you — once, for $5.
          </p>
          <div className="mt-6">
            <Link
              href="/compare"
              className="mk-body font-medium text-mk-accent underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              See how MailKit works
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
