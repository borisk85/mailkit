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
import { Input } from "@/components/ui/input";

export function DangerZoneSection({
  email,
  deleteAction,
}: {
  email: string;
  deleteAction: () => Promise<void>;
}) {
  const t = useTranslations("dashboard.dangerZone");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmInput === email;

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (!v) setConfirmInput("");
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    startTransition(async () => {
      try {
        await deleteAction();
        router.replace("/");
        router.refresh();
      } finally {
        handleOpen(false);
      }
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="mk-eyebrow text-mk-text-tertiary">{t("title")}</h2>
      <div className="rounded-xl border border-mk-border-subtle bg-surface-elevated p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-mk-text-secondary">{t("description")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpen(true)}
            className="shrink-0 border-red-300/60 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            {t("deleteCta")}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent>
          <DialogHeader className="gap-3">
            <DialogTitle>{t("deleteConfirm.title")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm.body")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-mk-text-secondary">
              {t("deleteConfirm.emailPrompt", { email })}
            </p>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              autoComplete="off"
              onPaste={(e) => e.preventDefault()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpen(false)}
              disabled={isPending}
            >
              {t("deleteConfirm.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!canConfirm || isPending}
            >
              {t("deleteConfirm.confirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
