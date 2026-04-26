"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Section: account info + delete-account flow. Client component because
 * the destructive confirm modal is interactive — RSC would have to
 * round-trip on every open/close.
 *
 * `deleteAction` is wired in by the parent RSC (step 3 server actions);
 * at step 2 the parent passes a stub that just resolves so the modal +
 * pending-state logic can still be exercised in Playwright snapshots.
 */
export function AccountSection({
  email,
  fullName,
  locale,
  deleteAction,
}: {
  email: string;
  fullName: string | null;
  locale: string;
  deleteAction: () => Promise<void>;
}) {
  const t = useTranslations("dashboard.account");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await deleteAction();
        // Account is gone — bounce to root. The root layout's auth
        // gate will redirect to landing on the next request.
        router.replace(`/${locale}`);
        router.refresh();
      } finally {
        setOpen(false);
      }
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {t("title")}
      </h2>
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("emailLabel")}
          </dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{email}</dd>
          {fullName ? (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">
                {t("nameLabel")}
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{fullName}</dd>
            </>
          ) : null}
        </dl>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-red-700 hover:bg-red-50 hover:text-red-900 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-200"
          >
            {t("deleteCta")}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm.title")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("deleteConfirm.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {t("deleteConfirm.confirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
