import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/integrations/postmark-transactional";
import { brandedEmailContent } from "@/lib/integrations/email-wrapper";

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

    // Ticket number — insert into support_tickets (best-effort:
    // the flow survives without a number if the table is unavailable).
    let ticket: number | null = null;
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({ name: name || null, email, message })
        .select("id")
        .single();
      if (!error && data) ticket = data.id;
      else if (error) console.error("[support-contact] ticket insert:", error);
    } catch (err) {
      console.error("[support-contact] ticket insert failed:", err);
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const text = [
        `📩 <b>Support request — MailKit${ticket ? ` #${ticket}` : ""}</b>`,
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

    // Auto-copy to the user — best-effort, doesn't block the ticket.
    try {
      const copySubject = ticket
        ? `We received your message — MailKit (#${ticket})`
        : "We received your message — MailKit";
      const textContent = [
        "We're on it — we usually reply within a few hours.",
        ...(ticket ? [`Ticket number: #${ticket}`] : []),
        `Your message:\n${message}`,
      ].join("\n\n");
      const branded = brandedEmailContent({
        title: "We received your message",
        textContent,
        preheader: "Your support request has been received",
      });
      await sendTransactionalEmail({
        to: { email, name: name || undefined },
        subject: copySubject,
        textContent: branded.textContent,
        htmlContent: branded.htmlContent,
      });
    } catch (err) {
      console.error("[support-contact] auto-copy failed:", err);
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    console.error("[support-contact] error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
