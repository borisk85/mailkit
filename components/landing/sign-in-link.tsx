"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogIn } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

/**
 * MVP OAuth scopes — only the OpenID Connect basic set.
 *
 * The restricted Gmail scopes (gmail.settings.sharing,
 * gmail.settings.basic, gmail.readonly, gmail.modify, gmail.send)
 * stayed in the early code as placeholders for a possible direct
 * Gmail-API integration. MVP doesn't use them — the Send-As setup
 * is a guided copy-paste wizard that runs entirely in the user's
 * Gmail tab, not through our backend.
 *
 * Restricted scopes also trigger Google's hardest verification
 * path (CASA security assessment, 3-6 months, $15-75k for a
 * third-party auditor). Sensitive-but-not-restricted scopes
 * (openid + email + profile) finish in 4-8 weeks via the standard
 * verification flow. We pick the standard flow for launch and
 * re-add Gmail scopes if/when direct API access becomes a
 * post-validation feature.
 */
const OAUTH_SCOPES = ["openid", "email", "profile"].join(" ");

/**
 * Text-link variant of the OAuth sign-in for the header — visually a
 * plain anchor at header density, functionally the same supabase OAuth
 * init as components/auth/sign-in-button.tsx. Hero CTA stays the
 * purchase button; Sign-in is only for returning customers who already
 * purchased and want back into /app.
 */
export function SignInLink() {
  const t = useTranslations("landing.header");
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
