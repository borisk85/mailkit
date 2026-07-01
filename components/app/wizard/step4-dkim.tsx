"use client";

import { Bell, Clock, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Step4DkimProps {
  destinationEmail: string;
  isLongPoll?: boolean;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step4Dkim({
  destinationEmail,
  isLongPoll = false,
}: Step4DkimProps) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Icon + heading */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-full border-2 border-mk-border-subtle bg-surface-elevated",
              !isLongPoll && "animate-pulse",
            )}
          >
            <Clock className="size-8 text-mk-accent" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <h2 className="mk-heading-3 text-mk-text-primary">
              Verifying your domain
            </h2>
            <p className="text-xs text-mk-text-tertiary">
              Runs automatically in the background — no action needed.
            </p>
          </div>
        </div>

        {/* Status badge — live focal point + long-poll note right under it */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-lg border border-mk-accent/30 bg-mk-accent/5 px-4 py-2.5">
            <Loader2
              className="size-4 shrink-0 animate-spin text-mk-accent"
              aria-hidden
            />
            <span className="text-sm font-medium text-mk-text-primary">
              Checking every 30 seconds...
            </span>
          </div>
          {isLongPoll && (
            <p className="text-center text-sm font-medium text-mk-accent">
              Taking longer than usual — it&apos;s normal.
            </p>
          )}
        </div>

        {/* Close-tab reassurance */}
        <div className="flex items-center gap-1.5 rounded-lg border border-mk-border-subtle bg-surface-elevated-2 px-3 py-2.5 text-xs leading-snug text-mk-text-tertiary">
          <Bell className="size-3.5 shrink-0" aria-hidden />
          <p>
            You can safely close this tab. We&apos;ll email{" "}
            <span className="font-mono">{destinationEmail}</span> when the
            verification completes.
          </p>
        </div>
      </div>
    </div>
  );
}
