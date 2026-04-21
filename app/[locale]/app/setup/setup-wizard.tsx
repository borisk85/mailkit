"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  resumeDestinationVerify,
  startSetupRun,
  verifyCloudflareToken,
} from "./actions";

type Zone = { id: string; name: string; accountId: string };

type WizardState =
  | { kind: "token_entry"; errorKey?: string; errorDetails?: string }
  | { kind: "token_validating" }
  | {
      kind: "zone_selection";
      zones: Zone[];
      token: string;
    }
  | {
      kind: "setup_running";
      token: string;
      zoneName: string;
      mailboxLocal: string;
      reached: "routing" | "dns" | "destination" | "rule" | "done";
    }
  | {
      kind: "awaiting_verify";
      token: string;
      runId: string;
      destinationEmail: string;
      zoneName: string;
      mailboxLocal: string;
      errorKey?: string;
    }
  | {
      kind: "done";
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
    }
  | {
      kind: "failed";
      errorKey: string;
      errorDetails?: string;
    };

const MOCK_ZONES: Zone[] = [
  { id: "zone_mock_1", name: "example.com", accountId: "acc_mock" },
  { id: "zone_mock_2", name: "indiehacker.io", accountId: "acc_mock" },
];

function mockInitialState(
  mock:
    | "token_entry"
    | "token_invalid"
    | "zone_selection"
    | "setup_running"
    | "awaiting_verify"
    | "done"
    | "failed"
    | null,
): WizardState {
  switch (mock) {
    case "token_entry":
      return { kind: "token_entry" };
    case "token_invalid":
      return { kind: "token_entry", errorKey: "setup.errors.invalid_token" };
    case "zone_selection":
      return { kind: "zone_selection", zones: MOCK_ZONES, token: "mock_token" };
    case "setup_running":
      return {
        kind: "setup_running",
        token: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        reached: "dns",
      };
    case "awaiting_verify":
      return {
        kind: "awaiting_verify",
        token: "mock_token",
        runId: "11111111-2222-4333-8444-555555555555",
        destinationEmail: "owner@gmail.com",
        zoneName: "example.com",
        mailboxLocal: "hello",
      };
    case "done":
      return {
        kind: "done",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "failed":
      return {
        kind: "failed",
        errorKey: "setup.errors.dns_rejected",
        errorDetails: "content for MX must be a hostname",
      };
    default:
      return { kind: "token_entry" };
  }
}

export function SetupWizard({
  initialMock,
}: {
  initialMock:
    | "token_entry"
    | "token_invalid"
    | "zone_selection"
    | "setup_running"
    | "awaiting_verify"
    | "done"
    | "failed"
    | null;
}) {
  const t = useTranslations("setup");
  const tErr = useTranslations("setup.errors");
  const tState = useTranslations("setup.step3.state");
  const tSteps = useTranslations("setup.step3.steps");
  const locale = useLocale();

  const [state, setState] = useState<WizardState>(() =>
    mockInitialState(initialMock),
  );
  const [isPending, startTransition] = useTransition();

  function translateErr(key: string, details?: string): string {
    const short = key.replace(/^setup\.errors\./, "");
    try {
      return details
        ? tErr(short as never, { details } as never)
        : tErr(short as never);
    } catch {
      return short;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </header>

      {state.kind === "token_entry" || state.kind === "token_validating" ? (
        <TokenEntryStep
          isPending={isPending || state.kind === "token_validating"}
          errorKey={state.kind === "token_entry" ? state.errorKey : undefined}
          errorDetails={
            state.kind === "token_entry" ? state.errorDetails : undefined
          }
          onSubmit={(token) => {
            setState({ kind: "token_validating" });
            startTransition(async () => {
              const result = await verifyCloudflareToken({ token });
              if (result.status === "ok") {
                setState({
                  kind: "zone_selection",
                  zones: result.zones,
                  token,
                });
              } else {
                setState({
                  kind: "token_entry",
                  errorKey: result.errorKey,
                  errorDetails:
                    typeof result.details === "string"
                      ? result.details
                      : undefined,
                });
              }
            });
          }}
          t={t}
          locale={locale}
          translateErr={translateErr}
        />
      ) : null}

      {state.kind === "zone_selection" ? (
        <ZoneSelectionStep
          zones={state.zones}
          isPending={isPending}
          onSubmit={(zoneId, mailboxLocal) => {
            const chosen = state.zones.find((z) => z.id === zoneId);
            if (!chosen) return;
            setState({
              kind: "setup_running",
              token: state.token,
              zoneName: chosen.name,
              mailboxLocal,
              reached: "routing",
            });
            startTransition(async () => {
              const result = await startSetupRun({
                token: state.token,
                zoneId,
                mailboxLocal,
              });
              if (result.status === "error") {
                setState({
                  kind: "failed",
                  errorKey: result.errorKey,
                  errorDetails:
                    typeof result.details === "string"
                      ? result.details
                      : undefined,
                });
                return;
              }
              if (result.runStatus === "cf_awaiting_destination_verify") {
                setState({
                  kind: "awaiting_verify",
                  token: state.token,
                  runId: result.runId,
                  destinationEmail: result.destinationEmail,
                  zoneName: chosen.name,
                  mailboxLocal,
                });
                return;
              }
              setState({
                kind: "done",
                zoneName: chosen.name,
                mailboxLocal,
                destinationEmail: result.destinationEmail,
              });
            });
          }}
          t={t}
        />
      ) : null}

      {state.kind === "setup_running" ? (
        <ProgressStep
          state="running"
          zoneName={state.zoneName}
          mailboxLocal={state.mailboxLocal}
          reached={state.reached}
          tState={tState}
          tSteps={tSteps}
        />
      ) : null}

      {state.kind === "awaiting_verify" ? (
        <AwaitingVerifyStep
          state={state}
          isPending={isPending}
          t={t}
          tState={tState}
          tSteps={tSteps}
          translateErr={translateErr}
          onRetry={() => {
            startTransition(async () => {
              const result = await resumeDestinationVerify({
                runId: state.runId,
                token: state.token,
              });
              if (result.status === "error") {
                setState((prev) =>
                  prev.kind === "awaiting_verify"
                    ? { ...prev, errorKey: result.errorKey }
                    : prev,
                );
                return;
              }
              if (result.runStatus === "cf_done") {
                setState({
                  kind: "done",
                  zoneName: state.zoneName,
                  mailboxLocal: state.mailboxLocal,
                  destinationEmail: result.destinationEmail,
                });
              }
            });
          }}
        />
      ) : null}

      {state.kind === "done" ? (
        <DoneStep state={state} t={t} tState={tState} tSteps={tSteps} />
      ) : null}

      {state.kind === "failed" ? (
        <FailedStep
          state={state}
          onRestart={() => setState({ kind: "token_entry" })}
          t={t}
          translateErr={translateErr}
        />
      ) : null}
    </div>
  );
}

function TokenEntryStep({
  isPending,
  errorKey,
  errorDetails,
  onSubmit,
  t,
  translateErr,
}: {
  isPending: boolean;
  errorKey?: string;
  errorDetails?: string;
  onSubmit: (token: string) => void;
  t: (key: string) => string;
  locale: string;
  translateErr: (key: string, details?: string) => string;
}) {
  const [token, setToken] = useState("");
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{t("step1.title")}</h2>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!token.trim()) return;
          onSubmit(token.trim());
        }}
      >
        <label className="block text-sm font-medium">
          {t("step1.tokenLabel")}
          <Input
            className="mt-1 font-mono"
            type="password"
            autoComplete="off"
            placeholder={t("step1.tokenPlaceholder")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={isPending}
          />
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("step1.tokenHelp")}{" "}
          <a
            href="https://dash.cloudflare.com/profile/api-tokens"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {t("step1.tokenHelpLink")}
          </a>
        </p>
        <Button type="submit" disabled={isPending || !token.trim()}>
          {isPending ? t("step1.ctaLoading") : t("step1.cta")}
        </Button>
      </form>
      {errorKey ? (
        <InlineError message={translateErr(errorKey, errorDetails)} />
      ) : null}
    </section>
  );
}

