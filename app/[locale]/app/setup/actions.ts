"use server";

import { z } from "zod";

import {
  CloudflareError,
  createCloudflareClient,
  type CloudflareClient,
  type DnsRecordInput,
} from "@/lib/integrations/cloudflare";
import {
  upsertDnsByPattern,
  DnsUpsertError,
} from "@/lib/integrations/cloudflare-dns-upsert";
import { addSpfInclude, SpfMergeHardFail } from "@/lib/integrations/dns-merge";
import {
  PostmarkError,
  createPostmarkAccountClient,
  type PostmarkDomain,
  type PostmarkAccountClient,
} from "@/lib/integrations/postmark";
import {
  PostmarkSmtpConfigError,
  buildPostmarkSmtpDisplay,
  type SmtpDisplay,
} from "@/lib/integrations/postmark-smtp";
import { triggerAutoRefund } from "@/lib/auto-refund";
import { checkPhishingPattern } from "@/lib/phishing";
import { sendTelegramAlert, escapeHtml } from "@/lib/telegram-alert";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Etap 2 — server actions for Ticket #4a Cloudflare setup pipeline.
 *
 * Tokens live in-memory per request. Reads through anon client (RLS);
 * writes to setup_runs through service_role (updates have no client policy).
 * Error keys are i18n namespaces — copy lives in messages/{en,ru}.json
 * under `setup.errors.*` (added in etap 3).
 */

const MAILBOX_LOCAL_RE = /^[a-z0-9._-]{1,64}$/;

const STEP = {
  start: "start",
  listZones: "list_zones",
  enableRouting: "enable_routing",
  dnsUpsert: "dns_upsert",
  listDestinations: "list_destinations",
  createDestination: "create_destination",
  listRules: "list_rules",
  createRule: "create_rule",
  smtpCreateSender: "brevo_create_sender",
  smtpDnsUpsert: "brevo_dns_upsert",
  smtpSpfMerge: "brevo_spf_merge",
  smtpVerify: "brevo_verify",
  smtpFinalize: "brevo_finalize",
  gmailPrepare: "gmail_prepare",
  gmailConfirm: "gmail_confirm",
} as const;
type Step = (typeof STEP)[keyof typeof STEP];

type ActionError = {
  status: "error";
  errorKey: string;
  details?: unknown;
};

type VerifyOk = {
  status: "ok";
  zones: Array<{ id: string; name: string; accountId: string }>;
};

type StartSetupOk = {
  status: "ok";
  runId: string;
  // Any valid status the run might already be in. The anti-double-click
  // resume path returns the existing row as-is so the UI can route to
  // the right stage without forcing the user back through earlier steps.
  runStatus:
    | "cf_routing_enabled"
    | "cf_dns_written"
    | "cf_awaiting_destination_verify"
    | "cf_rule_created"
    | "cf_done"
    | "brevo_sender_created"
    | "brevo_dns_written"
    | "brevo_verified"
    | "brevo_done"
    | "gmail_instructions_shown"
    | "gmail_smtp_ready"
    | "gmail_send_as_verified"
    | "done";
  destinationEmail: string;
};

type ResumeOk = {
  status: "ok";
  runId: string;
  runStatus: "cf_done" | "cf_awaiting_destination_verify";
  destinationEmail: string;
};

const verifyTokenSchema = z.object({
  token: z.string().min(20).max(200),
});

const startSetupSchema = z.object({
  token: z.string().min(20).max(200),
  zoneId: z.string().min(1).max(64),
  mailboxLocal: z
    .string()
    .min(1)
    .max(64)
    .regex(MAILBOX_LOCAL_RE, "mailbox_local_format"),
});

const resumeSchema = z.object({
  runId: z.string().uuid(),
  token: z.string().min(20).max(200),
});

function mapCfError(e: unknown): ActionError {
  if (!(e instanceof CloudflareError)) {
    return { status: "error", errorKey: "setup.errors.unexpected" };
  }
  const code = e.code;
  const http = e.httpStatus;
  const knownInvalid = code === 6003 || code === 10000 || code === 10001;
  const knownZone = code === 7003;
  const knownDns = code === 1001 || code === 1003;
  const knownRate = code === 10013 || http === 429;
  if (knownInvalid) {
    return { status: "error", errorKey: "setup.errors.invalid_token" };
  }
  if (knownZone) {
    return { status: "error", errorKey: "setup.errors.zone_not_found" };
  }
  if (knownDns) {
    return {
      status: "error",
      errorKey: "setup.errors.dns_rejected",
      details: { message: e.message },
    };
  }
  if (knownRate) {
    return { status: "error", errorKey: "setup.errors.rate_limited" };
  }
  if (http >= 500) {
    return { status: "error", errorKey: "setup.errors.cloudflare_unavailable" };
  }
  if (http >= 400 && http < 500) {
    return { status: "error", errorKey: "setup.errors.cloudflare_error" };
  }
  return { status: "error", errorKey: "setup.errors.cloudflare_error" };
}

