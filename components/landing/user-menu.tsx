"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";

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
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

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
      <div className="flex items-center gap-2">
        <Link href="/app" className={buttonVariants({ size: "sm" })}>
          {t("myAccount")}
        </Link>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          {tAuth("signOut")}
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" onClick={startOAuth}>
      {t("cta")}
    </Button>
  );
}
