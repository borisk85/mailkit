import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    const rawHistory: unknown[] = Array.isArray(body?.history)
      ? body.history
      : [];

    if (!message) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const history: IncomingMessage[] = (rawHistory as IncomingMessage[])
      .filter(
        (m) =>
          m &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-10);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SUPPORT_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: message },
      ],
    });

    const rawReply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const reply = rawReply.replace(/ё/g, "е").replace(/Ё/g, "Е");

    return NextResponse.json({
      reply:
        reply ||
        "I wasn't able to form an answer. Email us at support@getmailkit.com.",
    });
  } catch (err) {
    console.error("Support chat error:", err);
    return NextResponse.json(
      { error: "Failed to get a response. Email support@getmailkit.com." },
      { status: 500 },
    );
  }
}
