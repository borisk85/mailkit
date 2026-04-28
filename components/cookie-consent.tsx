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
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[520px] flex-col gap-3 rounded-2xl border border-mk-border-strong bg-surface-elevated/95 p-6 backdrop-blur-md mk-card-shadow sm:left-auto sm:right-6 sm:bottom-6 sm:mx-0"
    >
      <p className="mk-body-small text-mk-text-secondary">{t("body")}</p>
      <div className="flex items-center gap-3">
        <Button onClick={handleAccept} size="sm" className="shrink-0">
          {t("accept")}
        </Button>
        <Link
          href={`/${locale}/privacy`}
          className="mk-body-small font-medium text-mk-text-secondary underline-offset-4 hover:text-mk-text-primary hover:underline"
        >
          {t("details")}
        </Link>
      </div>
    </div>
  );
}
