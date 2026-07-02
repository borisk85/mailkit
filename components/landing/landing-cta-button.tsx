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
  /** Caption under the button — sales context (price, guarantee).
   * Rendered only for logged-out visitors: a logged-in user sees
   * "My account" instead of the sales CTA, so the sales caption
   * would pair wrong with it. */
  caption?: string;
}

export function LandingCtaButton({
  label,
  className,
  caption,
}: LandingCtaButtonProps) {
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

  const withCaption = (button: React.ReactNode, showCaption: boolean) => {
    if (!caption) return button;
    return (
      <span className="flex flex-col items-center gap-3">
        {button}
        {showCaption && (
          <span className="mk-caption text-mk-text-tertiary">{caption}</span>
        )}
      </span>
    );
  };

  if (isLoggedIn === null) {
    return withCaption(
      <span className={className} style={{ visibility: "hidden" }} aria-hidden>
        {label}
      </span>,
      false,
    );
  }

  if (isLoggedIn) {
    return withCaption(
      <Link href="/app" className={className}>
        {t("myAccount")}
      </Link>,
      false,
    );
  }

  return withCaption(
    <button type="button" onClick={startOAuth} className={className}>
      {label}
    </button>,
    true,
  );
}
