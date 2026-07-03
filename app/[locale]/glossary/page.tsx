import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LandingCtaButton } from "@/components/landing/landing-cta-button";

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
    term: "DNS record",
    short:
      "An instruction stored with your domain that tells the internet how it should behave — where your email goes, which site to load, and so on.",
    body: "DNS (Domain Name System) is the address book of the internet, and DNS records are its individual entries. Setting up email means adding a handful of them — MX, TXT, SPF, DKIM, DMARC — so your mail is delivered and trusted. Get one wrong and email quietly breaks, which is exactly the part MailKit handles for you.",
  },
  {
    term: "Nameservers",
    short:
      "The servers that decide who controls your domain's DNS — the reason your domain has to be “on Cloudflare”.",
    body: "Your domain points at a set of nameservers, and whoever runs them controls its DNS records. To let Cloudflare manage your email records, your domain's nameservers have to point to Cloudflare — that's what “moving your domain to Cloudflare” actually means. You change them once at your registrar (GoDaddy, Namecheap, and the like), and everything else happens inside Cloudflare.",
  },
  {
    term: "SPF (Sender Policy Framework)",
    short:
      "A DNS record that lists which services are allowed to send email using your domain.",
    body: "SPF is a short entry in your DNS that lists the services allowed to send mail as you. When a message arrives claiming to be from your domain, the other side checks that list — if the sender isn't on it, the mail looks fake and can be turned away. Without SPF, even your genuine email often ends up in spam.",
  },
  {
    term: "DKIM (DomainKeys Identified Mail)",
    short:
      "A tamper-proof seal that proves an email really came from your domain and wasn't changed on the way.",
    body: "DKIM puts an invisible seal on every email you send — a mark only your domain can produce. The email provider on the other end checks that seal to be sure the message really came from you and wasn't tampered with along the way. It's one of the strongest signals that you're a real sender, not a spammer.",
  },
  {
    term: "DMARC (Domain-based Message Authentication)",
    short:
      "A rule telling other providers what to do when SPF or DKIM fails — and where to send you reports.",
    body: "DMARC sits on top of SPF and DKIM and sets the rule: if an email claiming to be from you fails those checks, should it go to spam or be blocked outright? It can also send you a summary of who's trying to send mail as your domain. It's the piece that turns SPF and DKIM into a real anti-impersonation policy.",
  },
  {
    term: "MX record",
    short:
      "The DNS record that says where your domain's incoming email should be delivered.",
    body: "MX (Mail Exchange) records point your domain at the servers that accept incoming mail. When someone emails hello@yourdomain.com, their server looks up your MX records to know where to deliver it. Setting them wrong means email silently fails to arrive.",
  },
  {
    term: "TXT record",
    short:
      "A free-form DNS record used to prove things about your domain — including your email's SPF, DKIM and DMARC settings.",
    body: "A TXT record simply stores a line of text in your DNS, and email authentication leans on it heavily: your SPF rule, your DMARC policy and often your DKIM key all live in TXT records. They're invisible to anyone visiting your site, but they decide whether your mail is trusted or dropped into spam.",
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
    term: "Email alias and catch-all",
    short:
      "Extra addresses on your domain — like hello@ or billing@ — that all land in the same inbox.",
    body: "An alias is an address such as hello@yourdomain.com that forwards to your real inbox, so you can run several public-facing addresses without several logins. A catch-all goes further and forwards anything sent to your domain — even typos — to one place. Cloudflare Email Routing can set both up for free once your domain is connected.",
  },
  {
    term: "Gmail Send-As",
    short:
      "A Gmail setting that lets you send email from an address on your own domain.",
    body: "Send-As adds your custom address (hello@yourdomain.com) to Gmail's \"From\" dropdown, routing outgoing mail through your domain's SMTP credentials. It's what makes replies come from your domain instead of your @gmail.com address, while you keep using the same Gmail inbox.",
  },
  {
    term: "Deliverability",
    short:
      "Whether your email actually reaches the inbox instead of the spam folder.",
    body: "Deliverability is the real goal behind SPF, DKIM and DMARC: receiving servers judge whether to trust you, and correct DNS records are what earn that trust. A fresh domain with missing or broken records looks like a spammer, so its mail gets filtered out. Getting the records right the first time is what keeps your email landing where people can actually see it.",
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
            The DNS and email terms you run into when setting up a professional
            address on your own domain — what each one actually means, and why
            it matters for your setup.
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
          <div className="mt-6 flex flex-col items-center gap-4">
            <LandingCtaButton
              label="Set up email"
              className="mk-cta-shadow mk-hover-lift inline-flex h-[52px] items-center justify-center rounded-[10px] bg-mk-accent px-8 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
            />
            <Link
              href="/#how-it-works"
              className="mk-body font-medium text-mk-text-secondary underline-offset-4 transition-colors hover:text-mk-text-primary hover:underline"
            >
              See how it works
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
