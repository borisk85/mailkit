import { useTranslations } from "next-intl";

import { SignInButton } from "@/components/auth/sign-in-button";

import { WaitlistForm } from "./waitlist-form";

export function Hero() {
  const t = useTranslations("hero");
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center sm:py-32">
      <span className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        {t("badge")}
      </span>
      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl md:text-6xl dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="max-w-2xl text-balance text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <SignInButton />
      <WaitlistForm />
      <p className="max-w-xl text-sm text-zinc-500 dark:text-zinc-500">
        {t("honest")}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        {t("guarantee")}
      </p>
    </section>
  );
}
