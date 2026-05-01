import { NextResponse } from "next/server";

function escapeHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "")
      .trim()
      .slice(0, 100);
    const email = String(body.email ?? "")
      .trim()
      .slice(0, 200);
    const subject = String(body.subject ?? "")
      .trim()
      .slice(0, 200);
    const message = String(body.message ?? "")
      .trim()
      .slice(0, 3000);

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message required" },
        { status: 400 },
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const text = [
        "📩 <b>Support request — MailKit</b>",
        "",
        name ? `<b>Name:</b> ${escapeHtml(name)}` : null,
        `<b>Reply-to:</b> ${escapeHtml(email)}`,
        subject ? `<b>Subject:</b> ${escapeHtml(subject)}` : null,
        "",
        `<b>Message:</b>\n${escapeHtml(message)}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000);

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      });
    } else {
      console.warn("[support-contact] Telegram not configured");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[support-contact] error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
