import { sendTelegramAlert } from "@/lib/telegram-alert";

/**
 * Owner alert for abuse and operational events. Plain text.
 * Gracefully no-ops when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are
 * not set.
 */
export async function notifyOwnerViaTelegram(
  message: string,
  eventType: string,
): Promise<void> {
  await sendTelegramAlert([`🚨 MailKit — ${eventType}`, message]);
}
