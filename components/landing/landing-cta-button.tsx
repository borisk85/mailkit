"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";

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

interface LandingCtaButtonProps {
  label: string;
  className?: string;
}

export function LandingCtaButton({ label, className }: LandingCtaButtonProps) {
  const t = useTranslations("landing.ctaButton");
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

  if (isLoggedIn === null) {
    return (
      <span className={className} style={{ visibility: "hidden" }} aria-hidden>
        {label}
      </span>
    );
  }

  if (isLoggedIn) {
    return (
      <Link href="/app" className={className}>
        {t("myAccount")}
      </Link>
    );
  }

  return (
    <button type="button" onClick={startOAuth} className={className}>
      {label}
    </button>
  );
}
