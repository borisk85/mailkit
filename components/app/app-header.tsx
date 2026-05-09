"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";

import { MailkitIcon } from "@/components/brand/mailkit-icon";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * App-zone header. Same Ideogram envelope lockup as the landing
 * Header per UI_REVIEW_BRIEF §7.5 — 24×24 icon + "Mailkit" wordmark,
 * no trailing accent dot. Visual identity carries from `/` into
 * `/app/*` without a jolt.
 *
 * App-zone differences from landing:
 *   - logo links to `/{locale}/app` (dashboard).
 *   - right side carries email + sign-out instead of anchor nav.
 */
export function AppHeader({ user }: { user: User }) {
  const tAuth = useTranslations("auth");
  const tBrand = useTranslations("landing.header");
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b border-mk-border-subtle bg-surface-base/70 backdrop-blur-md supports-[backdrop-filter]:bg-surface-base/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-mk-text-primary"
          aria-label={tBrand("logo")}
        >
          <MailkitIcon className="size-6 shrink-0" />
          <span>{tBrand("logo")}</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-mk-text-secondary sm:inline">
            {user.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            {tAuth("signOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
