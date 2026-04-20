"use server";

import { getTranslations } from "next-intl/server";

import { createServiceClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function joinWaitlist(
  locale: string,
  formData: FormData,
): Promise<WaitlistResult> {
  const t = await getTranslations({ locale, namespace: "waitlist" });
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: t("invalidEmail") };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("waitlist")
      .insert({ email, locale });

    if (error) {
      if (error.code === "23505") {
        return { status: "error", message: t("alreadyIn") };
      }
      console.error("[waitlist] insert failed", error);
      return { status: "error", message: t("error") };
    }
    return { status: "success", message: t("success") };
  } catch (e) {
    console.error("[waitlist] unexpected", e);
    return { status: "error", message: t("error") };
  }
}
