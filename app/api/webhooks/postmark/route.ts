import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Postmark webhook handler for bounce and spam-complaint events.
 * Postmark sends POST requests when a message bounces or is marked as spam.
 * We record them in abuse_events for the anti-abuse layer.
 *
 * Security: verify the shared webhook token from POSTMARK_WEBHOOK_TOKEN.
 * Set this token in Postmark dashboard → Servers → {server} → Webhooks →
 * "Include the following header: X-Postmark-Webhook-Token: {token}"
 */

type PostmarkBouncePayload = {
  RecordType: "Bounce";
  Type: string;
  TypeCode: number;
  Email: string;
  BouncedAt: string;
  Metadata?: Record<string, string>;
  Tag?: string;
  ServerID?: number;
};

type PostmarkSpamPayload = {
  RecordType: "SpamComplaint";
  Email: string;
  BouncedAt: string;
  Tag?: string;
  ServerID?: number;
};

type PostmarkPayload =
  | PostmarkBouncePayload
  | PostmarkSpamPayload
  | { RecordType: string };

function isHardBounce(typeCode: number): boolean {
  // Postmark hard-bounce type codes: 1 (HardBounce), 10 (BadEmailAddress),
  // 100 (ManuallyDeactivated), 512 (DMARCPolicy).
  return [1, 10, 100, 512].includes(typeCode);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookToken = process.env.POSTMARK_WEBHOOK_TOKEN;
  if (webhookToken) {
    const inbound = req.headers.get("x-postmark-webhook-token");
    if (inbound !== webhookToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let payload: PostmarkPayload;
  try {
    payload = (await req.json()) as PostmarkPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = createServiceClient();

  try {
    if (payload.RecordType === "Bounce") {
      const bounce = payload as PostmarkBouncePayload;
      const domain = bounce.Email.split("@")[1] ?? "";
      const eventType = isHardBounce(bounce.TypeCode)
        ? "hard_bounce"
        : "soft_bounce";

      await admin.from("abuse_events").insert({
        domain,
        event_type: eventType,
        action_taken: "logged",
        notes: `postmark bounce type=${bounce.Type} typeCode=${bounce.TypeCode} email=${bounce.Email} server=${bounce.ServerID ?? ""}`,
      });
    } else if (payload.RecordType === "SpamComplaint") {
      const spam = payload as PostmarkSpamPayload;
      const domain = spam.Email.split("@")[1] ?? "";

      await admin.from("abuse_events").insert({
        domain,
        event_type: "spam_complaint",
        action_taken: "logged",
        notes: `postmark spam_complaint email=${spam.Email} server=${spam.ServerID ?? ""}`,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[postmark-webhook] db insert failed:", msg);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
