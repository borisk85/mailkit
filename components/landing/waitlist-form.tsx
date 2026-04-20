"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/app/[locale]/actions";

export function WaitlistForm() {
  const t = useTranslations("hero");
  const tWaitlist = useTranslations("waitlist");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex w-full max-w-md items-center justify-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
      >
        <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
        <span>{tWaitlist("success")}</span>
      </div>
    );
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await joinWaitlist(locale, formData);
          if (result.status === "success") {
            setSubmitted(true);
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <Input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder={t("emailPlaceholder")}
        className="h-12 flex-1"
        disabled={isPending}
      />
      <Button
        type="submit"
        size="lg"
        className="h-12 px-6"
        disabled={isPending}
      >
        {isPending ? "…" : t("cta")}
      </Button>
    </form>
  );
}
