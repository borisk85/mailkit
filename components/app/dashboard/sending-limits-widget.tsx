import type { SendUsage } from "@/lib/dashboard-data";

function LimitBar({
  count,
  limit,
  label,
}: {
  count: number;
  limit: number;
  label: string;
}) {
  const pct = limit > 0 ? Math.min((count / limit) * 100, 100) : 0;
  const color =
    pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-400" : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-mk-text-tertiary">{label}</span>
        <span className="tabular-nums text-mk-text-secondary">
          {count.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-mk-border-subtle">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SendingLimitsWidget({ usage }: { usage: SendUsage }) {
  return (
    <div className="space-y-2 rounded-lg border border-mk-border-subtle px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-mk-text-tertiary">
        Sending usage today
      </p>
      <LimitBar count={usage.day.count} limit={usage.day.limit} label="Today" />
      <LimitBar
        count={usage.hour.count}
        limit={usage.hour.limit}
        label="This hour"
      />
    </div>
  );
}
