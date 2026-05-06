import { escapeHtml, sendTelegramAlert } from "@/lib/telegram-alert";

/**
 * Owner alert for abuse and operational events.
 * Gracefully no-ops when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are
 * not set — add both env vars in Vercel to activate.
 */
export async function notifyOwnerViaTelegram(
  message: string,
  eventType: string,
): Promise<void> {
  await sendTelegramAlert([
    `🚨 <b>Abuse: ${escapeHtml(eventType)}</b>`,
    escapeHtml(message),
  ]);
}
