"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Locale-scoped global error boundary (#41). Next.js conventional
 * file — runs whenever a route under /[locale] throws during render
 * or in a server action. Captures the error to Sentry, then renders
 * a friendly fallback in the user's locale.
 *
 * Sentry only initializes on prod (see sentry.client.config.ts), so
 * Sentry.captureException is effectively a no-op in dev / preview —
 * but we still call it so the wiring is exercised in CI builds.
 *
 * Reset is the Next.js-provided callback that re-renders the failing
 * segment without a full reload. Useful when the error is transient
 * (rate-limited downstream call, intermittent network blip).
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="container mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <AlertTriangle className="mb-6 size-12 text-mk-warning" aria-hidden />
      <h1 className="mk-heading-1 text-mk-text-primary">{t("title")}</h1>
      <p className="mt-4 max-w-md mk-body text-mk-text-secondary">
        {t("body")}
      </p>
      <a
        href="mailto:support@getmailkit.com"
        className="mt-2 text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
      >
        {t("supportCta")}
      </a>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={reset}>{t("retryCta")}</Button>
        <Link href="/">
          <Button variant="outline">{t("homeCta")}</Button>
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 mk-caption font-mono text-mk-text-tertiary">
          {t("errorIdLabel")}: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
