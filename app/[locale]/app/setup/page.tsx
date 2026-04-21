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
