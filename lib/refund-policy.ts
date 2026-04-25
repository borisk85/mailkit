/**
 * Auto-refund policy — pure boolean predicate on the failed step of a
 * setup_runs row. Per GUARANTEE_POLICY.md "Automation Failure Refund"
 * clause + architect's approved table: auto-refund ONLY on clear
 * backend failures where our own code was the explicit cause.
 *
 * Step values map to the STEP constants emitted by
 * app/[locale]/app/setup/actions.ts — cf_state.last_step carries the
 * same string. `failed_step` in setup_runs is conceptual; the actual
 * column is `cf_state.last_step` at the moment `failRun` sets status
 * to "failed".
 *
 * Ambiguous cases (user did not click the CF destination verify
 * link, user mis-configured Gmail Send-As) land on the 30-day
 * manual-refund path instead. Support handles case-by-case with
 * setup_runs DB evidence.
 */

const AUTO_REFUND_STEPS = new Set<string>([
  // Cloudflare pipeline — our code called the CF API and it failed.
  "enable_routing",
  "dns_upsert",
  "list_destinations", // CF API error; awaiting-verify timeout is a separate non-failed state
  "create_destination",
  "list_rules",
  "create_rule",
  // Brevo pipeline — our code called Brevo / wrote DNS for SPF/DMARC.
  "brevo_create_sender",
  "brevo_dns_upsert",
  "brevo_spf_merge",
  "brevo_verify",
  "brevo_finalize",
]);

/**
 * True when a failed setup_runs row with the given step should trigger
 * an automatic full refund. False for steps where the failure is
 * ambiguous or user-attributable — those fall through to the 30-day
 * manual path.
 *
 * Steps not covered here (start, list_zones, gmail_prepare,
 * gmail_confirm) default to NO — start/list_zones are pre-charge
 * (user hasn't completed the pipeline yet at that point, though still
 * treat conservatively), and gmail_* steps are guided clicks the user
 * drives manually.
 */
export function shouldAutoRefund(step: string | null | undefined): boolean {
  if (!step) return false;
  return AUTO_REFUND_STEPS.has(step);
}
