"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AppHeader({ user, locale }: { user: User; locale: string }) {
  const t = useTranslations("auth");
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          MailKit
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            {t("signOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
