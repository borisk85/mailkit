import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type IncomingMessage = { role: "user" | "assistant"; content: string };

async function getRelevantContext(question: string): Promise<string> {
  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const embedding = embRes.data[0].embedding;

  const { data, error } = await supabaseAdmin.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: 5,
    min_similarity: 0.3,
  });

  if (error || !data?.length) return "";

  return (data as Array<{ content: string; similarity: number }>)
    .map((r) => r.content)
    .join("\n\n---\n\n");
}

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

    const context = await getRelevantContext(message);

    const systemWithContext = context
      ? `${SUPPORT_SYSTEM_PROMPT}\n\n# Relevant knowledge base context\n\n${context}`
      : SUPPORT_SYSTEM_PROMPT;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemWithContext,
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

    // Strip ё per project convention
    const YO_L = "ё";
    const YO_U = "Ё";
    const reply = rawReply
      .replace(new RegExp(YO_L, "g"), "е")
      .replace(new RegExp(YO_U, "g"), "Е");

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
