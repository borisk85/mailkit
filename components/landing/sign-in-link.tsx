"use client";

import { useLocale, useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";

const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.settings.sharing",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

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
        scopes: GMAIL_SCOPES,
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
      className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus:outline-none focus-visible:underline focus-visible:underline-offset-4 dark:text-neutral-400 dark:hover:text-neutral-100"
    >
      {t("signIn")}
    </button>
  );
}
