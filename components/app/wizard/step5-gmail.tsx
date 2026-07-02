"use client";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Step5GmailProps {
  zoneName: string;
  mailboxLocal: string;
  destinationEmail: string;
  children?: React.ReactNode;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Wrapper shown at wizard step 5.
 * The actual Gmail wizard logic lives in setup-wizard.tsx (GmailWizard).
 * This component provides the contextual heading/subtext above it.
 */
export function Step5Gmail({
  zoneName,
  mailboxLocal,
  destinationEmail: _destinationEmail,
  children,
}: Step5GmailProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="mk-heading-3 text-mk-text-primary">
          Final step: Gmail Send-As
        </h2>
        <p className="text-xs text-mk-text-tertiary">
          Copy 4 values into Gmail settings, step by step.
        </p>
        <p className="text-xs font-mono text-mk-text-tertiary">
          {mailboxLocal}@{zoneName}
        </p>
      </div>

      {children}
    </div>
  );
}