async function getAuthenticatedUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

export async function verifyCloudflareToken(input: {
  token: string;
}): Promise<VerifyOk | ActionError> {
  const parsed = verifyTokenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      errorKey: "setup.errors.invalid_input",
      details: parsed.error.flatten(),
    };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { status: "error", errorKey: "setup.errors.not_authenticated" };
  }

  try {
    const cf = createCloudflareClient(parsed.data.token);
    const zones = await cf.listZones();
    return {
      status: "ok",
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        accountId: z.account.id,
      })),
    };
  } catch (e) {
    return mapCfError(e);
  }
}

async function failRun(
  admin: Awaited<ReturnType<typeof createServiceClient>>,
  runId: string,
  step: Step,
  message: string,
) {
  const { data } = await admin
    .from("setup_runs")
    .select("cf_state")
    .eq("id", runId)
    .maybeSingle();
  const nextState = { ...((data?.cf_state as object) ?? {}), last_step: step };
  await admin
    .from("setup_runs")
    .update({
      status: "failed",
      error_msg: message,
      cf_state: nextState,
    })
    .eq("id", runId);

  // Auto-refund on the subset of steps where the failure is clearly
  // our infra's fault (cf_* + smtp_* per lib/refund-policy.ts).
  // Policy-gated inside triggerAutoRefund; noop for gmail_* / start /
  // list_zones steps. Errors are swallowed inside the trigger — failing
  // the refund must not cascade into the failing action's caller.
  await triggerAutoRefund(admin, runId, step);
}

export async function startSetupRun(input: {
  token: string;
  zoneId: string;
  mailboxLocal: string;
}): Promise<StartSetupOk | ActionError> {
  const parsed = startSetupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      errorKey: "setup.errors.invalid_input",
      details: parsed.error.flatten(),
    };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { status: "error", errorKey: "setup.errors.not_authenticated" };
  }
  const destinationEmail = user.email;
  if (!destinationEmail) {
    return { status: "error", errorKey: "setup.errors.no_primary_email" };
  }

  const admin = createServiceClient();
  const cf = createCloudflareClient(parsed.data.token);

  // Anti-double-click: recent non-terminal run → resume idempotently.
  const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data: recent } = await admin
    .from("setup_runs")
    .select("id, status, created_at, cf_zone_id, mailbox_local")
    .eq("user_id", user.id)
    .not("status", "in", "(cf_done,failed)")
    .order("created_at", { ascending: false })
    .limit(5);

  const activeRow = (recent ?? []).find(
    (r) =>
      r.created_at >= thirtyMinAgo &&
      r.cf_zone_id === parsed.data.zoneId &&
      r.mailbox_local === parsed.data.mailboxLocal,
  );
  if (activeRow) {
    return {
      status: "ok",
      runId: activeRow.id,
      runStatus: activeRow.status as StartSetupOk["runStatus"],
      destinationEmail,
    };
  }

  // Mark stale (>30min) non-terminal runs as failed so we don't keep re-hitting them.
  for (const r of recent ?? []) {
    if (r.created_at < thirtyMinAgo) {
      await admin
        .from("setup_runs")
        .update({
          status: "failed",
          error_msg: "stale: superseded by newer run",
        })
        .eq("id", r.id);
    }
  }

  let zoneName = "";
  let accountId = "";
  try {
    const zones = await cf.listZones();
    const zone = zones.find((z) => z.id === parsed.data.zoneId);
    if (!zone) {
      return { status: "error", errorKey: "setup.errors.zone_not_found" };
    }
    zoneName = zone.name;
    accountId = zone.account.id;
  } catch (e) {
    return mapCfError(e);
  }

  const { data: inserted, error: insertError } = await admin
    .from("setup_runs")
    .insert({
      user_id: user.id,
      domain: zoneName,
      mailbox_local: parsed.data.mailboxLocal,
      status: "started",
      cf_zone_id: parsed.data.zoneId,
      cf_state: { account_id: accountId, last_step: STEP.start },
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { status: "error", errorKey: "setup.errors.db_insert_failed" };
  }
  const runId = inserted.id;

  return runCfPipeline({
    cf,
    admin,
    runId,
    zoneId: parsed.data.zoneId,
    zoneName,
    accountId,
    mailboxLocal: parsed.data.mailboxLocal,
    destinationEmail,
  });
}

type PipelineArgs = {
  cf: CloudflareClient;
  admin: Awaited<ReturnType<typeof createServiceClient>>;
  runId: string;
  zoneId: string;
  zoneName: string;
  accountId: string;
  mailboxLocal: string;
  destinationEmail: string;
};

