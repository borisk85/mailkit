"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

function openSupportChat() {
  window.dispatchEvent(new CustomEvent("mailkit:open-support"));
}

export function ResourcesSection() {
  const t = useTranslations("dashboard.resources");

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-mk-text-primary">
        {t("title")}
      </h2>
      <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <li>
          <Link
            href="/terms"
            className="text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("terms")}
          </Link>
        </li>
        <li>
          <Link
            href="/privacy"
            className="text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("privacy")}
          </Link>
        </li>
        <li>
          <Link
            href="/guarantee"
            className="text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("guarantee")}
          </Link>
        </li>
        <li>
          <button
            onClick={openSupportChat}
            className="text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("support")}
          </button>
        </li>
      </ul>
    </section>
  );
}
