import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Check, X, Minus } from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LEMON_SQUEEZY_CHECKOUT_URL } from "@/lib/constants/lemon-squeezy";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "MailKit vs SendMailAs & Google Workspace — Compare",
    description:
      "How MailKit compares to SendMailAs and Google Workspace: a one-time $5 setup you own forever versus monthly and yearly subscriptions with vendor lock-in.",
    alternates: { canonical: "/compare" },
  };
}

type Cell = { v: "yes" | "no" | "na"; note?: string } | { text: string };

const COLUMNS = ["MailKit", "SendMailAs", "Google Workspace"];

const ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: "Price",
    cells: [
      { text: "$5 once" },
      { text: "$29 / year" },
      { text: "$84 / year" },
    ],
  },
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
    label: "You own the stack after setup",
    cells: [
      { v: "yes", note: "Cloudflare + Postmark, yours" },
      { v: "no", note: "their SMTP relay" },
      { v: "no" },
    ],
  },
  {
    label: "No vendor lock-in",
    cells: [{ v: "yes" }, { v: "no" }, { v: "no" }],
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
    label: "Keeps working if you stop paying",
    cells: [{ v: "yes", note: "stack stays yours" }, { v: "no" }, { v: "no" }],
  },
];

const POSITIONING = [
  {
    vs: "vs Google Workspace",
    text: "Workspace replaces Gmail and bills every user every month. MailKit keeps you in the inbox you already use and charges once.",
  },
  {
    vs: "vs SendMailAs",
    text: "SendMailAs is a yearly subscription tied to their SMTP relay — stop paying and sending stops. With MailKit the Cloudflare + Postmark stack is yours after a one-time $5.",
  },
  {
    vs: "vs the DIY route",
    text: "Doing it by hand means Cloudflare, DNS records, SMTP and Gmail Send-As yourself — an hour of fiddly work where one typo breaks delivery. MailKit is that hour, automated.",
  },
];

function Mark({ cell }: { cell: Cell }) {
  if ("text" in cell) {
    return (
      <span className="mk-body font-medium text-mk-text-primary">
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
          "One-time $5 setup of professional email on your own domain. Cloudflare Email Routing + Postmark SMTP + Gmail Send-As. You own the stack, no subscription.",
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
            email on your own domain once — then the stack is yours to keep.
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
                  className="border-b border-mk-border-subtle transition-colors last:border-0 hover:bg-mk-text-primary/[0.02]"
                >
                  <th
                    scope="row"
                    className="mk-body px-6 py-5 text-left font-medium text-mk-text-primary"
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
                      <Mark cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
          <a
            href={LEMON_SQUEEZY_CHECKOUT_URL}
            className="mk-cta-shadow mk-hover-lift inline-flex h-[52px] items-center justify-center rounded-[10px] bg-mk-accent px-8 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            Set up my email — $5
          </a>
          <Link
            href="/faq"
            className="mk-body font-medium text-mk-accent underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Read the FAQ
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