async function runCfPipeline(
  args: PipelineArgs,
): Promise<StartSetupOk | ActionError> {
  const {
    cf,
    admin,
    runId,
    zoneId,
    zoneName,
    accountId,
    mailboxLocal,
    destinationEmail,
  } = args;

  // Step: enable routing
  try {
    const enable = await cf.enableEmailRouting(zoneId);
    await patchRun(admin, runId, {
      status: "cf_routing_enabled",
      merge: {
        routing_enabled: true,
        routing_skipped: enable.skipped,
        last_step: STEP.enableRouting,
      },
    });
  } catch (e) {
    await failRun(admin, runId, STEP.enableRouting, errMsg(e));
    return mapCfError(e);
  }

  // Step: DNS upsert (SPF + DMARC only).
  // MX records are managed by Cloudflare Email Routing automatically once
  // routing is enabled. Touching them via /dns_records returns CF error
  // 890190 ("This zone is managed by Email Routing. Disable Email Routing
  // to add/modify MX records."). SPF and DMARC stay under our control —
  // Email Routing does not create them and users need valid DMARC for
  // deliverability.
  const dmarcContent = `v=DMARC1; p=none; rua=mailto:postmaster@${zoneName}`;
  const desiredDns: Array<{
    key: "spf" | "dmarc";
    record: DnsRecordInput;
  }> = [
    {
      key: "spf",
      record: {
        type: "TXT",
        name: zoneName,
        content: "v=spf1 include:_spf.mx.cloudflare.net ~all",
        ttl: 1,
      },
    },
    {
      key: "dmarc",
      record: {
        type: "TXT",
        name: `_dmarc.${zoneName}`,
        content: dmarcContent,
        ttl: 1,
      },
    },
  ];

  const dnsIds: Record<string, string> = {};
  try {
    for (const item of desiredDns) {
      const existing = await cf.listDnsRecords(zoneId, {
        type: item.record.type,
        name: item.record.name,
      });
      const match = existing.find(
        (r) =>
          r.content === item.record.content &&
          (item.record.priority === undefined ||
            r.priority === item.record.priority),
      );
      if (match) {
        dnsIds[item.key] = match.id;
        continue;
      }
      // No exact match — see if there's a conflicting record we should update.
      const sameTypeAndHost = existing.find(
        (r) =>
          item.record.priority === undefined ||
          r.priority === item.record.priority,
      );
      if (sameTypeAndHost) {
        const updated = await cf.updateDnsRecord(
          zoneId,
          sameTypeAndHost.id,
          item.record,
        );
        dnsIds[item.key] = updated.id;
      } else {
        const created = await cf.createDnsRecord(zoneId, item.record);
        dnsIds[item.key] = created.id;
      }
    }
    await patchRun(admin, runId, {
      status: "cf_dns_written",
      merge: { dns: dnsIds, last_step: STEP.dnsUpsert },
    });
  } catch (e) {
    await failRun(admin, runId, STEP.dnsUpsert, errMsg(e));
    return mapCfError(e);
  }

  // Step: destination verification (account-level)
  let destinationVerified = false;
  try {
    const destinations = await cf.listEmailRoutingDestinations(accountId);
    const existing = destinations.find((d) => d.email === destinationEmail);
    if (!existing) {
      await cf.createEmailRoutingDestination(accountId, destinationEmail);
      await patchRun(admin, runId, {
        status: "cf_awaiting_destination_verify",
        merge: {
          destination_email: destinationEmail,
          destination_created: true,
          last_step: STEP.createDestination,
        },
      });
      return {
        status: "ok",
        runId,
        runStatus: "cf_awaiting_destination_verify",
        destinationEmail,
      };
    }
    destinationVerified = !!existing.verified;
    if (!destinationVerified) {
      await patchRun(admin, runId, {
        status: "cf_awaiting_destination_verify",
        merge: {
          destination_email: destinationEmail,
          destination_created: false,
          last_step: STEP.listDestinations,
        },
      });
      return {
        status: "ok",
        runId,
        runStatus: "cf_awaiting_destination_verify",
        destinationEmail,
      };
    }
  } catch (e) {
    await failRun(admin, runId, STEP.listDestinations, errMsg(e));
    return mapCfError(e);
  }

  return finalizeRule({
    cf,
    admin,
    runId,
    zoneId,
    zoneName,
    mailboxLocal,
    destinationEmail,
  });
}

type FinalizeArgs = Omit<PipelineArgs, "accountId">;

