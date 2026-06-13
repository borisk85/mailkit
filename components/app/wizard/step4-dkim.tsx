"use client";

import { Check, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Step4DkimProps {
  zoneName: string;
  mailboxLocal: string;
  destinationEmail: string;
  isLongPoll?: boolean;
  emailRequested?: boolean;
  onRequestEmail: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step4Dkim({
  zoneName,
  mailboxLocal,
  destinationEmail,
  isLongPoll = false,
  emailRequested = false,
  onRequestEmail,
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
            <Clock className="size-8 text-mk-text-secondary" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <h2 className="mk-heading-3 text-mk-text-primary">
              Verifying your domain
            </h2>
            <p className="text-xs text-mk-text-tertiary">
              Postmark domain verification typically takes ~5–15 minutes,
              sometimes up to ~30 min.
            </p>
            <p className="text-xs font-mono text-mk-text-tertiary">
              {mailboxLocal}@{zoneName}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-center gap-2 rounded-lg border border-mk-border-subtle bg-surface-elevated px-4 py-2.5">
          <Loader2
            className="size-4 shrink-0 animate-spin text-mk-accent"
            aria-hidden
          />
          <span className="text-sm text-mk-text-secondary">
            Checking every 30 seconds...
          </span>
        </div>

        {/* Long-poll warning */}
        {isLongPoll && (
          <div className="rounded-lg border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
            Taking longer than usual. This can happen with some DNS providers —
            it&apos;s normal.
          </div>
        )}

        {/* Email CTA */}
        <div className="space-y-3 text-center">
          {emailRequested ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-mk-border-subtle bg-surface-elevated px-4 py-1.5 text-sm text-mk-text-secondary">
              <Check className="size-4 text-green-500" aria-hidden />
              We&apos;ll email you when ready
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onRequestEmail}>
              Email me when ready
            </Button>
          )}

          <p className="text-xs leading-snug text-mk-text-tertiary">
            You can safely close this tab. We&apos;ll email{" "}
            <span className="font-mono font-medium">{destinationEmail}</span>{" "}
            when the verification completes.
          </p>
        </div>
      </div>
    </div>
  );
}
