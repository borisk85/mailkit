/**
 * Shared Telegram notification utility — owner alerts to Boris's bot
 * (@mailkitsupportbot). Used by: abuse alerts, phishing flags,
 * auto-refund events, coupon-abuse blocks, cron failures.
 *
 * Plain text only — no parse_mode, no markdown (owner requirement:
 * readable lines in Telegram). Never throws: an alert failure must
 * not break the path that reports it.
 *
 * Env: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (no-op when unset).
 */

export async function sendTelegramAlert(
  lines: (string | null)[],
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const text = lines
    .filter((l): l is string => l !== null)
    .join("\n")
    .slice(0, 4000);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      console.error("[telegram-alert] sendMessage failed:", res.status);
    }
  } catch (e) {
    console.error("[telegram-alert]", e);
  }
}