async function finalizeRule(
  args: FinalizeArgs,
): Promise<StartSetupOk | ActionError> {
  const { cf, admin, runId, zoneId, zoneName, mailboxLocal, destinationEmail } =
    args;
  const targetMatcher = `${mailboxLocal}@${zoneName}`;

  try {
    const rules = await cf.listEmailRoutingRules(zoneId);
    const existing = rules.find(
      (r) =>
        r.matchers.some(
          (m) =>
            m.type === "literal" &&
            m.field === "to" &&
            m.value === targetMatcher,
        ) &&
        r.actions.some(
          (a) => a.type === "forward" && a.value.includes(destinationEmail),
        ),
    );
    let ruleId = existing?.id ?? null;
    if (!existing) {
      const created = await cf.createEmailRoutingRule(zoneId, {
        enabled: true,
        matchers: [{ type: "literal", field: "to", value: targetMatcher }],
        actions: [{ type: "forward", value: [destinationEmail] }],
      });
      ruleId = created.id ?? null;
    }
    await patchRun(admin, runId, {
      status: "cf_rule_created",
      merge: {
        rule_id: ruleId,
        rule_skipped: !!existing,
        last_step: STEP.createRule,
      },
    });
  } catch (e) {
    await failRun(admin, runId, STEP.createRule, errMsg(e));
    return mapCfError(e);
  }

  await patchRun(admin, runId, {
    status: "cf_done",
    merge: { last_step: STEP.createRule },
  });
  return {
    status: "ok",
    runId,
    runStatus: "cf_done",
    destinationEmail,
  };
}

export async function resumeDestinationVerify(input: {
  runId: string;
  token: string;
}): Promise<ResumeOk | ActionError> {
  const parsed = resumeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      errorKey: "setup.errors.invalid_input",
      details: parsed.error.flatten(),
    };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { status: "error", errorKey: "setup.errors.not_authenticated" };
  }

  const admin = createServiceClient();
  const { data: row } = await admin
    .from("setup_runs")
    .select("id, user_id, domain, mailbox_local, status, cf_zone_id, cf_state")
    .eq("id", parsed.data.runId)
    .maybeSingle();

  if (!row || row.user_id !== user.id) {
    return { status: "error", errorKey: "setup.errors.run_not_found" };
  }
  if (row.status !== "cf_awaiting_destination_verify") {
    return { status: "error", errorKey: "setup.errors.run_wrong_state" };
  }

  const state = (row.cf_state as Record<string, unknown>) ?? {};
  const accountId = state.account_id as string | undefined;
  const destinationEmail =
    (state.destination_email as string | undefined) ?? user.email;
  if (!accountId || !destinationEmail || !row.cf_zone_id) {
    return { status: "error", errorKey: "setup.errors.run_corrupt" };
  }

  const cf = createCloudflareClient(parsed.data.token);
  try {
    const destinations = await cf.listEmailRoutingDestinations(accountId);
    const dest = destinations.find((d) => d.email === destinationEmail);
    if (!dest || !dest.verified) {
      return {
        status: "ok",
        runId: row.id,
        runStatus: "cf_awaiting_destination_verify",
        destinationEmail,
      };
    }
  } catch (e) {
    await failRun(admin, row.id, STEP.listDestinations, errMsg(e));
    return mapCfError(e);
  }

  const finalized = await finalizeRule({
    cf,
    admin,
    runId: row.id,
    zoneId: row.cf_zone_id,
    zoneName: row.domain,
    mailboxLocal: row.mailbox_local,
    destinationEmail,
  });
  if (finalized.status !== "ok") return finalized;
  return {
    status: "ok",
    runId: row.id,
    runStatus: "cf_done",
    destinationEmail,
  };
}

async function patchRun(
  admin: Awaited<ReturnType<typeof createServiceClient>>,
  runId: string,
  input: { status?: string; merge: Record<string, unknown> },
) {
  const { data } = await admin
    .from("setup_runs")
    .select("cf_state")
    .eq("id", runId)
    .maybeSingle();
  const nextState = { ...((data?.cf_state as object) ?? {}), ...input.merge };
  const update: Record<string, unknown> = { cf_state: nextState };
  if (input.status) update.status = input.status;
  await admin.from("setup_runs").update(update).eq("id", runId);
}

