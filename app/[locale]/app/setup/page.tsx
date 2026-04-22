import { setRequestLocale } from "next-intl/server";

import { SetupWizard } from "./setup-wizard";

const MOCK_STATES = [
  "token_entry",
  "token_invalid",
  "zone_selection",
  "setup_running",
  "awaiting_verify",
  "done",
  "failed",
  // Brevo-pipeline states. UI rendering lands in etap 3 — these are
  // allowlisted now so the gate is ready and URLs resolve to the
  // wizard default (token_entry) without 307-ing to /{locale}.
  "brevo_sender_created",
  "brevo_dns_written",
  "brevo_verified",
  "brevo_done",
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

  return <SetupWizard initialMock={mock} />;
}
