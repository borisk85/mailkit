/**
 * Layer 2 anti-abuse — deliverability predicate.
 *
 * Pure functions over a Postmark aggregated stats report. The cron does
 * the API read (lib/integrations/postmark-stats.ts) and the DB write
 * (deliverability_snapshots row + abuse_events audit); this file
 * decides whether the rates cross any threshold and what action to
 * take.
 *
 * Thresholds taken from docs/TECH_ABUSE_MITIGATIONS.md §3.1, frozen
 * for MVP. Window default is 7 days rolling — the cron passes that
 * window to the Postmark report when fetching.
 */

/** Minimal report shape consumed by evaluateDeliverability. Satisfied by both
 *  Postmark stats response and any future provider. */
export type AggregatedReportInput = {
  requests: number;
  hardBounces: number;
  softBounces: number;
  spamReports: number;
  unsubscribed: number;
};

export type DeliverabilityThresholds = {
  /** Bounce rate above this (%) → suspended. */
  bounce: number;
  /** Complaint (spam-report) rate above this (%) → suspended (immediate). */
  complaint: number;
  /** Unsubscribe rate above this (%) → warned (not suspended). */
  unsubscribe: number;
};

export const DEFAULT_DELIVERABILITY_THRESHOLDS: DeliverabilityThresholds = {
  bounce: 5,
  complaint: 0.1,
  unsubscribe: 2,
};

export type DeliverabilityAction = "warned" | "suspended" | null;

export type DeliverabilityEvaluation = {
  action: DeliverabilityAction;
  /** Human-readable reason for the action ("complaint_threshold", etc.).
   * Drives abuse_events.event_type. */
  reason: string | null;
  rates: {
    bounce: number;
    complaint: number;
    unsubscribe: number;
  };
  counts: {
    requests: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  };
  thresholds: DeliverabilityThresholds;
};

/**
 * Compute rates + decide action from a Postmark aggregated report.
 *
 * Action priority (most-severe wins):
 *   1. complaint_threshold → suspended (immediate, even one over the
 *      0.1% line is enough to spike Postmark's own complaint counter).
 *   2. bounce_threshold → suspended (recipient list quality).
 *   3. unsubscribe_threshold → warned (informational, customer keeps
 *      sending).
 *   4. (none) → null, no action.
 *
 * `requests=0` short-circuits to no-action with rates=0 — the domain
 * sent nothing this window, can't be over any threshold.
 */
export function evaluateDeliverability(
  report: AggregatedReportInput,
  thresholds: DeliverabilityThresholds = DEFAULT_DELIVERABILITY_THRESHOLDS,
): DeliverabilityEvaluation {
  const requests = Math.max(0, report.requests ?? 0);
  const bounced = (report.hardBounces ?? 0) + (report.softBounces ?? 0);
  const complained = report.spamReports ?? 0;
  const unsubscribed = report.unsubscribed ?? 0;

  const rates = {
    bounce: requests === 0 ? 0 : (bounced / requests) * 100,
    complaint: requests === 0 ? 0 : (complained / requests) * 100,
    unsubscribe: requests === 0 ? 0 : (unsubscribed / requests) * 100,
  };

  let action: DeliverabilityAction = null;
  let reason: string | null = null;

  if (rates.complaint > thresholds.complaint) {
    action = "suspended";
    reason = "complaint_threshold";
  } else if (rates.bounce > thresholds.bounce) {
    action = "suspended";
    reason = "bounce_threshold";
  } else if (rates.unsubscribe > thresholds.unsubscribe) {
    action = "warned";
    reason = "unsubscribe_threshold";
  }

  return {
    action,
    reason,
    rates,
    counts: { requests, bounced, complained, unsubscribed },
    thresholds,
  };
}

/**
 * Format a rate (0..100) for storage in the deliverability_snapshots
 * numeric(6,3) column. Clamps to two decimal places of the percentage
 * (e.g. 0.123 → 0.12, 5.6789 → 5.68). Three-decimal precision is
 * available for sub-percent thresholds (complaint).
 */
export function formatRateForStorage(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  // Round to 3 decimal places so 0.1% threshold isn't lost to fp noise.
  return Math.round(rate * 1000) / 1000;
}