function errMsg(e: unknown): string {
  if (e instanceof CloudflareError) return `${e.code}: ${e.message}`;
  if (e instanceof PostmarkError) return `postmark ${e.code}: ${e.message}`;
  if (e instanceof SpfMergeHardFail) return `spf_hard_fail: ${e.message}`;
  if (e instanceof DnsUpsertError) return `dns_upsert: ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

function mapPostmarkError(e: unknown): ActionError {
  if (e instanceof SpfMergeHardFail) {
    return {
      status: "error",
      errorKey: "setup.errors.spf_conflict",
      details: { message: e.message },
    };
  }
  if (e instanceof DnsUpsertError) {
    return {
      status: "error",
      errorKey: "setup.errors.dns_write_failed",
      details: { message: e.message },
    };
  }
  if (e instanceof PostmarkError) {
    const { httpStatus, code } = e;
    if (httpStatus === 401 || httpStatus === 403) {
      return {
        status: "error",
        errorKey: "setup.errors.postmark_invalid_token",
      };
    }
    if (httpStatus === 429) {
      return {
        status: "error",
        errorKey: "setup.errors.postmark_rate_limited",
      };
    }
    if (httpStatus >= 500) {
      return { status: "error", errorKey: "setup.errors.postmark_unavailable" };
    }
    if (code === 501 || /already exists/i.test(e.message)) {
      return {
        status: "error",
        errorKey: "setup.errors.postmark_domain_taken",
      };
    }
    return { status: "error", errorKey: "setup.errors.postmark_unavailable" };
  }
  if (e instanceof CloudflareError) return mapCfError(e);
  return { status: "error", errorKey: "setup.errors.unexpected" };
}

/* ------------------------------------------------------------------ *
 * Ticket #4b — SMTP backend setup (Postmark)
 * ------------------------------------------------------------------ */

const SMTP_RESUMABLE = new Set([
  "cf_done",
  "brevo_sender_created",
  "brevo_dns_written",
  "brevo_verified",
]);

// Statuses past brevo_done — setup already finished, continueSmtpSetup
// is a no-op idempotent "already done" response so a stale click from
// the CTA does not reject with run_wrong_state.
const SMTP_ALREADY_DONE = new Set([
  "brevo_done",
  "gmail_instructions_shown",
  "gmail_smtp_ready",
  "gmail_send_as_verified",
  "done",
]);

const POSTMARK_SPF_INCLUDE_HOST = "spf.mtasv.net";
const POSTMARK_DKIM_VERIFY_POLL_DELAYS_MS = [3000, 5000, 10000] as const;

type SmtpSetupOk = {
  status: "ok";
  runId: string;
  runStatus:
    | "brevo_sender_created"
    | "brevo_dns_written"
    | "brevo_verified"
    | "brevo_done";
};

const smtpContinueSchema = z.object({
  runId: z.string().uuid(),
  cfToken: z.string().min(20).max(200),
});

export async function continueSmtpSetup(input: {
  runId: string;
  cfToken: string;
}): Promise<SmtpSetupOk | ActionError> {
  const parsed = smtpContinueSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      errorKey: "setup.errors.invalid_input",
      details: parsed.error.flatten(),
    };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { status: "error", errorKey: "setup.errors.not_authenticated" };
  }

  const postmarkToken = process.env.POSTMARK_ACCOUNT_TOKEN;
  if (!postmarkToken) {
    return { status: "error", errorKey: "setup.errors.postmark_invalid_token" };
  }

  const admin = createServiceClient();
  const { data: row } = await admin
    .from("setup_runs")
    .select("id, user_id, domain, mailbox_local, status, cf_zone_id, cf_state")
    .eq("id", parsed.data.runId)
    .maybeSingle();

  if (!row || row.user_id !== user.id) {
    return { status: "error", errorKey: "setup.errors.run_not_found" };
  }

  if (SMTP_ALREADY_DONE.has(row.status)) {
    return { status: "ok", runId: row.id, runStatus: "brevo_done" };
  }

  if (!SMTP_RESUMABLE.has(row.status)) {
    return { status: "error", errorKey: "setup.errors.run_wrong_state" };
  }

  const zoneId = row.cf_zone_id;
  const zoneName = row.domain;
  if (!zoneId || !zoneName) {
    return { status: "error", errorKey: "setup.errors.run_corrupt" };
  }

  const pm = createPostmarkAccountClient(postmarkToken);
  const cf = createCloudflareClient(parsed.data.cfToken);
  return runPostmarkSetup({ pm, cf, admin, row });
}

/* ------------------------------------------------------------------ *
 * Postmark backend implementation
 * ------------------------------------------------------------------ */

type PostmarkSetupRow = {
  id: string;
  status: string;
  domain: string;
  mailbox_local: string;
  cf_zone_id: string;
  cf_state: unknown;
};

async function runPostmarkSetup(args: {
  pm: PostmarkAccountClient;
  cf: CloudflareClient;
  admin: ReturnType<typeof createServiceClient>;
  row: PostmarkSetupRow;
}): Promise<SmtpSetupOk | ActionError> {
  const { pm, cf, admin, row } = args;
  const zoneId = row.cf_zone_id;
  const zoneName = row.domain;

  try {
    let runStatus = row.status;
    let pmState =
      ((row.cf_state as Record<string, unknown> | null)?.postmark as
        | Record<string, unknown>
        | undefined) ?? {};

    // Step 1: create Postmark Server (one per customer setup run)
    if (runStatus === "cf_done") {
      const server = await pm.createServer(row.id);
      pmState = {
        ...pmState,
        server_id: server.id,
        server_token: server.apiToken,
      };
      await patchPostmarkState(admin, row.id, {
        status: "brevo_sender_created",
        pmState,
        step: STEP.smtpCreateSender,
        postmarkServerId: server.id,
      });
      runStatus = "brevo_sender_created";
    }

    // Step 2: add Postmark Domain + write DNS records to Cloudflare
    if (runStatus === "brevo_sender_created") {
      let domain = pmState.domain as PostmarkDomain | null;
      if (!domain) {
        domain = await pm.addSenderDomain(zoneName);
        pmState = { ...pmState, domain, domain_id: domain.id };
      }

      // DKIM TXT record
      await upsertDnsByPattern(cf, zoneId, {
        pattern: "v=dkim1",
        record: {
          type: "TXT",
          name: domain.dkimHost,
          content: domain.dkimValue,
          ttl: 1,
        },
      });
      // Return-Path CNAME (pm-bounces.{domain} → pm.mtasv.net)
      await upsertDnsByPattern(cf, zoneId, {
        pattern: "pm.mtasv.net",
        record: {
          type: "CNAME",
          name: domain.returnPathHost,
          content: domain.returnPathCnameValue,
          ttl: 1,
        },
      });
      // SPF merge + DMARC upsert
      const { spf: spfRes, dmarc: dmarcRes } = await ensurePostmarkDnsRecords({
        cf,
        zoneId,
        zoneName,
      });

      pmState = {
        ...pmState,
        dns: {
          dkim_host: domain.dkimHost,
          return_path_host: domain.returnPathHost,
          spf: spfRes.id,
          dmarc: dmarcRes.id,
        },
      };
      await patchPostmarkState(admin, row.id, {
        status: "brevo_dns_written",
        pmState,
        step: STEP.smtpDnsUpsert,
      });
      runStatus = "brevo_dns_written";
    }

    // Step 3: poll DKIM verification
    if (runStatus === "brevo_dns_written") {
      const domainId = pmState.domain_id as number | undefined;
      if (!domainId) throw new Error("postmark domain_id missing from state");

      let attempt = 0;
      let verified = false;
      while (attempt <= POSTMARK_DKIM_VERIFY_POLL_DELAYS_MS.length) {
        const d = await pm.verifyDkim(domainId);
        if (d.dkimVerified) {
          verified = true;
          break;
        }
        if (attempt === POSTMARK_DKIM_VERIFY_POLL_DELAYS_MS.length) break;
        await sleepMs(POSTMARK_DKIM_VERIFY_POLL_DELAYS_MS[attempt]);
        attempt++;
      }

      if (!verified) {
        return {
          status: "error",
          errorKey: "setup.errors.postmark_dkim_timeout",
        };
      }
      pmState = { ...pmState, dkim_verified: true };
      await patchPostmarkState(admin, row.id, {
        status: "brevo_verified",
        pmState,
        step: STEP.smtpVerify,
      });
      runStatus = "brevo_verified";
    }

    // Step 4: finalize
    if (runStatus === "brevo_verified") {
      await patchPostmarkState(admin, row.id, {
        status: "brevo_done",
        pmState,
        step: STEP.smtpFinalize,
      });
      runStatus = "brevo_done";
    }

    return {
      status: "ok",
      runId: row.id,
      runStatus: runStatus as SmtpSetupOk["runStatus"],
    };
  } catch (e) {
    await failRun(admin, row.id, STEP.smtpCreateSender, errMsg(e));
    return mapPostmarkError(e);
  }
}

async function ensurePostmarkDnsRecords(args: {
  cf: CloudflareClient;
  zoneId: string;
  zoneName: string;
}): Promise<{
  spf: { id: string; action: string };
  dmarc: { id: string; action: string };
}> {
  const { cf, zoneId, zoneName } = args;

  const existingTxt = await cf.listDnsRecords(zoneId, {
    type: "TXT",
    name: zoneName,
  });
  const existingSpf = existingTxt.find((r) =>
    r.content.toLowerCase().startsWith("v=spf1"),
  );
  const spfContent = existingSpf
    ? addSpfInclude(existingSpf.content, POSTMARK_SPF_INCLUDE_HOST)
    : `v=spf1 include:${POSTMARK_SPF_INCLUDE_HOST} ~all`;
  const spfRes = await upsertDnsByPattern(cf, zoneId, {
    pattern: "v=spf1",
    record: { type: "TXT", name: zoneName, content: spfContent, ttl: 1 },
  });

  const dmarcContent = `v=DMARC1; p=none; rua=mailto:postmaster@${zoneName}`;
  const dmarcRes = await upsertDnsByPattern(cf, zoneId, {
    pattern: "v=dmarc1",
    record: {
      type: "TXT",
      name: `_dmarc.${zoneName}`,
      content: dmarcContent,
      ttl: 1,
    },
  });

  return {
    spf: { id: spfRes.id, action: spfRes.action },
    dmarc: { id: dmarcRes.id, action: dmarcRes.action },
  };
}

async function patchPostmarkState(
  admin: ReturnType<typeof createServiceClient>,
  runId: string,
  input: {
    status: string;
    pmState: Record<string, unknown>;
    step: Step;
    postmarkServerId?: number;
  },
) {
  const { data } = await admin
    .from("setup_runs")
    .select("cf_state")
    .eq("id", runId)
    .maybeSingle();
  const current = (data?.cf_state as object) ?? {};
  const nextState = {
    ...current,
    last_step: input.step,
    postmark: input.pmState,
  };
  const update: Record<string, unknown> = {
    status: input.status,
    cf_state: nextState,
  };
  if (input.postmarkServerId !== undefined) {
    update.postmark_server_id = input.postmarkServerId;
  }
  await admin.from("setup_runs").update(update).eq("id", runId);
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ *
 * Ticket #6 — Gmail Send-As guided step
 * ------------------------------------------------------------------ */

// prepareGmailStep resumes from brevo_done (first call) or from
// gmail_instructions_shown (user re-opened the wizard) — both return the
// same display object so the UI is stateless. confirmGmailSendAs accepts
// the full downstream range so a double-click can't transition a run
// out of "done".
const GMAIL_PREPARE_RESUMABLE = new Set([
  "brevo_done",
  "gmail_instructions_shown",
]);
const GMAIL_CONFIRM_RESUMABLE = new Set([
  "gmail_instructions_shown",
  "gmail_send_as_verified",
  "done",
]);

type GmailPrepareOk = {
  status: "ok";
  runId: string;
  runStatus: "gmail_instructions_shown";
  targetEmail: string;
  displayName: string;
  smtp: SmtpDisplay;
};

type GmailConfirmOk = {
  status: "ok";
  runId: string;
  runStatus: "done";
};

const gmailRunSchema = z.object({ runId: z.string().uuid() });

function titleCaseLocal(mailboxLocal: string): string {
  const cleaned = mailboxLocal.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return mailboxLocal;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapSmtpConfigError(e: unknown): ActionError {
  if (e instanceof PostmarkSmtpConfigError) {
    return {
      status: "error",
      errorKey: "setup.errors.smtp_misconfigured",
      details: { reason: e instanceof Error ? e.message : String(e) },
    };
  }
  return { status: "error", errorKey: "setup.errors.unexpected" };
}

async function flagPhishingPurchase(
  admin: ReturnType<typeof createServiceClient>,
  userId: string,
  domain: string,
  reason: string,
): Promise<void> {
  try {
    // Flag the most recent paid purchase for this user
    const { data: purchase } = await admin
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (purchase) {
      await admin
        .from("purchases")
        .update({ kyc_review_required: true })
        .eq("id", purchase.id);
    }

    await admin.from("abuse_events").insert({
      domain,
      event_type: "phishing_pattern",
      action_taken: "kyc_flagged",
      notes: reason,
      purchase_id: purchase?.id ?? null,
    });

    void sendTelegramAlert([
      "🚨 <b>Phishing pattern detected — MailKit</b>",
      "",
      `<b>Domain:</b> ${escapeHtml(domain)}`,
      `<b>Reason:</b> ${escapeHtml(reason)}`,
      `<b>Action:</b> kyc_review_required = true`,
      purchase ? `<b>Purchase ID:</b> ${escapeHtml(purchase.id)}` : null,
      "",
      "Review in Supabase admin → purchases table.",
    ]);
  } catch (e) {
    console.error("[phishing-flag]", e);
  }
}

export async function prepareGmailStep(input: {
  runId: string;
}): Promise<GmailPrepareOk | ActionError> {
  const parsed = gmailRunSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      errorKey: "setup.errors.invalid_input",
      details: parsed.error.flatten(),
    };
  }
  const user = await getAuthenticatedUser();
  if (!user) {
    return { status: "error", errorKey: "setup.errors.not_authenticated" };
  }

  const admin = createServiceClient();
  const { data: row } = await admin
    .from("setup_runs")
    .select("id, user_id, domain, mailbox_local, status, gmail_state, cf_state")
    .eq("id", parsed.data.runId)
    .maybeSingle();

  if (!row || row.user_id !== user.id) {
    return { status: "error", errorKey: "setup.errors.run_not_found" };
  }
  if (!GMAIL_PREPARE_RESUMABLE.has(row.status)) {
    return { status: "error", errorKey: "setup.errors.run_wrong_state" };
  }

  // Load per-customer SMTP credentials from the Postmark server token stored in cf_state.
  let smtp: SmtpDisplay;
  try {
    const pmState =
      ((row.cf_state as Record<string, unknown> | null)?.postmark as
        | Record<string, unknown>
        | undefined) ?? {};
    smtp = buildPostmarkSmtpDisplay(
      (pmState.server_token as string | undefined) ?? "",
    );
  } catch (e) {
    return mapSmtpConfigError(e);
  }

  // #ABUSE-3 — phishing pattern check (non-blocking, fire-and-forget)
  const phishingResult = checkPhishingPattern(row.mailbox_local, row.domain);
  if (phishingResult.flagged) {
    void flagPhishingPurchase(
      admin,
      user.id,
      row.domain,
      phishingResult.reason,
    );
  }

  const targetEmail = `${row.mailbox_local}@${row.domain}`;
  const displayName = titleCaseLocal(row.mailbox_local);
  const existingGmailState =
    (row.gmail_state as Record<string, unknown> | null) ?? {};
  const nextGmailState = {
    ...existingGmailState,
    target_email: targetEmail,
    display_name: displayName,
    smtp_config_version: smtp.keyVersion,
    last_step: STEP.gmailPrepare,
  };

  await admin
    .from("setup_runs")
    .update({ status: "gmail_instructions_shown", gmail_state: nextGmailState })
    .eq("id", row.id);

  return {
    status: "ok",
    runId: row.id,
    runStatus: "gmail_instructions_shown",
    targetEmail,
    displayName,
    smtp,
  };
}

export async function confirmGmailSendAs(input: {
  runId: string;
}): Promise<GmailConfirmOk | ActionError> {
  const parsed = gmailRunSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      errorKey: "setup.errors.invalid_input",
      details: parsed.error.flatten(),
    };
  }
  const user = await getAuthenticatedUser();
  if (!user) {
    return { status: "error", errorKey: "setup.errors.not_authenticated" };
  }

  const admin = createServiceClient();
  const { data: row } = await admin
    .from("setup_runs")
    .select("id, user_id, status, gmail_state")
    .eq("id", parsed.data.runId)
    .maybeSingle();

  if (!row || row.user_id !== user.id) {
    return { status: "error", errorKey: "setup.errors.run_not_found" };
  }
  if (!GMAIL_CONFIRM_RESUMABLE.has(row.status)) {
    return { status: "error", errorKey: "setup.errors.run_wrong_state" };
  }

  if (row.status === "done") {
    return { status: "ok", runId: row.id, runStatus: "done" };
  }

  const existingGmailState =
    (row.gmail_state as Record<string, unknown> | null) ?? {};
  const nextGmailState = {
    ...existingGmailState,
    confirmed_at: new Date().toISOString(),
    last_step: STEP.gmailConfirm,
  };

  // MVP single-shot: transition directly to "done". The intermediate
  // "gmail_send_as_verified" status exists in the CHECK constraint for a
  // future ping-verify flow (see TICKETS_BACKLOG "Auto-verification") so
  // that the DB schema does not need re-migration when it lands.
  await admin
    .from("setup_runs")
    .update({ status: "done", gmail_state: nextGmailState })
    .eq("id", row.id);

  return { status: "ok", runId: row.id, runStatus: "done" };
}

/**
 * Pre-flight NS check — verifies the domain's authoritative nameservers
 * are Cloudflare's (*.ns.cloudflare.com) using Cloudflare DNS-over-HTTPS.
 * Called after zone selection, before setup starts, to surface a clear
 * warning when the domain is on Cloudflare account but nameservers haven't
 * propagated or the zone is in partial/CNAME mode.
 */
export async function checkDomainNS(input: {
  domain: string;
}): Promise<
  { status: "cloudflare" } | { status: "not_cloudflare" } | { status: "error" }
> {
  const domain = input.domain?.trim().toLowerCase();
  if (!domain) return { status: "error" };

  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`,
      { headers: { Accept: "application/dns-json" }, next: { revalidate: 0 } },
    );
    if (!res.ok) return { status: "error" };

    const data = (await res.json()) as { Answer?: { data: string }[] };
    const nsRecords =
      data.Answer?.map((r) => r.data.toLowerCase().replace(/\.$/, "")) ?? [];

    if (nsRecords.length === 0) return { status: "error" };

    const allCloudflare = nsRecords.every((ns) =>
      ns.endsWith(".ns.cloudflare.com"),
    );
    return allCloudflare
      ? { status: "cloudflare" }
      : { status: "not_cloudflare" };
  } catch {
    return { status: "error" };
  }
}
