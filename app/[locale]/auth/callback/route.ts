import { NextResponse, type NextRequest } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (!code) {
    return NextResponse.redirect(`${origin}?error=no_code`);
  }

  // Diagnostic: log which auth-related cookies are present so we can
  // confirm code_verifier arrived at the server-side handler.
  const { cookies: getCookies } = await import("next/headers");
  const reqCookieStore = await getCookies();
  const authCookieNames = reqCookieStore
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith("sb-"));
  console.info("[auth/callback] sb-* cookies on request:", authCookieNames);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error(
      "[auth/callback] exchangeCodeForSession failed:",
      error?.message ?? "no session",
      error?.status ?? "",
      { code: code?.slice(0, 8), authCookieNames },
    );
    return NextResponse.redirect(`${origin}?error=oauth_failed`);
  }

  // Capture Google refresh_token for Ticket #4 (Gmail API usage).
  // RLS policy lets the user update their own profile, but
  // provider_refresh_token isn't surfaced via client SDK paths; the
  // server-side service role write is the authoritative place.
  const providerRefreshToken = data.session.provider_refresh_token;
  if (providerRefreshToken) {
    const admin = createServiceClient();
    await admin
      .from("profiles")
      .update({ google_refresh_token: providerRefreshToken })
      .eq("id", data.session.user.id);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
