"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  isSetupReSetupEligible,
  setupDetailLabel,
  setupOverallState,
  type DashboardSetup,
  type SetupOverallState,
} from "@/lib/dashboard-types";
import { Button } from "@/components/ui/button";

import { DeleteSetupButton } from "./delete-setup-button";
import { StatusBadge } from "./status-badge";

const stateTone: Record<
  SetupOverallState,
  "info" | "warn" | "success" | "danger"
> = {
  in_progress: "info",
  awaiting_verification: "warn",
  done: "success",
  failed: "danger",
};

export function SetupsSection({
  setups,
  deleteSetupAction,
}: {
  setups: DashboardSetup[];
  deleteSetupAction: (runId: string) => Promise<void>;
}) {
  const t = useTranslations("dashboard.setups");
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  function handleDeleteSuccess(runId: string) {
    setFadingIds((prev) => new Set([...prev, runId]));
    setTimeout(() => {
      setHiddenIds((prev) => new Set([...prev, runId]));
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }, 350);
  }

  const visible = setups.filter((s) => !hiddenIds.has(s.id));
  if (visible.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="mk-eyebrow text-mk-text-tertiary">{t("title")}</h2>
      <div className="space-y-3">
        {visible.map((setup) => {
          const state = setupOverallState(setup);
          const tone = stateTone[state];
          const isFading = fadingIds.has(setup.id);
          return (
            <div
              key={setup.id}
              className={`space-y-3 rounded-xl border border-mk-border-subtle bg-surface-elevated p-4 transition-all duration-350 ${isFading ? "opacity-0 scale-95" : "opacity-100"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-mk-text-primary">
                    {setup.mailboxLocal}@{setup.domain}
                  </p>
                  <p className="mt-0.5 text-xs text-mk-text-tertiary">
                    {t("createdLabel")}:{" "}
                    <time dateTime={setup.createdAt}>
                      {new Date(setup.createdAt).toLocaleDateString("en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </p>
                  {setupDetailLabel(setup.status) ? (
                    <p className="mt-1 text-xs text-mk-text-secondary">
                      {setupDetailLabel(setup.status)}
                    </p>
                  ) : null}
                </div>
                <StatusBadge tone={tone}>{t(`status.${state}`)}</StatusBadge>
              </div>
              {setup.errorMsg ? (
                <p
                  className="rounded-md px-3 py-2 text-xs"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    color: "var(--mk-danger)",
                  }}
                >
                  <span className="font-medium">{t("errorLabel")}:</span>{" "}
                  {setup.errorMsg}
                </p>
              ) : null}
              {state !== "done" && (
                <div className="flex items-center gap-2">
                  {isSetupReSetupEligible(setup) ? (
                    <>
                      <Link href="/app/setup">
                        <Button size="sm" variant="default">
                          {t("actions.reSetup")}
                        </Button>
                      </Link>
                      <DeleteSetupButton
                        runId={setup.id}
                        domain={setup.domain}
                        deleteAction={deleteSetupAction}
                        onSuccess={() => handleDeleteSuccess(setup.id)}
                      />
                    </>
                  ) : (
                    <Link href="/app/setup">
                      <Button size="sm" variant="default">
                        {t("actions.continue")}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
