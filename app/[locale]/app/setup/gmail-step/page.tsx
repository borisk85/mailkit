import { redirect } from "next/navigation";

/**
 * Pre-etap-2 placeholder route that shipped as a stub. In etap 2 the
 * Gmail Send-As wizard moved inline into setup-wizard.tsx — the CTA on
 * the brevo_done panel calls prepareGmailStep and mounts the wizard in
 * the same page, so this standalone route has no reason to render.
 *
 * Anyone who hits it directly (old bookmark, cached link, typed URL)
 * bounces back to /app/setup where the wizard picks up their state.
 */
export default async function GmailStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/app/setup`);
}
