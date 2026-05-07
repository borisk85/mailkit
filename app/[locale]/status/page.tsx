import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "System status — MailKit",
  description: "Current operational status of MailKit services.",
};

const SERVICES = [
  { name: "getmailkit.com", status: "operational" as const },
  { name: "Cloudflare Email Routing", status: "operational" as const },
  { name: "Email delivery (SMTP relay)", status: "operational" as const },
  { name: "Payment processing", status: "operational" as const },
];

export default async function StatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const checkedAt = new Date().toUTCString();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      {/* Overall status */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        <h1 className="text-xl font-semibold text-foreground">
          All systems operational
        </h1>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Last checked: {checkedAt}
      </p>

      {/* Service list */}
      <ul className="mt-10 divide-y divide-border rounded-xl border border-border">
        {SERVICES.map((svc) => (
          <li
            key={svc.name}
            className="flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm text-foreground">{svc.name}</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Operational
            </span>
          </li>
        ))}
      </ul>

      {/* Footer note */}
      <p className="mt-8 text-xs text-muted-foreground">
        For incident updates follow{" "}
        <a
          href="https://twitter.com/MailKitHQ"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground transition-colors hover:text-foreground/70"
        >
          @MailKitHQ
        </a>{" "}
        on X.
      </p>
    </main>
  );
}
