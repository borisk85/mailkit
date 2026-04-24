"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { LEMON_SQUEEZY_CHECKOUT_URL } from "@/lib/constants/lemon-squeezy";

/**
 * Launch-week tactic from docs/GO_TO_MARKET.md — "First 100 customers
 * — free setup". Full-width banner above the header, dismissable via
 * X. Removed from the page around week-2 post-launch by deleting the
 * mount in app/[locale]/page.tsx.
 *
 * Dismissal persists in localStorage under `mailkit.announcement.v1`
 * so a user who closes it doesn't see it again on return visits. Key
 * is versioned — bumping to `.v2` resets it for everyone when the
 * copy/offer rotates.
 */
const STORAGE_KEY = "mailkit.announcement.v1";

export function AnnouncementBanner() {
  const t = useTranslations("landing.announcementBanner");
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read-once sync with localStorage for the dismissed flag. We
    // intentionally flip React state inside the effect — there's no
    // server-side source for this value, and useSyncExternalStore
    // adds more surface area than the single-mount localStorage read
    // needs. Classic setup-time effect; the lint rule's "cascading
    // renders" warning does not apply because the effect runs once.
    let nextDismissed = false;
    try {
      nextDismissed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // localStorage may throw under privacy modes — banner stays visible.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(nextDismissed);
    setHydrated(true);
  }, []);

  if (!hydrated || dismissed) return null;

  function onDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // no-op — session-only dismissal is fine
    }
  }

  return (
    <div className="relative w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 text-sm sm:gap-4">
        <span className="font-medium">{t("message")}</span>
        <a
          href={LEMON_SQUEEZY_CHECKOUT_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline-offset-2 hover:underline"
        >
          {t("cta")}
        </a>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
