"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkle, X } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

/**
 * Launch-week banner — premium-pass refresh per UI_REVIEW_BRIEF §2.1.
 * Replaces the old gradient-red full-width strip with a thin accent
 * wash that's present but doesn't dominate. 36px tall, 8% accent
 * background, sparkle icon, body-small typography.
 *
 * Dismissal persists in localStorage under `mailkit.announcement.v1`.
 * Bump suffix to `.v2` when copy rotates to re-prompt all users.
 */
const STORAGE_KEY = "mailkit.announcement.v1";

export function AnnouncementBanner() {
  const t = useTranslations("landing.announcementBanner");
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
    <div
      className="relative w-full border-b border-mk-border-subtle"
      style={{ backgroundColor: "rgba(124, 92, 255, 0.08)" }}
    >
      <div className="mx-auto flex h-9 max-w-6xl items-center justify-center gap-2 px-4 sm:gap-3">
        <Sparkle className="size-3.5 text-mk-accent opacity-70" aria-hidden />
        <span className="mk-body-small font-medium text-mk-text-secondary">
          {t("message")}
        </span>
        <a
          href={withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL)}
          target="_blank"
          rel="noreferrer"
          className="mk-body-small font-medium text-mk-text-primary underline-offset-4 hover:underline"
        >
          {t("cta")}
        </a>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-mk-text-tertiary opacity-50 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
