import { NextResponse } from "next/server";

import { sendTelegramAlert } from "@/lib/telegram-alert";

/**
 * Wrapper for cron route handlers: a fatal (top-level) error inside a
 * cron fires an owner alert to Telegram and returns 500 so the
 * failure is visible in Vercel logs too. Per-item errors inside the
 * crons stay per-item — this catches the "whole cron is broken" case.
 */
export async function runCron(
  name: string,
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[cron ${name}] fatal:`, msg);
    void sendTelegramAlert([
      "🔴 MailKit — cron failed",
      `Cron: ${name}`,
      `Error: ${msg}`,
    ]);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
