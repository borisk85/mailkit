import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MailkitIcon } from "@/components/brand/mailkit-icon";
import "./globals.css";

/**
 * Root-level 404 — catches URLs outside the [locale] segment,
 * e.g. /totally-random-doesnt-exist and any /ru/* not covered by
 * next.config.ts redirects. Renders its own branded layout because
 * there is no root app/layout.tsx wrapping it.
 */
export default function RootNotFound() {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full flex flex-col overflow-x-hidden bg-surface-base text-mk-text-primary antialiased">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-mk-border-subtle bg-surface-base/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/en"
              className="flex items-center gap-2.5 text-mk-text-primary"
              style={{
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              <MailkitIcon className="size-7 shrink-0" />
              <span>Mailkit</span>
            </Link>
            <Link
              href="/en/app"
              className="text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
            >
              Sign in
            </Link>
          </div>
        </header>

        {/* 404 content */}
        <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6">
          <p className="mk-display-2 text-mk-accent">404</p>
          <h1 className="mk-heading-1 text-mk-text-primary">Page not found</h1>
          <p className="mk-body max-w-md text-mk-text-secondary">
            The page you&apos;re looking for doesn&apos;t exist or was moved.
            Russian-language pages were discontinued — try the home page or
            check the FAQ.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href="/en"
              className="mk-cta-shadow group inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
            >
              Back to home
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/en/faq"
              className="text-base font-medium text-mk-text-secondary underline-offset-4 transition-colors hover:text-mk-text-primary hover:underline"
            >
              View FAQ
            </Link>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-mk-border-subtle bg-surface-elevated">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
            <p className="text-xs text-mk-text-tertiary">
              © 2026 Mailkit. Built by an independent founder.
            </p>
            <nav className="flex gap-6">
              <Link
                href="/en/terms"
                className="text-xs text-mk-text-tertiary transition-colors hover:text-mk-text-secondary"
              >
                Terms
              </Link>
              <Link
                href="/en/privacy"
                className="text-xs text-mk-text-tertiary transition-colors hover:text-mk-text-secondary"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
