import { getTranslations, setRequestLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

export default async function AppHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "auth" });
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user!.id)
    .single();

  const displayName = profile?.full_name ?? t("friendFallback");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t("welcomeBack", { name: displayName })}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {profile?.email ?? user!.email}
      </p>
    </div>
  );
}
