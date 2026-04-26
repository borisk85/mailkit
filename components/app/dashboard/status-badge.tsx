import { type ReactNode } from "react";

/**
 * Soft status pill used across the dashboard. Tailwind-only, no
 * shadcn primitive — the four tones map onto the four
 * SetupOverallState buckets and the four PurchaseStatus values.
 */
type Tone = "neutral" | "info" | "warn" | "success" | "danger";

const toneClass: Record<Tone, string> = {
  neutral:
    "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  warn: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  danger:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
