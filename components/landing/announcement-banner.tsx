"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

const STORAGE_KEY = "mailkit.announcement.v2";

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

  function onDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // no-op
    }
  }

  return (
    <div className="relative w-full bg-amber-300 text-stone-900">
      <a
        href={withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL)}
        target="_blank"
        rel="noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        <div className="mx-auto flex min-h-10 max-w-6xl items-center justify-center px-10 py-2 text-center">
          <span className="mk-body-small font-semibold">{t("message")}</span>
        </div>
      </a>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-stone-900 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
