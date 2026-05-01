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

export function DangerZoneSection({
  deleteAction,
}: {
  deleteAction: () => Promise<void>;
}) {
  const t = useTranslations("dashboard.dangerZone");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await deleteAction();
        router.replace("/");
        router.refresh();
      } finally {
        setOpen(false);
      }
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-500">
        {t("title")}
      </h2>
      <div className="rounded-lg border border-red-200 p-4 dark:border-red-900/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-mk-text-secondary">{t("description")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="shrink-0 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-900 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-200"
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
