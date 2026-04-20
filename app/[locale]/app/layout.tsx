import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { AppHeader } from "@/components/app/app-header";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}`);
  }

  return (
    <>
      <AppHeader user={user} locale={locale} />
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
    </>
  );
}
