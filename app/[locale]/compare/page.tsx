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
    title: "MailKit vs Google Workspace, SendMailAs & ImprovMX — Compare",
    description:
      "How MailKit compares to Google Workspace, SendMailAs, ImprovMX and ForwardEmail: a one-time $5 setup you own forever versus monthly subscriptions and vendor lock-in.",
    alternates: { canonical: "/compare" },
  };
}

type Cell = { v: "yes" | "no" | "na"; note?: string } | { text: string };

const COLUMNS = ["MailKit", "SendMailAs", "Google Workspace", "ImprovMX"];

const ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: "Price",
    cells: [
      { text: "$5 once" },
      { text: "$29 / year" },
      { text: "$84 / year" },
      { text: "$9 / month" },
    ],
  },
  {
    label: "Billing model",
    cells: [
      { text: "One-time" },
      { text: "Subscription" },
      { text: "Subscription" },
      { text: "Subscription" },
    ],
  },
  {
    label: "Keeps your existing Gmail inbox",
    cells: [
      { v: "yes" },
      { v: "yes" },
      { v: "no", note: "replaces Gmail" },
      { v: "yes" },
    ],
  },
  {
    label: "You own the stack after setup",
    cells: [
      { v: "yes", note: "Cloudflare + Postmark, yours" },
      { v: "no", note: "their SMTP relay" },
      { v: "no" },
      { v: "no" },
    ],
  },
  {
    label: "No vendor lock-in",
    cells: [{ v: "yes" }, { v: "no" }, { v: "no" }, { v: "no" }],
  },
  {
    label: "Automated setup",
    cells: [
      { v: "yes" },
      { v: "yes" },
      { v: "na", note: "manual" },
      { v: "na", note: "manual" },
    ],
  },
  {
    label: "Real sending, not just forwarding",
    cells: [{ v: "yes" }, { v: "yes" }, { v: "yes" }, { v: "yes" }],
  },
  {
    label: "Stops working if you stop paying",
    cells: [
      { v: "no", note: "stack stays yours" },
      { v: "yes" },
      { v: "yes" },
      { v: "yes" },
    ],
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
    vs: "vs ImprovMX / ForwardEmail",
    text: "Both charge monthly and route through their service. MailKit sets up sending on your own domain, then steps out of the way.",
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
      {
        "@type": "ListItem",
        position: 4,
        name: "ImprovMX",
        description: "Email forwarding and SMTP on a $9/month subscription.",
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
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
        <div className="mt-16 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-[34%] px-4 pb-4 align-bottom" />
                {COLUMNS.map((col, i) => (
                  <th
                    key={col}
                    className={`px-4 pb-4 text-center align-bottom ${
                      i === 0 ? "" : ""
                    }`}
                  >
                    <span
                      className={
                        i === 0
                          ? "mk-body font-bold text-mk-accent"
                          : "mk-body font-semibold text-mk-text-secondary"
                      }
                    >
                      {col}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr
                  key={row.label}
                  className="border-t border-mk-border-subtle"
                >
                  <th
                    scope="row"
                    className="px-4 py-5 text-left mk-body font-medium text-mk-text-primary"
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-5 text-center ${
                        ci === 0
                          ? "bg-mk-accent/[0.06] first:border-l first:border-r border-mk-accent/20"
                          : ""
                      } ${ri === ROWS.length - 1 && ci === 0 ? "rounded-b-[14px]" : ""} ${
                        ri === 0 && ci === 0 ? "rounded-t-[14px]" : ""
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
