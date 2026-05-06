"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "mailkit-cookie-consent-v1";
const FIRST_PAINT_DELAY_MS = 4000;
const HERO_SENTINEL_ID = "hero-end-sentinel";

function readPersistedShouldShow(): boolean {
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
 * EU-style cookie consent (#39, redesigned per Design V2 §3).
 *
 * V2 fixes the V1 banner that, as a 520 px bottom-right card, landed
 * on top of the hero CTA on mobile and the Gmail mockup on desktop.
 * Three changes:
 *
 *   1. Compact pill — bottom-center on desktop (auto width, full
 *      pill shape), bottom-edge on mobile (rounded card). The bar
 *      no longer competes with the hero's right column.
 *   2. Tighter copy in both locales (single-sentence body).
 *   3. Above-the-fold suppression — banner does NOT mount on first
 *      paint. It only appears after the user scrolls past the hero
 *      sentinel OR 4 s elapse, whichever comes first. Returning
 *      users with the dismissed flag persisted in localStorage stay
 *      hidden either way.
 *
 * Cookie posture stays minimal — only OAuth + locale, no trackers.
 * The banner is transparency + EU-compliance signal, not a hard
 * gate. Storage key has a v1 suffix so a future policy change can
 * re-prompt by bumping the suffix.
 */
export function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sentinel = document.getElementById(HERO_SENTINEL_ID);
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      if (readPersistedShouldShow()) setShouldShow(true);
    };
    const timer = window.setTimeout(reveal, FIRST_PAINT_DELAY_MS);
    // Delay banner until user has scrolled past 130% of viewport height so
    // it doesn't overlap the hero subhead on tablet portrait (768px).
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 1.3) reveal();
    };
    const io = sentinel
      ? new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) onScroll();
        })
      : null;
    if (sentinel && io) io.observe(sentinel);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

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
      className="fixed left-2 right-2 bottom-2 z-50 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-mk-border-strong bg-surface-elevated-2/95 px-4 py-3 backdrop-blur-md mk-card-shadow sm:left-1/2 sm:right-auto sm:bottom-4 sm:-translate-x-1/2 sm:rounded-full sm:px-5 sm:py-2.5"
    >
      <p className="mk-body-small text-mk-text-secondary">{t("body")}</p>
      <div className="flex items-center gap-3">
        <Button onClick={handleAccept} size="sm" className="shrink-0">
          {t("accept")}
        </Button>
        <Link
          href="/privacy"
          className="mk-body-small font-medium text-mk-text-secondary underline-offset-4 hover:text-mk-text-primary hover:underline"
        >
          {t("details")}
        </Link>
      </div>
    </div>
  );
}
