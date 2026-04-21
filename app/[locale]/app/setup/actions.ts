"use server";

import { z } from "zod";

import {
  CloudflareError,
  createCloudflareClient,
  type CloudflareClient,
  type DnsRecordInput,
} from "@/lib/integrations/cloudflare";
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
  if (e instanceof Error) return e.message;
  return String(e);
}
