"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckSquare,
  ChevronDown,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CfScreenshotGallery } from "./cf-screenshot-gallery";

// ─── Permission checklist data ──────────────────────────────────────────────

const ZONE_PERMS = [
  "Zone:Zone:Read",
  "Zone:DNS:Edit",
  "Zone:Zone Settings:Edit",
  "Zone:Email Routing Rules:Edit",
] as const;

const ACCOUNT_PERMS = ["Account:Email Routing Addresses:Edit"] as const;

// ─── Inline error ────────────────────────────────────────────────────────────

function InlineError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-mk-danger/30 bg-mk-danger/8 px-3 py-2.5 text-sm text-mk-danger"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

// ─── Permission checklist card ───────────────────────────────────────────────

function PermissionChecklist() {
  const t = useTranslations("setup.wizard.step1");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-mk-border-subtle bg-surface-elevated-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-mk-border-subtle/20 transition-colors"
      >
        <span className="text-xs font-semibold text-mk-text-secondary">
          {t("permTitle")}
        </span>
        <ChevronDown
          className={`size-4 text-mk-text-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-mk-border-subtle">
          <ul className="space-y-1.5">
            {[...ZONE_PERMS, ...ACCOUNT_PERMS].map((perm) => (
              <li key={perm} className="flex items-center gap-2">
                <CheckSquare
                  className="size-4 shrink-0 text-mk-accent"
                  aria-hidden
                />
                <code className="text-xs text-mk-text-primary">{perm}</code>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-md bg-mk-accent/8 px-3 py-2">
            <span className="text-xs leading-snug text-mk-text-secondary">
              {t("scopeNote")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Completed step row ───────────────────────────────────────────────────────

function CompletedStepRow({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 py-1">
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-mk-accent/15 text-mk-accent"
      >
        <Check className="size-3" />
      </span>
      <span className="text-xs text-mk-text-tertiary line-through">
        {label}
      </span>
    </li>
  );
}

// ─── UI element label (kbd chip) ─────────────────────────────────────────────

function UiLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-blue-500/12 px-1.5 py-0.5 text-[12px] font-semibold text-blue-400 leading-none">
      {children}
    </span>
  );
}

// ─── Active instruction step ─────────────────────────────────────────────────

function ActiveStep({
  number,
  total,
  children,
  onNext,
  isLast,
}: {
  number: number;
  total: number;
  children: React.ReactNode;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <li className="space-y-3">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-mk-accent/12 text-[11px] font-semibold text-mk-accent"
        >
          {number}
        </span>
        <div className="space-y-3 flex-1">
          <div className="text-sm leading-snug text-mk-text-primary">
            {children}
          </div>

          {!isLast && (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-mk-accent text-white hover:bg-mk-accent-hover"
              onClick={onNext}
            >
              Done
              <ArrowRight className="size-3" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Step1TokenProps {
  isPending: boolean;
  errorKey?: string;
  errorDetails?: string;
  onSubmit: (token: string) => void;
  translateErr: (key: string, details?: string) => string;
}

export function Step1Token({
  isPending,
  errorKey,
  errorDetails,
  onSubmit,
  translateErr,
}: Step1TokenProps) {
  const t = useTranslations("setup.wizard.step1");
  const tSetup = useTranslations("setup.step1");

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [activeInstruction, setActiveInstruction] = useState(1);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("mk_instruction_step");
      const n = saved ? parseInt(saved, 10) : 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (n >= 2 && n <= 5) setActiveInstruction(n);
    } catch {}
  }, []);

  function advanceInstruction(n: number) {
    try {
      sessionStorage.setItem("mk_instruction_step", String(n));
    } catch {}
    setActiveInstruction(n);
  }

  const TOTAL = 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const stepLabels = [
    "Go to Cloudflare → Profile → API Tokens",
    "Click Create Token → Custom Token",
    "Add permissions",
    "Set Zone Resource → your domain",
    "Create Token → Copy the token",
  ];

  return (
    <div className="grid gap-0 md:grid-cols-2">
      {/* ── Left column: instructions ─────────────────────────────────────── */}
      <div className="space-y-5 pr-8 md:border-r md:border-mk-border-subtle">
        <div>
          <h2 className="text-xl font-semibold text-mk-text-primary">
            {t("heading")}
          </h2>
          <p className="mt-1.5 text-xs text-mk-text-tertiary">{t("sub")}</p>
        </div>

        <ol
          className="space-y-2"
          aria-label="Steps to create a Cloudflare API token"
        >
          {/* Completed steps */}
          {activeInstruction > 1 &&
            stepLabels
              .slice(0, activeInstruction - 1)
              .map((label, i) => (
                <CompletedStepRow key={i + 1} label={label} />
              ))}

          {/* Active step */}
          {activeInstruction === 1 && (
            <ActiveStep
              number={1}
              total={TOTAL}
              onNext={() => advanceInstruction(2)}
              isLast={false}
            >
              <span>
                Go to Cloudflare → Profile → <UiLabel>API Tokens</UiLabel>
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                  >
                    {t("instructionOpenCF")}
                  </Button>
                </a>
                <CfScreenshotGallery from={0} to={1} />
              </div>
            </ActiveStep>
          )}

          {activeInstruction === 2 && (
            <ActiveStep
              number={2}
              total={TOTAL}
              onNext={() => advanceInstruction(3)}
              isLast={false}
            >
              Click <UiLabel>Create Token</UiLabel> → find{" "}
              <UiLabel>Create Custom Token</UiLabel> → click{" "}
              <UiLabel>Get started</UiLabel>
              <div className="mt-2">
                <CfScreenshotGallery from={2} to={3} />
              </div>
            </ActiveStep>
          )}

          {activeInstruction === 3 && (
            <ActiveStep
              number={3}
              total={TOTAL}
              onNext={() => advanceInstruction(4)}
              isLast={false}
            >
              <span className="block mb-2">Add these permissions:</span>
              <PermissionChecklist />
              <div className="mt-2">
                <CfScreenshotGallery from={4} to={4} />
              </div>
            </ActiveStep>
          )}

          {activeInstruction === 4 && (
            <ActiveStep
              number={4}
              total={TOTAL}
              onNext={() => advanceInstruction(5)}
              isLast={false}
            >
              Set <UiLabel>Zone Resource</UiLabel> → Specific zone → your domain
              <div className="mt-2">
                <CfScreenshotGallery from={5} to={5} />
              </div>
            </ActiveStep>
          )}

          {activeInstruction === 5 && (
            <ActiveStep
              number={5}
              total={TOTAL}
              onNext={() => {}}
              isLast={true}
            >
              Click <UiLabel>Continue to summary</UiLabel> →{" "}
              <UiLabel>Create Token</UiLabel> → Copy the token and paste it on
              the right
              <div className="mt-2">
                <CfScreenshotGallery from={6} to={7} />
              </div>
            </ActiveStep>
          )}
        </ol>
      </div>

      {/* ── Right column: token input ─────────────────────────────────────── */}
      <div className="rounded-xl border border-mk-border-subtle bg-surface-elevated p-6 mk-card-shadow self-start md:ml-8">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="cf-token"
              className="block text-sm font-semibold text-mk-text-primary"
            >
              Paste your token
            </label>
            <p className="text-xs text-mk-text-tertiary">
              Cloudflare tokens start with{" "}
              <code className="rounded bg-mk-border-subtle/60 px-1 py-0.5 font-mono text-[11px]">
                cfut_
              </code>
            </p>

            <div className="relative">
              <Input
                id="cf-token"
                type={showToken ? "text" : "password"}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono pr-10"
                placeholder={tSetup("tokenPlaceholder")}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isPending}
                aria-describedby="cf-token-help"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mk-text-tertiary hover:text-mk-text-primary transition-colors"
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
            <p id="cf-token-help" className="sr-only">
              Paste the API token you copied from Cloudflare. It starts with
              cfut_.
            </p>
          </div>

          <Button
            type="submit"
            className={cn(
              "w-full bg-mk-accent text-white hover:bg-mk-accent-hover mk-cta-shadow",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            disabled={isPending || !token.trim()}
          >
            {isPending ? tSetup("ctaLoading") : tSetup("cta")}
          </Button>

          {errorKey && (
            <InlineError message={translateErr(errorKey, errorDetails)} />
          )}
        </form>
      </div>
    </div>
  );
}
