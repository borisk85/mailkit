import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Check, X, Minus } from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LandingCtaButton } from "@/components/landing/landing-cta-button";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "MailKit vs SendMailAs & Google Workspace — Compare",
    description:
      "How MailKit compares to SendMailAs and Google Workspace: a one-time $5 setup versus monthly and yearly subscriptions — same Gmail inbox, one payment instead of a recurring bill.",
    alternates: { canonical: "/compare" },
  };
}

type Cell = { v: "yes" | "no" | "na"; note?: string } | { text: string };

const COLUMNS = ["MailKit", "SendMailAs", "Google Workspace"];

const ROWS: { label: string; cells: Cell[]; isPrice?: boolean }[] = [
  {
    label: "Billing model",
    cells: [
      { text: "One-time" },
      { text: "Subscription" },
      { text: "Subscription" },
    ],
  },
  {
    label: "Keeps your existing Gmail inbox",
    cells: [{ v: "yes" }, { v: "yes" }, { v: "no", note: "replaces Gmail" }],
  },
  {
    label: "Your domain, DNS & Gmail stay yours",
    cells: [
      { v: "yes", note: "on your own accounts" },
      { v: "yes" },
      { v: "no", note: "in a Workspace tenant" },
    ],
  },
  {
    label: "Automated setup",
    cells: [{ v: "yes" }, { v: "yes" }, { v: "na", note: "manual" }],
  },
  {
    label: "Real sending, not just forwarding",
    cells: [{ v: "yes" }, { v: "yes" }, { v: "yes" }],
  },
  {
    label: "Price",
    cells: [
      { text: "$5 once" },
      { text: "$29 / year" },
      { text: "$84 / year" },
    ],
    isPrice: true,
  },
];

const POSITIONING = [
  {
    vs: "vs Google Workspace",
    text: "Workspace replaces Gmail and bills every user every month. MailKit keeps you in the inbox you already use and charges once.",
  },
  {
    vs: "vs SendMailAs",
    text: "SendMailAs and MailKit work the same way — Gmail Send-As over a hosted sending relay. The difference is the bill: SendMailAs is $29 every year, MailKit is a one-time $5.",
  },
  {
    vs: "vs the DIY route",
    text: "Doing it by hand means Cloudflare, DNS records, SMTP and Gmail Send-As yourself — an hour of fiddly work where one typo breaks delivery. MailKit is that hour, automated.",
  },
];

function Mark({ cell, strong }: { cell: Cell; strong?: boolean }) {
  if ("text" in cell) {
    return (
      <span
        className={
          strong
            ? "text-lg font-bold text-mk-text-primary"
            : "mk-body font-medium text-mk-text-primary"
        }
      >
        {cell.text}
      </span>
    );
  }
  const icon =
    cell.v === "yes" ? (
      <Check
        className="size-5 text-mk-success"
        strokeWidth={2.5}
        aria-label="Yes"
      />
    ) : cell.v === "no" ? (
      <X className="size-5 text-mk-danger" strokeWidth={2.5} aria-label="No" />
    ) : (
      <Minus
        className="size-5 text-mk-text-secondary/60"
        strokeWidth={2.5}
        aria-label="Not applicable"
      />
    );
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {icon}
      {cell.note && (
        <span className="text-xs leading-tight text-mk-text-secondary">
          {cell.note}
        </span>
      )}
    </span>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "MailKit vs alternatives for custom domain email",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "MailKit",
        url: SITE_URL,
        description:
          "One-time $5 setup of professional email on your own domain: Cloudflare Email Routing on your account + Gmail Send-As, with sending through MailKit's shared Postmark relay. No subscription.",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "SendMailAs",
        description:
          "Automated Cloudflare + Gmail Send-As setup on a $29/year subscription tied to their SMTP relay.",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Google Workspace",
        description:
          "Full email suite that replaces Gmail. $7 per user per month.",
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />

        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <span className="mk-eyebrow text-mk-accent">Compare</span>
          <h1 className="mk-display-2 text-balance text-mk-text-primary">
            MailKit vs the subscriptions
          </h1>
          <p className="mk-body-large text-pretty text-mk-text-secondary">
            Everyone else bills you every month or every year. MailKit sets up
            email on your own domain for a one-time $5 — same Gmail inbox, no
            recurring bill.
          </p>
        </div>

        {/* Comparison table */}
        <div className="mt-16 overflow-x-auto rounded-2xl border border-mk-border-subtle bg-surface-elevated">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-mk-border-subtle">
                <th className="w-[34%] px-6 py-5 align-bottom" />
                {COLUMNS.map((col, i) => (
                  <th
                    key={col}
                    className={`px-4 py-5 text-center align-bottom ${
                      i === 0 ? "bg-mk-accent/[0.06]" : ""
                    }`}
                  >
                    {i === 0 ? (
                      <span className="inline-block rounded-full bg-mk-accent px-5 py-1.5 text-sm font-bold tracking-wide text-white shadow-[0_6px_18px_rgba(124,92,255,0.35)]">
                        {col}
                      </span>
                    ) : (
                      <span className="mk-body font-semibold text-mk-text-secondary">
                        {col}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.label}
                  className={`transition-colors hover:bg-mk-text-primary/[0.02] ${
                    row.isPrice
                      ? "border-t-2 border-mk-border-strong"
                      : "border-b border-mk-border-subtle"
                  }`}
                >
                  <th
                    scope="row"
                    className={`mk-body px-6 py-5 text-left text-mk-text-primary ${
                      row.isPrice ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-5 text-center ${
                        ci === 0 ? "bg-mk-accent/[0.06]" : ""
                      }`}
                    >
                      <Mark cell={cell} strong={!!row.isPrice && ci === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mx-auto mt-5 max-w-3xl text-pretty text-sm leading-relaxed text-mk-text-tertiary">
          One honest note: receiving runs on your own Cloudflare account and
          keeps working regardless. Sending goes through MailKit&apos;s shared
          Postmark relay — there&apos;s no separate fallback, so if MailKit ever
          stops running, sending pauses until you point Gmail at your own SMTP.
          MailKit is a small independent product: we can&apos;t promise
          it&apos;ll run for any set length of time, and the one-time $5
          isn&apos;t refundable if we shut down. Your domain, DNS, routing and
          Gmail always stay on your own accounts.
        </p>

        {/* Positioning notes */}
        <div className="mt-20 grid gap-5 sm:grid-cols-3">
          {POSITIONING.map((p) => (
            <div
              key={p.vs}
              className="rounded-[16px] border border-mk-border-subtle bg-surface-elevated p-6"
            >
              <p className="mk-eyebrow text-mk-accent">{p.vs}</p>
              <p className="mk-body mt-3 text-pretty text-mk-text-secondary">
                {p.text}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="mk-body-large text-mk-text-primary">
            One domain, one payment, no subscription.
          </p>
          <LandingCtaButton
            label="Set up email"
            caption="$5 one-time · 30-day money-back guarantee"
            className="mk-cta-shadow mk-hover-lift inline-flex h-[52px] items-center justify-center rounded-[10px] bg-mk-accent px-8 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
