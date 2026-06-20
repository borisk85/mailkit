import { type ReactNode } from "react";

/**
 * Soft status pill used across the dashboard. Premium-pass tones
 * resolve through CSS custom properties (--mk-success / --mk-warning
 * / --mk-danger / --mk-accent) so the badge picks up the same accent
 * palette as the rest of the app — no separate Tailwind colour scale
 * to keep in sync. Background uses an inline rgba blend at 12 %
 * opacity to match the architect's pill spec.
 */
type Tone = "neutral" | "info" | "warn" | "success" | "danger";

const toneStyle: Record<Tone, { color: string; bg: string }> = {
  neutral: {
    color: "var(--mk-text-secondary)",
    bg: "var(--muted)",
  },
  info: {
    color: "var(--mk-accent)",
    bg: "rgba(124, 92, 255, 0.12)",
  },
  warn: {
    color: "var(--mk-warning)",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  success: {
    color: "var(--mk-success)",
    bg: "rgba(34, 197, 94, 0.12)",
  },
  danger: {
    color: "var(--mk-danger)",
    bg: "rgba(239, 68, 68, 0.12)",
  },
};

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const style = toneStyle[tone];
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: style.color, backgroundColor: style.bg }}
    >
      {children}
    </span>
  );
}
