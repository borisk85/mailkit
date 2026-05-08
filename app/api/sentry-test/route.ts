import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

// Temporary smoke-test route. DELETE after confirming Sentry receives
// the error. Never ship this to a real user — no auth guard, intentional throw.
export async function GET() {
  Sentry.captureException(
    new Error(
      "MailKit Sentry smoke test — delete app/api/sentry-test after verifying",
    ),
  );
  return NextResponse.json({
    ok: true,
    message: "Error captured — check Sentry dashboard.",
  });
}
