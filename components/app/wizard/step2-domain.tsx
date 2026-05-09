"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, ExternalLink, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Zone = { id: string; name: string; accountId: string };

// ─── NS warning card ──────────────────────────────────────────────────────────

function NsWarningCard({ domain }: { domain: string }) {
  const t = useTranslations("setup.nsWarning");

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-mk-warning/40 bg-mk-warning/8 p-4"
    >
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-mk-warning"
        aria-hidden
      />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-mk-text-primary">
          {t("heading", { domain })}
        </p>
        <p className="text-sm text-mk-text-secondary">{t("body")}</p>
        <a
          href="https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-sm font-medium text-mk-warning underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Migrate to Cloudflare DNS →
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}

// ─── Email preview ────────────────────────────────────────────────────────────

function EmailPreview({
  mailbox,
  domain,
  label,
}: {
  mailbox: string;
  domain: string;
  label: string;
}) {
  const local = mailbox || "hello";
  return (
    <div className="flex items-center gap-2 rounded-md border border-mk-border-subtle bg-surface-elevated-2 px-3 py-2">
      <Globe className="size-4 shrink-0 text-mk-text-tertiary" aria-hidden />
      <p className="text-sm text-mk-text-secondary">
        {label}{" "}
        <span className="font-mono font-semibold text-mk-text-primary">
          {local}@{domain}
        </span>
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Step2DomainProps {
  zones: Zone[];
  isPending: boolean;
  nsWarningZoneId?: string | null; // zone ID that failed NS check (if any)
  onSubmit: (zoneId: string, mailboxLocal: string) => void;
}

export function Step2Domain({
  zones,
  isPending,
  nsWarningZoneId,
  onSubmit,
}: Step2DomainProps) {
  const t = useTranslations("setup.wizard.step2");
  const tSetup = useTranslations("setup.step2");

  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [mailboxLocal, setMailboxLocal] = useState("hello");

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === zoneId),
    [zones, zoneId],
  );

  const showNsWarning = Boolean(nsWarningZoneId && nsWarningZoneId === zoneId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId || !mailboxLocal.trim()) return;
    onSubmit(zoneId, mailboxLocal.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mk-heading-3 text-mk-text-primary">{t("heading")}</h2>
        <p className="mt-1.5 mk-body-small text-mk-text-secondary">
          {t("sub")}
        </p>
      </div>

      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        noValidate
        aria-label="Domain and mailbox selection"
      >
        {/* Zone selector */}
        <div className="space-y-1.5">
          <label
            htmlFor="zone-select"
            className="block text-sm font-semibold text-mk-text-primary"
          >
            {t("domainLabel")}
          </label>
          <select
            id="zone-select"
            className={cn(
              "block w-full rounded-lg border border-input bg-surface-elevated-2 px-3 py-2 text-sm text-mk-text-primary",
              "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:opacity-50 transition-colors",
            )}
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            disabled={isPending}
            aria-describedby={showNsWarning ? "ns-warning" : undefined}
          >
            <option value="" disabled>
              {tSetup("zonePlaceholder")}
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        {/* NS warning — shown but doesn't block form */}
        {showNsWarning && selectedZone && (
          <div id="ns-warning">
            <NsWarningCard domain={selectedZone.name} />
          </div>
        )}

        {/* Mailbox input */}
        <div className="space-y-1.5">
          <label
            htmlFor="mailbox-input"
            className="block text-sm font-semibold text-mk-text-primary"
          >
            {t("mailboxLabel")}
          </label>
          <Input
            id="mailbox-input"
            className="font-mono"
            placeholder="hello"
            value={mailboxLocal}
            onChange={(e) =>
              setMailboxLocal(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9._-]/g, "")
                  .slice(0, 64),
              )
            }
            disabled={isPending}
            pattern="[a-z0-9._-]{1,64}"
            required
            aria-describedby="mailbox-help"
          />
          <p id="mailbox-help" className="text-xs text-mk-text-tertiary">
            {t("mailboxHelp")}
          </p>
        </div>

        {/* Live email preview */}
        {selectedZone && (
          <EmailPreview
            mailbox={mailboxLocal}
            domain={selectedZone.name}
            label={t("preview")}
          />
        )}

        {/* Submit */}
        <Button
          type="submit"
          className={cn(
            "w-full bg-mk-accent text-white hover:bg-mk-accent-hover mk-cta-shadow",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          disabled={isPending || !zoneId || !mailboxLocal.trim()}
        >
          {isPending ? tSetup("ctaLoading") : t("cta")}
        </Button>
      </form>
    </div>
  );
}