function ZoneSelectionStep({
  zones,
  isPending,
  onSubmit,
  t,
}: {
  zones: Zone[];
  isPending: boolean;
  onSubmit: (zoneId: string, mailboxLocal: string) => void;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [mailboxLocal, setMailboxLocal] = useState("hello");
  const hint = useMemo(
    () => t("step2.mailboxHint", { local: mailboxLocal || "hello" }),
    [mailboxLocal, t],
  );
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{t("step2.title")}</h2>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!zoneId || !mailboxLocal) return;
          onSubmit(zoneId, mailboxLocal);
        }}
      >
        <label className="block text-sm font-medium">
          {t("step2.zoneLabel")}
          <select
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            disabled={isPending}
          >
            <option value="" disabled>
              {t("step2.zonePlaceholder")}
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {t("step2.mailboxLabel")}
          <Input
            className="mt-1 font-mono"
            value={mailboxLocal}
            onChange={(e) => setMailboxLocal(e.target.value.toLowerCase())}
            disabled={isPending}
            pattern="[a-z0-9._-]{1,64}"
            required
          />
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
        <Button type="submit" disabled={isPending}>
          {isPending ? t("step2.ctaLoading") : t("step2.cta")}
        </Button>
      </form>
    </section>
  );
}

type ProgressKey = "routing" | "dns" | "destination" | "rule";
const PROGRESS_ORDER: ProgressKey[] = ["routing", "dns", "destination", "rule"];

