/**
 * Shared Telegram notification utility.
 * Used by: support feedback (dislikes), #ABUSE-1 abuse alerts, #ABUSE-3 phishing flags.
 * Same bot token for all channels — set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in env.
 */

function escapeHtml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch((e) => console.error("[telegram-alert]", e));
}

export { escapeHtml };
