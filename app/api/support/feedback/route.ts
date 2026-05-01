import { NextResponse } from "next/server";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rating =
      body.rating === "up" || body.rating === "down" ? body.rating : null;
    const userQuestion = String(body.userQuestion ?? "").slice(0, 1000);
    const assistantReply = String(body.assistantReply ?? "").slice(0, 2000);

    if (!rating || !assistantReply) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.warn("[support-feedback] Telegram not configured — skipping");
      return NextResponse.json({ ok: true });
    }

    const emoji = rating === "up" ? "\u{1F44D}" : "\u{1F44E}";
    const label = rating === "up" ? "helpful" : "not helpful";

    const lines = [
      `${emoji} <b>Support bot feedback: ${label}</b>`,
      "",
      userQuestion
        ? `<b>User question:</b>\n${escapeHtml(userQuestion)}\n`
        : null,
      `<b>Bot reply:</b>\n${escapeHtml(assistantReply)}`,
    ];

    const text = lines.filter(Boolean).join("\n").slice(0, 4000);

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support-feedback] error:", err);
    return NextResponse.json({ ok: true });
  }
}
