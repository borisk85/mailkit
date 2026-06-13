import { setRequestLocale } from "next-intl/server";

import { linkOrphanPurchase } from "@/lib/checkout-link";
import { createClient, createServiceClient } from "@/lib/supabase/server";

import { SetupWizard } from "./setup-wizard";

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
  let hasPurchase = false;

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
        const [runsResult, purchaseResult] = await Promise.all([
          supabase
            .from("setup_runs")
            .select("id, domain, mailbox_local, status")
            .eq("user_id", user.id)
            .not("status", "in", '("done","failed")')
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
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
        }
        hasPurchase = !!purchaseResult.data;
      } catch {
        // best-effort; don't block wizard load
      }
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-start justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <SetupWizard
          initialMock={mock}
          activeRun={activeRun}
          hasPurchase={hasPurchase}
        />
      </div>
    </div>
  );
}

function readParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
