import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

/**
 * First-visit empty state — premium-pass refresh per UI_REVIEW_BRIEF
 * §3.1 + §6.4. Wraps the title with a soft ambient circle behind a
 * Sparkles glyph so the empty card has a visual focal point instead
 * of plain text-on-card. The CTA still points at /app/setup which
 * enforces the purchase gate.
 */
export function DashboardEmptyState() {
  const t = useTranslations("dashboard.emptyState");
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-mk-border-strong bg-surface-elevated p-12 text-center mk-card-shadow">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(124, 92, 255, 0.12), transparent 70%)",
        }}
      />
      <div className="relative mx-auto mb-6 inline-flex size-16 items-center justify-center rounded-full bg-mk-accent/10">
        <Mail className="size-8 text-mk-accent" aria-hidden />
      </div>
      <h2 className="mk-heading-3 text-mk-text-primary">{t("title")}</h2>
      <div className="mt-3">
        <StatusBadge tone="neutral">{t("body")}</StatusBadge>
      </div>
      <Link href="/app/setup" className="mt-6 inline-flex">
        <Button>{t("cta")}</Button>
      </Link>
    </div>
  );
}
