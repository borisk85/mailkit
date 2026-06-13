"use client";

import { CheckCircle2, Circle, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/** CF phase substep keys in order. */
const CF_SUBSTEPS = ["routing", "dns", "destination", "rule"] as const;
type CfReached = "routing" | "dns" | "destination" | "rule" | "done";

/** SMTP phase substep keys in order. */
const SMTP_SUBSTEPS = ["sender", "dns", "verify"] as const;
type SmtpReached = "sender" | "dns" | "verify" | "done";

export interface Step3ProgressProps {
  phase: "cf" | "smtp";
  /** CF phase: "routing" | "dns" | "destination" | "rule" | "done" */
  /** SMTP phase: "sender" | "dns" | "verify" | "done" */
  reached: CfReached | SmtpReached;
  zoneName: string;
  mailboxLocal: string;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const CF_LABELS: Record<(typeof CF_SUBSTEPS)[number], string> = {
  routing: "Enabling Email Routing",
  dns: "Configuring DNS records",
  destination: "Verifying destination address",
  rule: "Setting routing rules",
};

const SMTP_LABELS: Record<(typeof SMTP_SUBSTEPS)[number], string> = {
  sender: "Creating email sender",
  dns: "Adding DNS records",
  verify: "Verifying DKIM signature",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cfSubstepStatus(
  key: (typeof CF_SUBSTEPS)[number],
  reached: CfReached,
): "done" | "running" | "pending" {
  if (reached === "done") return "done";
  const order: CfReached[] = ["routing", "dns", "destination", "rule"];
  const iReached = order.indexOf(reached);
  const iKey = order.indexOf(key);
  if (iKey < iReached) return "done";
  if (iKey === iReached) return "running";
  return "pending";
}

function smtpSubstepStatus(
  key: (typeof SMTP_SUBSTEPS)[number],
  reached: SmtpReached,
): "done" | "running" | "pending" {
  if (reached === "done") return "done";
  const order: SmtpReached[] = ["sender", "dns", "verify"];
  const iReached = order.indexOf(reached);
  const iKey = order.indexOf(key);
  if (iKey < iReached) return "done";
  if (iKey === iReached) return "running";
  return "pending";
}

// ─── SubstepRow ───────────────────────────────────────────────────────────────

function SubstepRow({
  label,
  status,
}: {
  label: string;
  status: "done" | "running" | "pending";
}) {
  return (
    <li className="flex items-center gap-3">
      {status === "done" ? (
        <CheckCircle2 className="size-5 shrink-0 text-green-500" aria-hidden />
      ) : status === "running" ? (
        <Loader2
          className="size-5 shrink-0 animate-spin text-mk-accent"
          aria-hidden
        />
      ) : (
        <Circle className="size-5 shrink-0 text-mk-text-tertiary" aria-hidden />
      )}
      <span
        className={cn(
          "text-sm leading-snug",
          status === "done" &&
            "text-mk-text-secondary line-through decoration-mk-text-tertiary",
          status === "running" && "font-medium text-mk-text-primary",
          status === "pending" && "text-mk-text-tertiary",
        )}
      >
        {label}
      </span>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step3Progress({
  phase,
  reached,
  zoneName,
  mailboxLocal,
}: Step3ProgressProps) {
  const heading =
    phase === "cf"
      ? "We're configuring your email"
      : "Setting up your email sender";

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-mk-border-subtle bg-surface-elevated p-10 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="mk-heading-3 text-mk-text-primary">{heading}</h2>
          <p className="text-xs text-mk-text-tertiary">
            This takes ~30–90 seconds. Stay on this page.
          </p>
          <p className="text-xs text-mk-text-tertiary font-mono">
            {mailboxLocal}@{zoneName}
          </p>
        </div>

        {/* Substep list */}
        <ol className="space-y-4" aria-label="Setup progress">
          {phase === "cf"
            ? CF_SUBSTEPS.map((key) => (
                <SubstepRow
                  key={key}
                  label={CF_LABELS[key]}
                  status={cfSubstepStatus(key, reached as CfReached)}
                />
              ))
            : SMTP_SUBSTEPS.map((key) => (
                <SubstepRow
                  key={key}
                  label={SMTP_LABELS[key]}
                  status={smtpSubstepStatus(key, reached as SmtpReached)}
                />
              ))}
        </ol>

        {/* Security note */}
        <div className="flex items-start gap-2 rounded-lg border border-mk-border-subtle bg-surface-elevated-2 px-3 py-2.5">
          <Shield
            className="mt-0.5 size-4 shrink-0 text-mk-text-tertiary"
            aria-hidden
          />
          <p className="text-xs leading-snug text-mk-text-tertiary">
            Your Cloudflare credentials are used only for this setup and are
            never stored.
          </p>
        </div>
      </div>
    </div>
  );
}
