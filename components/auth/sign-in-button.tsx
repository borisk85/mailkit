"use client";

import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Same OAuth posture as SignInLink — OpenID basic scopes only. See
 * components/landing/sign-in-link.tsx for the rationale on dropping
 * the Gmail restricted scopes for the MVP launch.
 */
const OAUTH_SCOPES = ["openid", "email", "profile"].join(" ");

export function SignInButton() {
  const t = useTranslations("auth");
  const locale = useLocale();

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
        scopes: OAUTH_SCOPES,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

  return (
    <Button onClick={handleSignIn} size="lg" className="h-12 px-6">
      {t("signInWithGoogle")}
    </Button>
  );
}
