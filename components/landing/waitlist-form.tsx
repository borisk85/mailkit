"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/app/[locale]/actions";

export function WaitlistForm() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await joinWaitlist(locale, formData);
          if (result.status === "success") {
            toast.success(result.message);
            setSubmitted(true);
            (e.target as HTMLFormElement).reset();
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
        disabled={isPending || submitted}
      />
      <Button
        type="submit"
        size="lg"
        className="h-12 px-6"
        disabled={isPending || submitted}
      >
        {isPending ? "…" : t("cta")}
      </Button>
    </form>
  );
}
