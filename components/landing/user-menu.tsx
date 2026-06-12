"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LayoutDashboard } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

async function startOAuth() {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: ["openid", "email", "profile"].join(" "),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
}

export function UserMenu() {
  const t = useTranslations("landing.header");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // Pending hydration — reserve space to avoid layout shift
  if (isLoggedIn === null) {
    return <span className="inline-block w-32 h-8" aria-hidden />;
  }

  if (isLoggedIn) {
    return (
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
      >
        <LayoutDashboard className="size-3.5 opacity-60" aria-hidden />
        {t("dashboard")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={startOAuth}
        className="text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary focus:outline-none focus-visible:underline focus-visible:underline-offset-4"
      >
        {t("signIn")}
      </button>
      <Button size="sm" onClick={startOAuth}>
        {t("signUp")}
      </Button>
    </div>
  );
}
