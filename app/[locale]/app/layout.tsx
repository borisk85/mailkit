import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { User } from "@supabase/supabase-js";

import { AppFooter } from "@/components/app/app-footer";
import { AppHeader } from "@/components/app/app-header";
import { createClient } from "@/lib/supabase/server";

const MOCK_USER: User = {
  id: "00000000-0000-0000-0000-000000000000",
  aud: "authenticated",
  role: "authenticated",
  email: "preview@mailkit.local",
  created_at: "2026-04-21T00:00:00Z",
  app_metadata: {},
  user_metadata: { full_name: "Preview User" },
} as User;

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Mock-preview header set by proxy.ts in non-prod when ?mock= is on the URL.
  // Prod is hard-disabled in the proxy, so this branch is unreachable on
  // VERCEL_ENV=production regardless of what a client forges in headers —
  // Next.js server components receive only the real per-request header set.
  const h = await headers();
  if (h.get("x-mailkit-mock") === "1") {
    return (
      <>
        <AppHeader user={MOCK_USER} />
        <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
        <AppFooter />
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <>
      <AppHeader user={user} />
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
      <AppFooter />
    </>
  );
}
