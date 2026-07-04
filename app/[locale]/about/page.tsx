import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "About MailKit — built by an independent founder",
    description:
      "MailKit is built by Boris Komarov, an independent founder who ships AI products solo with Claude Code. Here's who's behind the $5 email setup and why it exists.",
    alternates: { canonical: "/about" },
  };
}

const BUILT = [
  {
    name: "VELA",
    url: "https://velabot.io",
    note: "Personal AI assistants in Telegram, powered by Claude.",
  },
  {
    name: "Vibecraft",
    url: "https://vibecraft.kz",
    note: "A studio building small, sharp software products.",
  },
];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#founder`,
    name: "Boris Komarov",
    jobTitle: "Founder",
    description:
      "Independent founder building AI-native software products solo with Claude Code.",
    url: `${SITE_URL}/about`,
    sameAs: ["https://x.com/borisfounder"],
    worksFor: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />

        <div className="flex flex-col gap-5">
          <span className="mk-eyebrow text-mk-accent">About</span>
          <h1 className="mk-display-2 text-balance text-mk-text-primary">
            Who’s behind MailKit
          </h1>
        </div>

        <div className="mk-body-large mt-10 flex flex-col gap-6 text-pretty text-mk-text-secondary">
          <p>
            MailKit is built by{" "}
            <a
              href="https://x.com/borisfounder"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-mk-accent underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Boris Komarov
            </a>
            , an independent founder from Almaty who ships AI-native products
            solo — designing, building and running them with Claude Code rather
            than a team.
          </p>
          <p>
            The idea came from a chore I kept repeating: every new project needs
            a real email address on its own domain, and every time it means the
            same fight with Cloudflare, DNS records, SMTP credentials and
            Gmail’s Send-As settings. It’s an hour of fiddly work with no room
            for a single typo. MailKit is that hour, automated — so you paste
            one token, follow a short guided step, and get a working{" "}
            <span className="text-mk-text-primary">hello@yourdomain.com</span>{" "}
            in your existing Gmail. Once for $5, no subscription.
          </p>
          <p>
            It’s a small, honest product — not a venture-scale startup. The goal
            is a tool that quietly does one annoying job well, backed by a
            money-back guarantee if the automation ever fails on our end.
          </p>
        </div>

        {/* What I've built */}
        <div className="mt-16">
          <h2 className="mk-heading-1 text-mk-text-primary">
            Other things I build
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {BUILT.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-[16px] border border-mk-border-subtle bg-surface-elevated p-6 transition-colors hover:border-mk-border-strong"
              >
                <span className="mk-body font-semibold text-mk-text-primary">
                  {p.name}
                </span>
                <span className="mk-body text-mk-text-secondary">{p.note}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16 rounded-[16px] border border-mk-border-subtle bg-surface-elevated p-8 text-center">
          <p className="mk-body text-mk-text-secondary">
            Questions, feedback, or something not working?
          </p>
          <a
            href="mailto:support@getmailkit.com"
            className="mk-body mt-2 inline-block font-medium text-mk-accent underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            support@getmailkit.com
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
