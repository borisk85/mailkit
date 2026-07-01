import { setRequestLocale } from "next-intl/server";

import {
  linkOrphanPurchase,
  reclaimPurchaseByEmail,
} from "@/lib/checkout-link";
import { decryptToken } from "@/lib/crypto/token-cipher";
import { createClient, createServiceClient } from "@/lib/supabase/server";

import { SetupWizard } from "./setup-wizard";

// SMTP setup runs several sequential Cloudflare + Postmark API calls plus a
// short DKIM-propagation wait in one request. Without a raised limit the
// function can be killed mid-run, leaving the run stuck at cf_done with no
// error and the wizard spinner hanging. 60s gives the flow room to finish.
export const maxDuration = 60;

const MOCK_STATES = [
  "token_entry",
  "token_invalid",
  "zone_selection",
  "setup_running",
  "awaiting_verify",
  "done",
  "failed",
  "smtp_sender_created",
  "smtp_dns_written",
  "smtp_verified",
  "smtp_done",
  "smtp_dkim_polling",
  "smtp_dkim_polling_long",
  // Ticket #6 etap 2 — Gmail wizard states.
  "gmail_instructions_shown",
  "gmail_smtp_ready",
  "gmail_send_as_verified",
  "gmail_done",
] as const;
type MockState = (typeof MOCK_STATES)[number];

function parseMockState(
  value: string | string[] | undefined,
): MockState | null {
  // Hard prod disable — only preview / development / local evaluate the param.
  if (process.env.VERCEL_ENV === "production") return null;
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {
    return null;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return (MOCK_STATES as readonly string[]).includes(raw)
    ? (raw as MockState)
    : null;
}

export default async function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const mock = parseMockState(sp.mock);

  // Thank-you linking: LS redirects post-payment to
  // /app/setup?paid=1&order_id=<identifier>. The buyer is auth'd
  // (layout gate) but their purchase row may still have user_id=NULL
  // if they paid from the landing CTA (unauth first-buy). Stamp the
  // link now so subsequent queries (auto-refund lookup, /app
  // dashboard) find it. Best-effort — errors don't block the wizard.
  let activeRun: {
    id: string;
    domain: string;
    mailboxLocal: string;
    status: string;
  } | null = null;
  // Decrypted CF token for the run's owner, so a paid setup resumes the
  // SMTP step in any session (fresh tab / different device / after
  // sign-out) without sending the user back to step 1. Only ever reaches
  // the authenticated owner of the run.
  let initialToken: string | null = null;
  let hasPurchase = false;
  // Address of the most recent COMPLETED setup. When the user has a done run
  // and nothing in progress, the wizard shows the success screen instead of
  // falling back to an earlier step from stale tab state.
  let completedTarget: string | null = null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (readParam(sp.paid) === "1") {
      try {
        const admin = createServiceClient();
        await linkOrphanPurchase({
          admin,
          userId: user.id,
          userEmail: user.email ?? "",
          lsOrderIdentifier: readParam(sp.order_id) ?? null,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[setup-page] thank-you link attempt failed: ${msg}`);
      }
    }

    if (!mock) {
      try {
        // Account-recovery: if this user owns no purchase yet but a
        // paid orphan exists under their (Google-verified) email —
        // e.g. they deleted their account and signed back in — re-link
        // it so they don't hit the payment gate a second time.
        const admin = createServiceClient();
        await reclaimPurchaseByEmail({
          admin,
          userId: user.id,
          userEmail: user.email ?? "",
        });

        const [runsResult, purchaseResult] = await Promise.all([
          supabase
            .from("setup_runs")
            .select("id, domain, mailbox_local, status, cf_token_enc")
            .eq("user_id", user.id)
            .not("status", "in", '("done","failed")')
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          // purchases has RLS enabled but no user-facing SELECT policy, so
          // the user-scoped client sees zero rows — read via the service
          // client, scoped to this verified user's id.
          admin
            .from("purchases")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "paid")
            .limit(1)
            .maybeSingle(),
        ]);

        if (runsResult.data) {
          activeRun = {
            id: runsResult.data.id,
            domain: runsResult.data.domain as string,
            mailboxLocal: runsResult.data.mailbox_local as string,
            status: runsResult.data.status as string,
          };
          initialToken = decryptToken(
            runsResult.data.cf_token_enc as string | null,
          );
        }
        hasPurchase = !!purchaseResult.data;

        // No run in progress, but a finished one exists → the user already
        // completed setup. Surface the success screen, not step 2.
        if (!activeRun) {
          const doneResult = await admin
            .from("setup_runs")
            .select("domain, mailbox_local")
            .eq("user_id", user.id)
            .eq("status", "done")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (doneResult.data) {
            completedTarget = `${doneResult.data.mailbox_local}@${doneResult.data.domain}`;
          }
        }
      } catch {
        // best-effort; don't block wizard load
      }
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <SetupWizard
          initialMock={mock}
          activeRun={activeRun}
          hasPurchase={hasPurchase}
          initialToken={initialToken}
          userEmail={user?.email ?? ""}
          completedTarget={completedTarget}
        />
      </div>
    </div>
  );
}

function readParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
