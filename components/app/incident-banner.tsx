"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "mailkit_incident_dismissed";

function shouldShow(): boolean {
  if (process.env.NEXT_PUBLIC_INCIDENT_ACTIVE !== "1") return false;
  try {
    return !sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return true;
  }
}

export function IncidentBanner() {
  // Lazy initializer runs only on client — reads sessionStorage safely
  const [visible, setVisible] = useState(() =>
    typeof window !== "undefined" ? shouldShow() : false,
  );

  if (!visible) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  }

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 bg-red-600 px-4 py-3 text-white dark:bg-red-700">
      <p className="flex-1 text-sm font-medium leading-snug">
        <span className="font-semibold">Action required:</span> update your SMTP
        credentials to restore email sending.{" "}
        <Link
          href="/app/setup"
          className="underline underline-offset-2 hover:no-underline"
        >
          Open setup →
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 hover:bg-red-500 dark:hover:bg-red-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
