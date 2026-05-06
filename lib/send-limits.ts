/**
 * Layer 1 anti-abuse — per-domain send-limit predicate.
 *
 * Pure functions over the `send_counters` rows the cron syncs from
 * Postmark every 5-10 minutes. No DB / network here — the cron does the
 * read, this file decides whether the counters cross any threshold.
 *
 * Thresholds taken from docs/TECH_ABUSE_MITIGATIONS.md §2.1, frozen
 * for MVP. Subscribers can override per-domain via
 * purchases.custom_limits (post-launch, not in MVP code path).
 */

export type WindowType = "day" | "hour" | "minute";

export type SendCounterRow = {
  domain: string;
  window_type: WindowType;
  window_start: string;
  count: number;
};

export type SendLimitThresholds = Record<WindowType, number>;

export const DEFAULT_SEND_LIMITS: SendLimitThresholds = {
  day: 500,
  hour: 50,
  minute: 5,
};

export type SendLimitEvaluation = {
  overLimit: boolean;
  exceeded: WindowType[];
  /**
   * For each window: the active counter's count + the threshold. Useful
   * for the email-to-customer template which needs to interpolate
   * concrete numbers (`<period>`, `<N>`, `<лимит>`).
   */
  windows: Record<
    WindowType,
    {
      count: number;
      limit: number;
      windowStart: string | null;
    }
  >;
};

/**
 * Compute the bucket-start ISO timestamps for the three windows the
 * limit rules cover, based on `now`. Bucket boundaries are floored
 * to the window unit in UTC (so a 17:42:31 instant maps to a minute
 * bucket starting at 17:42:00, an hour bucket at 17:00:00, a day
 * bucket at 00:00:00).
 *
 * The cron uses these strings to look up the row in send_counters
 * via the (domain, window_type, window_start) unique index.
 */
export function currentWindowBuckets(now: Date): Record<WindowType, string> {
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const hourStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
    ),
  );
  const minuteStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
    ),
  );
  return {
    day: dayStart.toISOString(),
    hour: hourStart.toISOString(),
    minute: minuteStart.toISOString(),
  };
}

/**
 * Evaluate counters for a specific domain at `now`. Counter rows
 * outside the active buckets (older windows) are ignored — they're
 * historical and irrelevant to the current limit decision. Rows for
 * other domains are also filtered out so the caller can pass a
 * pre-loaded list spanning multiple customers.
 */
export function evaluateSendLimits(args: {
  domain: string;
  counters: SendCounterRow[];
  now: Date;
  thresholds?: SendLimitThresholds;
}): SendLimitEvaluation {
  const { domain, counters, now } = args;
  const thresholds = args.thresholds ?? DEFAULT_SEND_LIMITS;
  const buckets = currentWindowBuckets(now);

  const windows: SendLimitEvaluation["windows"] = {
    day: { count: 0, limit: thresholds.day, windowStart: null },
    hour: { count: 0, limit: thresholds.hour, windowStart: null },
    minute: { count: 0, limit: thresholds.minute, windowStart: null },
  };

  for (const row of counters) {
    if (row.domain !== domain) continue;
    const expected = buckets[row.window_type];
    if (!expected) continue;
    if (!sameInstant(row.window_start, expected)) continue;
    windows[row.window_type] = {
      count: row.count,
      limit: thresholds[row.window_type],
      windowStart: row.window_start,
    };
  }

  const exceeded: WindowType[] = [];
  for (const w of ["day", "hour", "minute"] as WindowType[]) {
    if (windows[w].count > windows[w].limit) exceeded.push(w);
  }

  return {
    overLimit: exceeded.length > 0,
    exceeded,
    windows,
  };
}

/**
 * Active customer-facing label for a window. Used in the suspension
 * email when interpolating the `<period>` placeholder, so the copy
 * reads naturally regardless of which window tripped first.
 */
export function periodLabel(window: WindowType): string {
  return { day: "day", hour: "hour", minute: "minute" }[window];
}

function sameInstant(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return false;
  return ta === tb;
}