function statusOf(
  step: ProgressKey,
  overall: "running" | "done" | "awaiting" | "failed",
  reached: ProgressKey | "done",
): "pending" | "running" | "ok" | "error" {
  if (overall === "done") return "ok";
  const idxStep = PROGRESS_ORDER.indexOf(step);
  const idxReached =
    reached === "done"
      ? PROGRESS_ORDER.length
      : PROGRESS_ORDER.indexOf(reached as ProgressKey);
  if (idxReached > idxStep) return "ok";
  if (idxReached === idxStep) {
    if (overall === "awaiting" && step === "destination") return "running";
    if (overall === "running") return "running";
    return "pending";
  }
  return "pending";
}

function ProgressStep({
  state,
  zoneName,
  mailboxLocal,
  reached,
  tState,
  tSteps,
}: {
  state: "running";
  zoneName: string;
  mailboxLocal: string;
  reached: ProgressKey | "done";
  tState: (key: string) => string;
  tSteps: (key: string) => string;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">
        {zoneName} · {mailboxLocal}@{zoneName}
      </h2>
      <ol className="space-y-2">
        {PROGRESS_ORDER.map((step) => {
          const s = statusOf(step, state, reached);
          return (
            <ProgressRow
              key={step}
              label={tSteps(step)}
              status={s}
              stateLabel={tState(s)}
            />
          );
        })}
      </ol>
    </section>
  );
}

function AwaitingVerifyStep({
  state,
  isPending,
  t,
  tState,
  tSteps,
  translateErr,
  onRetry,
}: {
  state: Extract<WizardState, { kind: "awaiting_verify" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <ol className="space-y-2">
        {PROGRESS_ORDER.map((step) => {
          const s = statusOf(step, "awaiting", "destination");
          return (
            <ProgressRow
              key={step}
              label={tSteps(step)}
              status={s}
              stateLabel={tState(s)}
            />
          );
        })}
      </ol>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
        <div className="font-medium text-amber-900 dark:text-amber-100">
          {t("step3.awaitingVerify.title")}
        </div>
        <p className="mt-1 text-amber-900 dark:text-amber-100">
          {t("step3.awaitingVerify.body", { email: state.destinationEmail })}
        </p>
        <Button
          className="mt-3"
          onClick={onRetry}
          disabled={isPending}
          variant="outline"
        >
          {isPending
            ? t("step3.awaitingVerify.ctaLoading")
            : t("step3.awaitingVerify.cta")}
        </Button>
        {state.errorKey ? (
          <div className="mt-3">
            <InlineError message={translateErr(state.errorKey)} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DoneStep({
  state,
  t,
  tState,
  tSteps,
}: {
  state: Extract<WizardState, { kind: "done" }>;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 p-6 dark:border-emerald-900">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <ol className="space-y-2">
        {PROGRESS_ORDER.map((step) => (
          <ProgressRow
            key={step}
            label={tSteps(step)}
            status="ok"
            stateLabel={tState("ok")}
          />
        ))}
      </ol>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
        <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-100">
          <CheckCircle2 className="size-5" aria-hidden />
          {t("step3.done.title")}
        </div>
        <p className="mt-1 text-emerald-900 dark:text-emerald-100">
          {t("step3.done.body", {
            mailbox: state.mailboxLocal,
            domain: state.zoneName,
          })}
        </p>
        <Button className="mt-3" disabled variant="outline">
          {t("step3.done.continueCta")}
        </Button>
      </div>
    </section>
  );
}

function FailedStep({
  state,
  onRestart,
  t,
  translateErr,
}: {
  state: Extract<WizardState, { kind: "failed" }>;
  onRestart: () => void;
  t: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-red-200 p-6 dark:border-red-900">
      <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
        {t("step3.failed.title")}
      </h2>
      <p className="text-sm text-red-900 dark:text-red-100">
        {t("step3.failed.body")}
      </p>
      <InlineError message={translateErr(state.errorKey, state.errorDetails)} />
      <Button onClick={onRestart} variant="outline">
        {t("step3.failed.restartCta")}
      </Button>
    </section>
  );
}

function ProgressRow({
  label,
  status,
  stateLabel,
}: {
  label: string;
  status: "pending" | "running" | "ok" | "error";
  stateLabel: string;
}) {
  const icon =
    status === "ok" ? (
      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
    ) : status === "error" ? (
      <AlertCircle className="size-4 text-red-600" aria-hidden />
    ) : status === "running" ? (
      <Loader2 className="size-4 animate-spin text-zinc-600" aria-hidden />
    ) : (
      <span
        className="inline-block size-4 rounded-full border border-zinc-300 dark:border-zinc-700"
        aria-hidden
      />
    );
  return (
    <li className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {stateLabel}
      </span>
    </li>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
    >
      <span className="flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        {message}
      </span>
    </div>
  );
}
