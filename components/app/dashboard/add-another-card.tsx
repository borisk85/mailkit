import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";

/**
 * "Add new mailbox" — a slot row, not a card. Rendered inside the
 * mailboxes list (page wraps it with SetupsSection in one space-y-3
 * group) as a thin dashed placeholder under the last mailbox, so it
 * reads as "empty slot for your next mailbox" instead of a second
 * banner duplicating the mailbox card above. Whole row is the link.
 */
export async function AddAnotherCard({ locale }: { locale: string }) {
  const t = await getTranslations({
    locale,
    namespace: "dashboard.addAnother",
  });

  return (
    <Link
      href="/api/checkout/start"
      className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-mk-border-subtle px-4 py-3 text-sm font-medium text-mk-text-secondary transition-colors hover:border-mk-accent/50 hover:bg-surface-elevated/60 hover:text-mk-text-primary"
    >
      <Plus
        className="size-4 text-mk-text-tertiary transition-colors group-hover:text-mk-accent"
        aria-hidden
      />
      {t("label")}
    </Link>
  );
}
