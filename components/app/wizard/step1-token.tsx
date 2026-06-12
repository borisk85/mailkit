"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckSquare,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
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

// ─── Instruction steps ────────────────────────────────────────────────────────

function InstructionStep({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-mk-accent/12 text-[11px] font-semibold text-mk-accent"
      >
        {number}
      </span>
      <div className="flex-1 text-sm leading-snug text-mk-text-secondary">
        {children}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

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
          className="space-y-4"
          aria-label="Steps to create a Cloudflare API token"
        >
          <InstructionStep number={1}>
            <span>Go to Cloudflare → Profile → API Tokens</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-xs font-medium text-mk-accent underline underline-offset-2 hover:text-mk-accent-hover"
              >
                {t("instructionOpenCF")}
                <ExternalLink className="size-3" aria-hidden />
              </a>
              <CfScreenshotGallery />
            </div>
          </InstructionStep>

          <InstructionStep number={2}>
            Click{" "}
            <strong className="font-semibold text-mk-text-primary">
              Create Token
            </strong>{" "}
            → Use template{" "}
            <strong className="font-semibold text-mk-text-primary">
              Custom Token
            </strong>
          </InstructionStep>

          <InstructionStep number={3}>
            <span className="block mb-2">Add these permissions:</span>
            <PermissionChecklist />
          </InstructionStep>

          <InstructionStep number={4}>
            Set{" "}
            <strong className="font-semibold text-mk-text-primary">
              Zone Resource
            </strong>{" "}
            → Specific zone → your domain
          </InstructionStep>

          <InstructionStep number={5}>
            Click{" "}
            <strong className="font-semibold text-mk-text-primary">
              Continue to summary
            </strong>{" "}
            →{" "}
            <strong className="font-semibold text-mk-text-primary">
              Create Token
            </strong>{" "}
            → Copy the token
          </InstructionStep>
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
