"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * App-zone header. Uses the same brand lockup as the landing Header
 * (envelope icon + "Mailkit" wordmark + indigo accent dot) so the
 * visual identity carries from `/` into `/app/*` without a jolt.
 *
 * App-zone differences from landing:
 *   - logo links to `/{locale}/app` (the dashboard) instead of the
 *     landing root, so a logo click within the app keeps the user
 *     in the auth'd area.
 *   - right side carries the user's email + sign-out instead of
 *     anchor nav + theme toggle + sign-in.
 *
 * Theme toggle stays on the landing only — the app respects the
 * theme picked there (next-themes persists in localStorage).
 */
export function AppHeader({ user, locale }: { user: User; locale: string }) {
  const tAuth = useTranslations("auth");
  const tBrand = useTranslations("landing.header");
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <header className="border-b border-neutral-200 bg-neutral-50/70 backdrop-blur-md supports-[backdrop-filter]:bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-950/70 dark:supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/${locale}/app`}
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
          aria-label={tBrand("logo")}
        >
          <Image
            src="/brand/mailkit-icon.png"
            alt=""
            width={28}
            height={28}
            priority
            className="size-7 shrink-0"
          />
          <span>{tBrand("logo")}</span>
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-indigo-500"
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-600 sm:inline dark:text-neutral-400">
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
