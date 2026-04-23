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
  BrevoError,
  createBrevoClient,
  type SenderDomain,
} from "@/lib/integrations/brevo";
import {
  BrevoSmtpConfigError,
  loadSmtpDisplay,
  type SmtpDisplay,
} from "@/lib/integrations/brevo-smtp";
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
  brevoCreateSender: "brevo_create_sender",
  brevoDnsUpsert: "brevo_dns_upsert",
  brevoSpfMerge: "brevo_spf_merge",
  brevoVerify: "brevo_verify",
  brevoFinalize: "brevo_finalize",
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
  runStatus:
    | "cf_done"
    | "cf_awaiting_destination_verify"
    | "cf_dns_written"
    | "cf_routing_enabled";
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
  if (e instanceof BrevoError) return `brevo ${e.code}: ${e.message}`;
  if (e instanceof SpfMergeHardFail) return `spf_hard_fail: ${e.message}`;
  if (e instanceof DnsUpsertError) return `dns_upsert: ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}

/* ------------------------------------------------------------------ *
 * Ticket #4b — Brevo continuation
 * ------------------------------------------------------------------ */

const BREVO_RESUMABLE = new Set([
  "cf_done",
  "brevo_sender_created",
  "brevo_dns_written",
  "brevo_verified",
]);

const BREVO_VERIFY_POLL_DELAYS_MS = [2000, 4000, 8000] as const;
const BREVO_SPF_INCLUDE_HOST = "spf.brevo.com";

type BrevoOk = {
  status: "ok";
  runId: string;
  runStatus:
    | "brevo_sender_created"
    | "brevo_dns_written"
    | "brevo_verified"
    | "brevo_done";
};

const brevoContinueSchema = z.object({
  runId: z.string().uuid(),
  cfToken: z.string().min(20).max(200),
});

function mapBrevoError(e: unknown): ActionError {
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
  if (e instanceof BrevoError) {
    const http = e.httpStatus;
    const code = String(e.code).toLowerCase();
    if (http === 401 || http === 403 || code === "unauthorized") {
      return { status: "error", errorKey: "setup.errors.brevo_invalid_token" };
    }
    if (http === 429) {
      return { status: "error", errorKey: "setup.errors.brevo_rate_limited" };
    }
    if (http >= 500) {
      return { status: "error", errorKey: "setup.errors.brevo_unavailable" };
    }
    // Brevo returns HTTP 404 on some duplicate scenarios (observed during
    // live smoke 2026-04-22) — the code string is a more reliable signal
    // than status. Match regardless of http.
    if (
      code === "duplicate_parameter" ||
      code === "duplicate" ||
      /already exists|already registered/i.test(e.message)
    ) {
      return { status: "error", errorKey: "setup.errors.brevo_domain_taken" };
    }
    if (code === "missing_records") {
      return {
        status: "error",
        errorKey: "setup.errors.brevo_state_unrecoverable",
      };
    }
    return { status: "error", errorKey: "setup.errors.brevo_unavailable" };
  }
  if (e instanceof CloudflareError) {
    return mapCfError(e);
  }
  return { status: "error", errorKey: "setup.errors.unexpected" };
}

export async function continueBrevoSetup(input: {
  runId: string;
  cfToken: string;
}): Promise<BrevoOk | ActionError> {
  const parsed = brevoContinueSchema.safeParse(input);
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

  const brevoKey = process.env.BREVO_API_KEY;
  console.log(
    `[continueBrevoSetup] runId=${parsed.data.runId} user=${user.id} BREVO_API_KEY_len=${brevoKey?.length ?? "undefined"} prefix=${brevoKey ? brevoKey.slice(0, 8) : "n/a"}`,
  );
  if (!brevoKey) {
    return { status: "error", errorKey: "setup.errors.brevo_invalid_token" };
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
  if (!BREVO_RESUMABLE.has(row.status)) {
    return { status: "error", errorKey: "setup.errors.run_wrong_state" };
  }

  const zoneId = row.cf_zone_id;
  const zoneName = row.domain;
  if (!zoneId || !zoneName) {
    return { status: "error", errorKey: "setup.errors.run_corrupt" };
  }

  const cf = createCloudflareClient(parsed.data.cfToken);
  const brevo = createBrevoClient(brevoKey);

  try {
    let runStatus = row.status as string;
    let brevoState =
      ((row.cf_state as Record<string, unknown>)?.brevo as
        | Record<string, unknown>
        | undefined) ?? {};

    // Step 1: sender domain create or resume.
    let domain: SenderDomain | null = brevoState.domain as SenderDomain | null;
    if (runStatus === "cf_done") {
      const { domain: created, created: wasCreated } =
        await brevo.createSenderDomain(zoneName);
      domain = created;

      // Short-circuit: if the Brevo sender domain is already authenticated
      // (prior setup on the same shared account + domain), Brevo does not
      // return DKIM / brevo-code records in the GET response — they're
      // already written in DNS and the domain is verified. Skip DNS write
      // and verify steps entirely and mark the run brevo_done.
      if (created.authenticated) {
        brevoState = {
          ...brevoState,
          domain: created,
          sender_id: created.id,
          sender_created: wasCreated,
          already_authenticated: true,
        };
        await patchBrevoState(admin, row.id, {
          status: "brevo_done",
          brevoState,
          step: STEP.brevoFinalize,
        });
        return {
          status: "ok",
          runId: row.id,
          runStatus: "brevo_done",
        };
      }

      brevoState = {
        ...brevoState,
        domain: created,
        sender_id: created.id,
        sender_created: wasCreated,
      };
      await patchBrevoState(admin, row.id, {
        status: "brevo_sender_created",
        brevoState,
        step: STEP.brevoCreateSender,
      });
      runStatus = "brevo_sender_created";
    } else if (!domain) {
      // Resuming at brevo_sender_created+ without cached domain → refetch.
      domain = await brevo.getSenderDomain(zoneName);
      brevoState = { ...brevoState, domain, sender_id: domain.id };
    }

    // Step 2: DNS upsert (DKIM + brevo-code + DMARC + SPF merge).
    if (runStatus === "brevo_sender_created") {
      const dkim = domain.dkim_record;
      const brevoCode = domain.brevo_code_record;
      if (!dkim || !brevoCode) {
        throw new BrevoError({
          message: "Brevo response missing DKIM or brevo-code record",
          code: "missing_records",
          httpStatus: 0,
        });
      }
      const dkimRes = await upsertDnsByPattern(cf, zoneId, {
        pattern: "v=dkim1",
        record: {
          type: "TXT",
          name: dkim.hostname,
          content: dkim.value,
          ttl: 1,
        },
      });
      const brevoCodeRes = await upsertDnsByPattern(cf, zoneId, {
        pattern: "brevo-code:",
        record: {
          type: "TXT",
          name: brevoCode.hostname,
          content: brevoCode.value,
          ttl: 1,
        },
      });
      const dmarcRes = await upsertDnsByPattern(cf, zoneId, {
        pattern: "v=dmarc1",
        record: {
          type: "TXT",
          name: `_dmarc.${zoneName}`,
          content:
            domain.dmarc_record?.value ??
            `v=DMARC1; p=none; rua=mailto:postmaster@${zoneName}`,
          ttl: 1,
        },
      });
      // SPF merge: if an SPF exists on @, merge include:spf.brevo.com;
      // otherwise create a minimal record.
      const existingTxt = await cf.listDnsRecords(zoneId, {
        type: "TXT",
        name: zoneName,
      });
      const existingSpf = existingTxt.find((r) =>
        r.content.toLowerCase().startsWith("v=spf1"),
      );
      const spfContent = existingSpf
        ? addSpfInclude(existingSpf.content, BREVO_SPF_INCLUDE_HOST)
        : `v=spf1 include:${BREVO_SPF_INCLUDE_HOST} ~all`;
      const spfRes = await upsertDnsByPattern(cf, zoneId, {
        pattern: "v=spf1",
        record: { type: "TXT", name: zoneName, content: spfContent, ttl: 1 },
      });

      brevoState = {
        ...brevoState,
        dns: {
          dkim: { id: dkimRes.id, action: dkimRes.action },
          brevo_code: { id: brevoCodeRes.id, action: brevoCodeRes.action },
          dmarc: { id: dmarcRes.id, action: dmarcRes.action },
          spf: { id: spfRes.id, action: spfRes.action },
        },
      };
      await patchBrevoState(admin, row.id, {
        status: "brevo_dns_written",
        brevoState,
        step: STEP.brevoDnsUpsert,
      });
      runStatus = "brevo_dns_written";
    }

    // Step 3: Brevo verify with polling.
    if (runStatus === "brevo_dns_written") {
      let verifiedDomain: SenderDomain | null = null;
      let attempt = 0;
      while (attempt <= BREVO_VERIFY_POLL_DELAYS_MS.length) {
        const d = await brevo.verifyDomain(zoneName);
        if (d.authenticated || d.verified) {
          verifiedDomain = d;
          break;
        }
        if (attempt === BREVO_VERIFY_POLL_DELAYS_MS.length) break;
        await sleepMs(BREVO_VERIFY_POLL_DELAYS_MS[attempt]);
        attempt += 1;
      }
      if (!verifiedDomain) {
        return {
          status: "error",
          errorKey: "setup.errors.brevo_verify_timeout",
        };
      }
      brevoState = { ...brevoState, domain: verifiedDomain, verified: true };
      await patchBrevoState(admin, row.id, {
        status: "brevo_verified",
        brevoState,
        step: STEP.brevoVerify,
      });
      runStatus = "brevo_verified";
    }

    // Step 4: finalize.
    if (runStatus === "brevo_verified") {
      await patchBrevoState(admin, row.id, {
        status: "brevo_done",
        brevoState,
        step: STEP.brevoFinalize,
      });
      runStatus = "brevo_done";
    }

    return {
      status: "ok",
      runId: row.id,
      runStatus: runStatus as BrevoOk["runStatus"],
    };
  } catch (e) {
    await failRun(admin, row.id, STEP.brevoCreateSender, errMsg(e));
    return mapBrevoError(e);
  }
}

async function patchBrevoState(
  admin: Awaited<ReturnType<typeof createServiceClient>>,
  runId: string,
  input: {
    status: string;
    brevoState: Record<string, unknown>;
    step: Step;
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
    brevo: input.brevoState,
  };
  await admin
    .from("setup_runs")
    .update({ status: input.status, cf_state: nextState })
    .eq("id", runId);
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
  if (e instanceof BrevoSmtpConfigError) {
    return {
      status: "error",
      errorKey: "setup.errors.brevo_smtp_misconfigured",
      details: { reason: e.message },
    };
  }
  return { status: "error", errorKey: "setup.errors.unexpected" };
}

export async function prepareGmailStep(input: {
  runId: string;
}): Promise<GmailPrepareOk | ActionError> {
  // TEMP (Ticket #6 etap 3 pre-check): verify env accessibility at
  // runtime on Vercel Preview. Will be removed in cleanup commit once
  // Boris confirms smoke completed.
  console.log(
    "[prepareGmailStep] smtp_login_set:",
    !!process.env.BREVO_SMTP_LOGIN,
    "smtp_key_len:",
    process.env.BREVO_SMTP_KEY?.length ?? 0,
    "smtp_host:",
    process.env.BREVO_SMTP_HOST ?? "undefined",
    "smtp_port:",
    process.env.BREVO_SMTP_PORT ?? "undefined",
    "smtp_key_version:",
    process.env.BREVO_SMTP_KEY_VERSION ?? "undefined",
  );

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

  let smtp: SmtpDisplay;
  try {
    smtp = loadSmtpDisplay();
  } catch (e) {
    return mapSmtpConfigError(e);
  }

  const admin = createServiceClient();
  const { data: row } = await admin
    .from("setup_runs")
    .select("id, user_id, domain, mailbox_local, status, gmail_state")
    .eq("id", parsed.data.runId)
    .maybeSingle();

  if (!row || row.user_id !== user.id) {
    return { status: "error", errorKey: "setup.errors.run_not_found" };
  }
  if (!GMAIL_PREPARE_RESUMABLE.has(row.status)) {
    return { status: "error", errorKey: "setup.errors.run_wrong_state" };
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
