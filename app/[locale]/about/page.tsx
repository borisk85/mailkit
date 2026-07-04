import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const linkCls =
    "font-medium text-mk-accent underline underline-offset-4 transition-opacity hover:opacity-70";

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

        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-mk-text-tertiary transition-colors hover:text-mk-text-secondary"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to homepage
        </Link>

        <h1 className="mk-display-2 text-balance text-mk-text-primary">
          About
        </h1>

        <div className="mt-10 flex flex-col gap-10">
          <section>
            <h2 className="mk-heading-2 text-mk-text-primary">
              What is MailKit
            </h2>
            <p className="mk-body mt-3 text-pretty text-mk-text-secondary">
              MailKit is a one-time setup of professional email on your own
              domain — no DNS headache, no monthly bill. It automates the
              technical side: Cloudflare Email Routing, Postmark SMTP and the
              DKIM, SPF and DMARC records. You paste one Cloudflare token and
              follow a short guided step, and in about 30 minutes you’re sending
              from{" "}
              <span className="text-mk-text-primary">hello@yourdomain.com</span>{" "}
              inside the Gmail inbox you already use. One-time $5, backed by a
              30-day money-back guarantee.
            </p>
          </section>

          <section>
            <h2 className="mk-heading-2 text-mk-text-primary">Who built it</h2>
            <p className="mk-body mt-3 text-pretty text-mk-text-secondary">
              MailKit was built by{" "}
              <a
                href="https://x.com/borisfounder"
                target="_blank"
                rel="noopener noreferrer"
                className={linkCls}
              >
                Boris Komarov
              </a>{" "}
              — an AI-native founder from Almaty, Kazakhstan, and the founder of{" "}
              <a
                href="https://vibecraft.kz"
                target="_blank"
                rel="noopener noreferrer"
                className={linkCls}
              >
                Vibecraft
              </a>
              . Boris builds AI products solo, without a classic CS degree or a
              traditional programming background: from bots and automations to
              MVPs of mobile and web apps. Development is 100% AI-driven with
              Claude Code on a modern tech stack.
            </p>
          </section>

          <section>
            <h2 className="mk-heading-2 text-mk-text-primary">Contact</h2>
            <p className="mk-body mt-3 text-mk-text-secondary">
              Questions, ideas, partnership:{" "}
              <a href="mailto:support@getmailkit.com" className={linkCls}>
                support@getmailkit.com
              </a>
              <br />
              On X:{" "}
              <a
                href="https://x.com/borisfounder"
                target="_blank"
                rel="noopener noreferrer"
                className={linkCls}
              >
                @borisfounder
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
