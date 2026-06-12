"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogIn, LayoutDashboard } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

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

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: ["openid", "email", "profile"].join(" "),
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  // Pending hydration — render placeholder same width as sign-in link
  if (isLoggedIn === null) {
    return <span className="inline-block w-16 h-5" aria-hidden />;
  }

  if (isLoggedIn) {
    return (
      <Link
        href="/app"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
      >
        <LayoutDashboard className="size-3.5 opacity-60" aria-hidden />
        {t("dashboard")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary focus:outline-none focus-visible:underline focus-visible:underline-offset-4"
    >
      <LogIn className="size-3.5 opacity-60" aria-hidden />
      {t("signIn")}
    </button>
  );
}
