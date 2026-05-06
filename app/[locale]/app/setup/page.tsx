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
  if (readParam(sp.paid) === "1") {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const admin = createServiceClient();
        await linkOrphanPurchase({
          admin,
          userId: user.id,
          userEmail: user.email,
          lsOrderIdentifier: readParam(sp.order_id) ?? null,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[setup-page] thank-you link attempt failed: ${msg}`);
    }
  }

  return <SetupWizard initialMock={mock} />;
}

function readParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
