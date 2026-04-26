"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "mailkit-cookie-consent-v1";

/** Lazy-init the visibility flag from localStorage during the first
 * render. Returning false on SSR avoids hydration mismatch — server
 * renders nothing, client mounts with the real persisted value. */
function readInitialShouldShow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    // Private browsing / disabled storage — show the banner;
    // dismiss won't persist but the banner is informational.
    return true;
  }
}

/**
 * EU-style cookie consent banner (#39). Renders a slide-up
 * notification on first visit; once the user clicks "Got it" the
 * preference is stored in localStorage so the banner doesn't
 * reappear.
 *
 * The MailKit cookie posture is intentionally minimal: only OAuth
 * session cookies + the locale cookie. No marketing trackers, no ad
 * pixels, no behavioral analytics. We don't actually need a
 * gate-style consent — the cookies we set are functional. This
 * banner exists for transparency + EU compliance signal, not as a
 * hard gate before any data flows.
 *
 * Hydration: the banner mounts hidden and only shows after the
 * `useEffect` reads localStorage. Avoids the SSR-then-flash-of-
 * banner-on-revisit issue.
 *
 * Storage key carries a v1 suffix so a future cookie-policy change
 * (e.g. "we now use first-party analytics") can re-prompt without
 * having to invent a migration.
 */
export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const locale = useLocale();
  const [shouldShow, setShouldShow] = useState(readInitialShouldShow);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ acceptedAt: new Date().toISOString() }),
      );
    } catch {
      // Same fallback — proceed with hide even if persistence fails.
    }
    setShouldShow(false);
  };

  if (!shouldShow) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-4 shadow-lg backdrop-blur-md sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-zinc-700 sm:text-sm sm:leading-6 dark:text-zinc-300">
          {t("body")}{" "}
          <Link
            href={`/${locale}/privacy`}
            className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
          >
            {t("details")}
          </Link>
        </p>
        <Button onClick={handleAccept} size="sm" className="shrink-0">
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
