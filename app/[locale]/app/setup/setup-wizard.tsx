"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GmailStepSchematic } from "@/components/app/gmail-step-schematic";
import { cn } from "@/lib/utils";

import {
  checkDomainNS,
  confirmGmailSendAs,
  continueBrevoSetup,
  prepareGmailStep,
  resumeDestinationVerify,
  startSetupRun,
  verifyCloudflareToken,
} from "./actions";

type SmtpDisplay = {
  host: string;
  port: number;
  username: string;
  password: string;
  securityMode: "starttls" | "ssl";
  keyVersion: number;
};

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
      kind: "cf_done_pending_brevo";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      errorKey?: string;
    }
  | {
      kind: "brevo_running";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      reached: "sender" | "dns" | "verify" | "done";
    }
  | {
      kind: "brevo_awaiting_retry";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      errorKey?: string;
    }
  | {
      kind: "brevo_done";
      runId: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      errorKey?: string;
    }
  | {
      kind: "gmail_instructions_shown";
      runId: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
    }
  | {
      kind: "gmail_smtp_ready";
      runId: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      targetEmail: string;
      displayName: string;
      smtp: SmtpDisplay;
      errorKey?: string;
    }
  | {
      kind: "gmail_done";
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      targetEmail: string;
    }
  | {
      kind: "failed";
      errorKey: string;
      errorDetails?: string;
      source?: "cf" | "brevo" | "gmail";
    }
  | {
      kind: "ns_warning";
      domain: string;
      zones: Zone[];
      token: string;
      zoneId: string;
      mailboxLocal: string;
    };

const MOCK_ZONES: Zone[] = [
  { id: "zone_mock_1", name: "example.com", accountId: "acc_mock" },
  { id: "zone_mock_2", name: "indiehacker.io", accountId: "acc_mock" },
];

type MockKey =
  | "token_entry"
  | "token_invalid"
  | "zone_selection"
  | "setup_running"
  | "awaiting_verify"
  | "done"
  | "failed"
  | "brevo_sender_created"
  | "brevo_dns_written"
  | "brevo_verified"
  | "brevo_done"
  | "gmail_instructions_shown"
  | "gmail_smtp_ready"
  | "gmail_send_as_verified"
  | "gmail_done"
  | null;

const MOCK_SMTP: SmtpDisplay = {
  host: "smtp-relay.brevo.com",
  port: 587,
  username: "owner@brevo.com",
  password: "xsmtpsib-mock-9f2c8b1a4d6e7f0a",
  securityMode: "starttls",
  keyVersion: 1,
};

function mockInitialState(mock: MockKey): WizardState {
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
        kind: "cf_done_pending_brevo",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "brevo_sender_created":
      return {
        kind: "brevo_running",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        reached: "sender",
      };
    case "brevo_dns_written":
      return {
        kind: "brevo_awaiting_retry",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        errorKey: "setup.errors.brevo_verify_timeout",
      };
    case "brevo_verified":
      return {
        kind: "brevo_running",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        reached: "verify",
      };
    case "brevo_done":
      return {
        kind: "brevo_done",
        runId: "11111111-2222-4333-8444-555555555555",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "gmail_instructions_shown":
      return {
        kind: "gmail_instructions_shown",
        runId: "11111111-2222-4333-8444-555555555555",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "gmail_smtp_ready":
      return {
        kind: "gmail_smtp_ready",
        runId: "11111111-2222-4333-8444-555555555555",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        targetEmail: "hello@example.com",
        displayName: "Hello",
        smtp: MOCK_SMTP,
      };
    case "gmail_send_as_verified":
    case "gmail_done":
      return {
        kind: "gmail_done",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        targetEmail: "hello@example.com",
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

export function SetupWizard({ initialMock }: { initialMock: MockKey }) {
  const t = useTranslations("setup");
  const tErr = useTranslations("setup.errors");
  const tState = useTranslations("setup.step3.state");
  const tSteps = useTranslations("setup.step3.steps");
  const tBrevo = useTranslations("setup.brevoSteps");
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
        <h1 className="text-3xl font-bold tracking-tight text-mk-text-primary">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-mk-text-secondary">{t("subtitle")}</p>
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
            startTransition(async () => {
              const nsCheck = await checkDomainNS({ domain: chosen.name });
              if (nsCheck.status === "not_cloudflare") {
                setState({
                  kind: "ns_warning",
                  domain: chosen.name,
                  zones: state.zones,
                  token: state.token,
                  zoneId,
                  mailboxLocal,
                });
                return;
              }
              setState({
                kind: "setup_running",
                token: state.token,
                zoneName: chosen.name,
                mailboxLocal,
                reached: "routing",
              });
              const result = await startSetupRun({
                token: state.token,
                zoneId,
                mailboxLocal,
              });
              if (result.status === "error") {
                setState({
                  kind: "failed",
                  source: "cf",
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
              // Resume path: existing run may already be past Brevo or
              // deep into the Gmail wizard. Route the UI to the matching
              // kind instead of always dropping onto the "Continue to
              // Brevo" CTA.
              const zoneName = chosen.name;
              if (
                result.runStatus === "brevo_done" ||
                result.runStatus === "gmail_instructions_shown" ||
                result.runStatus === "gmail_smtp_ready" ||
                result.runStatus === "gmail_send_as_verified" ||
                result.runStatus === "done"
              ) {
                setState({
                  kind: "brevo_done",
                  runId: result.runId,
                  zoneName,
                  mailboxLocal,
                  destinationEmail: result.destinationEmail,
                });
                return;
              }
              if (
                result.runStatus === "brevo_sender_created" ||
                result.runStatus === "brevo_dns_written" ||
                result.runStatus === "brevo_verified"
              ) {
                const reached: "sender" | "dns" | "verify" =
                  result.runStatus === "brevo_sender_created"
                    ? "sender"
                    : result.runStatus === "brevo_dns_written"
                      ? "dns"
                      : "verify";
                setState({
                  kind: "brevo_awaiting_retry",
                  runId: result.runId,
                  cfToken: state.token,
                  zoneName,
                  mailboxLocal,
                  destinationEmail: result.destinationEmail,
                  errorKey: "setup.errors.brevo_verify_timeout",
                });
                void reached;
                return;
              }
              setState({
                kind: "cf_done_pending_brevo",
                runId: result.runId,
                cfToken: state.token,
                zoneName,
                mailboxLocal,
                destinationEmail: result.destinationEmail,
              });
            });
          }}
          t={t}
        />
      ) : null}

      {state.kind === "ns_warning" ? (
        <div className="rounded-2xl border border-mk-border-strong bg-surface-elevated p-8 text-center">
          <AlertCircle
            className="mx-auto mb-4 size-10 text-mk-warning"
            aria-hidden
          />
          <h2 className="mk-heading-2 mb-2 text-mk-text-primary">
            {t("nsWarning.heading", { domain: state.domain })}
          </h2>
          <p className="mk-body text-mk-text-secondary mb-6">
            {t("nsWarning.body")}
          </p>
          <p className="mk-body-small text-mk-text-tertiary mb-6">
            <a
              href="https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-mk-text-secondary"
            >
              {t("nsWarning.guideLink")}
            </a>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() =>
                setState({
                  kind: "zone_selection",
                  zones: state.zones,
                  token: state.token,
                })
              }
            >
              {t("nsWarning.cancelBtn")}
            </Button>
          </div>
        </div>
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
                  kind: "cf_done_pending_brevo",
                  runId: state.runId,
                  cfToken: state.token,
                  zoneName: state.zoneName,
                  mailboxLocal: state.mailboxLocal,
                  destinationEmail: result.destinationEmail,
                });
              }
            });
          }}
        />
      ) : null}

      {state.kind === "cf_done_pending_brevo" ? (
        <CfDonePendingBrevoStep
          state={state}
          isPending={isPending}
          t={t}
          tState={tState}
          tSteps={tSteps}
          translateErr={translateErr}
          onContinue={() => {
            const snapshot = state;
            setState({
              kind: "brevo_running",
              runId: snapshot.runId,
              cfToken: snapshot.cfToken,
              zoneName: snapshot.zoneName,
              mailboxLocal: snapshot.mailboxLocal,
              destinationEmail: snapshot.destinationEmail,
              reached: "sender",
            });
            startTransition(async () => {
              const result = await continueBrevoSetup({
                runId: snapshot.runId,
                cfToken: snapshot.cfToken,
              });
              handleBrevoResult(result, snapshot, setState);
            });
          }}
        />
      ) : null}

      {state.kind === "brevo_running" ? (
        <BrevoRunningStep
          state={state}
          t={t}
          tState={tState}
          tSteps={tSteps}
          tBrevo={tBrevo}
        />
      ) : null}

      {state.kind === "brevo_awaiting_retry" ? (
        <BrevoAwaitingRetryStep
          state={state}
          isPending={isPending}
          t={t}
          tState={tState}
          tSteps={tSteps}
          tBrevo={tBrevo}
          translateErr={translateErr}
          onRetry={() => {
            const snapshot = state;
            startTransition(async () => {
              const result = await continueBrevoSetup({
                runId: snapshot.runId,
                cfToken: snapshot.cfToken,
              });
              handleBrevoResult(result, snapshot, setState);
            });
          }}
        />
      ) : null}

      {state.kind === "brevo_done" ? (
        <BrevoDoneStep
          state={state}
          isPending={isPending}
          t={t}
          tState={tState}
          tSteps={tSteps}
          tBrevo={tBrevo}
          translateErr={translateErr}
          onContinue={() => {
            const snapshot = state;
            setState({
              kind: "gmail_instructions_shown",
              runId: snapshot.runId,
              zoneName: snapshot.zoneName,
              mailboxLocal: snapshot.mailboxLocal,
              destinationEmail: snapshot.destinationEmail,
            });
            startTransition(async () => {
              const result = await prepareGmailStep({ runId: snapshot.runId });
              if (result.status === "error") {
                setState({
                  kind: "brevo_done",
                  runId: snapshot.runId,
                  zoneName: snapshot.zoneName,
                  mailboxLocal: snapshot.mailboxLocal,
                  destinationEmail: snapshot.destinationEmail,
                  errorKey: result.errorKey,
                });
                return;
              }
              setState({
                kind: "gmail_smtp_ready",
                runId: snapshot.runId,
                zoneName: snapshot.zoneName,
                mailboxLocal: snapshot.mailboxLocal,
                destinationEmail: snapshot.destinationEmail,
                targetEmail: result.targetEmail,
                displayName: result.displayName,
                smtp: result.smtp,
              });
            });
          }}
        />
      ) : null}

      {state.kind === "gmail_instructions_shown" ? (
        <GmailLoadingStep state={state} t={t} />
      ) : null}

      {state.kind === "gmail_smtp_ready" ? (
        <GmailWizard
          state={state}
          isPending={isPending}
          t={t}
          translateErr={translateErr}
          onComplete={() => {
            const snapshot = state;
            startTransition(async () => {
              const result = await confirmGmailSendAs({
                runId: snapshot.runId,
              });
              if (result.status === "error") {
                setState({ ...snapshot, errorKey: result.errorKey });
                return;
              }
              setState({
                kind: "gmail_done",
                zoneName: snapshot.zoneName,
                mailboxLocal: snapshot.mailboxLocal,
                destinationEmail: snapshot.destinationEmail,
                targetEmail: snapshot.targetEmail,
              });
            });
          }}
        />
      ) : null}

      {state.kind === "gmail_done" ? (
        <GmailDoneStep state={state} t={t} />
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
        <p className="text-xs text-mk-text-tertiary">
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
        <p className="text-xs text-mk-text-tertiary">{hint}</p>
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

type BrevoReached = "sender" | "dns" | "verify" | "done";
const BREVO_PROGRESS_ORDER: BrevoReached[] = [
  "sender",
  "dns",
  "verify",
  "done",
];

function brevoStatusOf(
  step: BrevoReached,
  overall: "running" | "awaiting" | "done",
  reached: BrevoReached,
): "pending" | "running" | "ok" | "error" {
  if (overall === "done") return "ok";
  const idxStep = BREVO_PROGRESS_ORDER.indexOf(step);
  const idxReached = BREVO_PROGRESS_ORDER.indexOf(reached);
  if (idxReached > idxStep) return "ok";
  if (idxReached === idxStep) {
    if (overall === "awaiting" && step === "verify") return "running";
    if (overall === "running") return "running";
    return "pending";
  }
  return "pending";
}

function CfDoneBlock({
  zoneName,
  tState,
  tSteps,
}: {
  zoneName: string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
}) {
  return (
    <ol className="space-y-2">
      {PROGRESS_ORDER.map((step) => (
        <ProgressRow
          key={`cf-${step}-${zoneName}`}
          label={tSteps(step)}
          status="ok"
          stateLabel={tState("ok")}
        />
      ))}
    </ol>
  );
}

function BrevoProgressList({
  overall,
  reached,
  tState,
  tBrevo,
}: {
  overall: "running" | "awaiting" | "done";
  reached: BrevoReached;
  tState: (key: string) => string;
  tBrevo: (key: string) => string;
}) {
  return (
    <ol className="space-y-2">
      {BREVO_PROGRESS_ORDER.map((step) => {
        const s = brevoStatusOf(step, overall, reached);
        return (
          <ProgressRow
            key={`brevo-${step}`}
            label={tBrevo(step)}
            status={s}
            stateLabel={tState(s)}
          />
        );
      })}
    </ol>
  );
}

function CfDonePendingBrevoStep({
  state,
  isPending,
  t,
  tState,
  tSteps,
  translateErr,
  onContinue,
}: {
  state: Extract<WizardState, { kind: "cf_done_pending_brevo" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 p-6 dark:border-emerald-900">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
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
        <Button className="mt-3" onClick={onContinue} disabled={isPending}>
          {isPending ? t("brevo.continueCtaLoading") : t("brevo.continueCta")}
        </Button>
      </div>
      {state.errorKey ? (
        <InlineError message={translateErr(state.errorKey)} />
      ) : null}
    </section>
  );
}

function BrevoRunningStep({
  state,
  t: _t,
  tState,
  tSteps,
  tBrevo,
}: {
  state: Extract<WizardState, { kind: "brevo_running" }>;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  tBrevo: (key: string) => string;
}) {
  void _t;
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
      <BrevoProgressList
        overall="running"
        reached={state.reached}
        tState={tState}
        tBrevo={tBrevo}
      />
    </section>
  );
}

function BrevoAwaitingRetryStep({
  state,
  isPending,
  t,
  tState,
  tSteps,
  tBrevo,
  translateErr,
  onRetry,
}: {
  state: Extract<WizardState, { kind: "brevo_awaiting_retry" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  tBrevo: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
      <BrevoProgressList
        overall="awaiting"
        reached="verify"
        tState={tState}
        tBrevo={tBrevo}
      />
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
        <div className="font-medium text-amber-900 dark:text-amber-100">
          {t("brevo.recheck.title")}
        </div>
        <p className="mt-1 text-amber-900 dark:text-amber-100">
          {t("brevo.recheck.body")}
        </p>
        <Button
          className="mt-3"
          onClick={onRetry}
          disabled={isPending}
          variant="outline"
        >
          {isPending ? t("brevo.recheck.ctaLoading") : t("brevo.recheck.cta")}
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

function BrevoDoneStep({
  state,
  isPending,
  t,
  tState,
  tSteps,
  tBrevo,
  translateErr,
  onContinue,
}: {
  state: Extract<WizardState, { kind: "brevo_done" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  tBrevo: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 p-6 dark:border-emerald-900">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
      <BrevoProgressList
        overall="done"
        reached="done"
        tState={tState}
        tBrevo={tBrevo}
      />
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
        <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-100">
          <CheckCircle2 className="size-5" aria-hidden />
          {t("brevo.terminal.title")}
        </div>
        <p className="mt-1 text-emerald-900 dark:text-emerald-100">
          {t("brevo.terminal.body", {
            mailbox: state.mailboxLocal,
            domain: state.zoneName,
          })}
        </p>
        <Button className="mt-3" onClick={onContinue} disabled={isPending}>
          {isPending
            ? t("gmail.intro.startCtaLoading")
            : t("brevo.terminal.gmailCta")}
        </Button>
      </div>
      {state.errorKey ? (
        <InlineError message={translateErr(state.errorKey)} />
      ) : null}
    </section>
  );
}

function handleBrevoResult(
  result: Awaited<ReturnType<typeof continueBrevoSetup>>,
  snapshot: Extract<
    WizardState,
    { kind: "cf_done_pending_brevo" | "brevo_awaiting_retry" }
  >,
  setState: (s: WizardState) => void,
) {
  if (result.status === "error") {
    if (result.errorKey === "setup.errors.brevo_verify_timeout") {
      setState({
        kind: "brevo_awaiting_retry",
        runId: snapshot.runId,
        cfToken: snapshot.cfToken,
        zoneName: snapshot.zoneName,
        mailboxLocal: snapshot.mailboxLocal,
        destinationEmail: snapshot.destinationEmail,
        errorKey: result.errorKey,
      });
      return;
    }
    // Other errors land in the central failed state.
    setState({
      kind: "failed",
      source: "brevo",
      errorKey: result.errorKey,
      errorDetails:
        typeof result.details === "string" ? result.details : undefined,
    });
    return;
  }
  if (result.runStatus === "brevo_done") {
    setState({
      kind: "brevo_done",
      runId: snapshot.runId,
      zoneName: snapshot.zoneName,
      mailboxLocal: snapshot.mailboxLocal,
      destinationEmail: snapshot.destinationEmail,
    });
    return;
  }
  // Intermediate statuses (sender_created / dns_written / verified) without
  // reaching brevo_done mean the user got a partial response — stay in
  // running state at the reported reached step so the progress list reflects
  // the actual backend state.
  const reached: BrevoReached =
    result.runStatus === "brevo_sender_created"
      ? "sender"
      : result.runStatus === "brevo_dns_written"
        ? "dns"
        : result.runStatus === "brevo_verified"
          ? "verify"
          : "done";
  setState({
    kind: "brevo_running",
    runId: snapshot.runId,
    cfToken: snapshot.cfToken,
    zoneName: snapshot.zoneName,
    mailboxLocal: snapshot.mailboxLocal,
    destinationEmail: snapshot.destinationEmail,
    reached,
  });
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
        {t(
          state.source === "brevo"
            ? "step3.failed.bodyBrevo"
            : "step3.failed.body",
        )}
      </p>
      <InlineError message={translateErr(state.errorKey, state.errorDetails)} />
      <Button onClick={onRestart} variant="outline">
        {t("step3.failed.restartCta")}
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Ticket #6 etap 2 — Gmail Send-As wizard
 * ------------------------------------------------------------------ */

function GmailLoadingStep({
  state,
  t,
}: {
  state: Extract<WizardState, { kind: "gmail_instructions_shown" }>;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const targetEmail = `${state.mailboxLocal}@${state.zoneName}`;
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="text-lg font-semibold">{t("gmail.intro.title")}</h2>
      <p className="text-sm text-mk-text-secondary">
        {t("gmail.intro.subtitle", { target: targetEmail })}
      </p>
      <div className="flex items-center gap-2 text-sm text-mk-text-secondary">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("gmail.intro.startCtaLoading")}
      </div>
    </section>
  );
}

const GMAIL_STEP_IDS = [
  "openSettings",
  "senderInfo",
  "smtpSettings",
  "verificationEmail",
  "confirm",
  "done",
] as const;
type GmailStepId = (typeof GMAIL_STEP_IDS)[number];

function GmailWizard({
  state,
  isPending,
  t,
  translateErr,
  onComplete,
}: {
  state: Extract<WizardState, { kind: "gmail_smtp_ready" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  translateErr: (key: string, details?: string) => string;
  onComplete: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [checkboxError, setCheckboxError] = useState(false);
  const total = GMAIL_STEP_IDS.length;

  function advance() {
    setCurrentIdx((i) => Math.min(i + 1, total - 1));
  }

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("gmail.intro.title")}</h2>
        <span className="text-xs font-medium text-mk-text-tertiary">
          {t("gmail.progress", {
            current: String(currentIdx + 1),
            total: String(total),
          })}
        </span>
      </div>
      <p className="text-sm text-mk-text-secondary">
        {t("gmail.intro.subtitle", { target: state.targetEmail })}
      </p>

      <ol className="space-y-3">
        {GMAIL_STEP_IDS.map((id, idx) => {
          const status: "done" | "active" | "pending" =
            idx < currentIdx
              ? "done"
              : idx === currentIdx
                ? "active"
                : "pending";
          return (
            <GmailStepCard
              key={id}
              id={id}
              idx={idx}
              total={total}
              status={status}
              t={t}
              state={state}
              isPending={isPending}
              confirmed={confirmed}
              setConfirmed={(v) => {
                setConfirmed(v);
                if (v) setCheckboxError(false);
              }}
              checkboxError={checkboxError}
              onExpand={() => setCurrentIdx(idx)}
              onNext={advance}
              onSubmit={() => {
                if (!confirmed) {
                  setCheckboxError(true);
                  return;
                }
                // Auto-advance past the last card so all six show as done
                // before the terminal panel replaces the wizard. Keeps
                // the visual continuity even if confirmGmailSendAs is
                // instant — user sees 6/6 checkmarks, not a mid-flight
                // "step 5 active" snapshot.
                setCurrentIdx(total);
                onComplete();
              }}
            />
          );
        })}
      </ol>

      {state.errorKey ? (
        <InlineError message={translateErr(state.errorKey)} />
      ) : null}
    </section>
  );
}

function GmailStepCard({
  id,
  idx,
  total,
  status,
  t,
  state,
  isPending,
  confirmed,
  setConfirmed,
  checkboxError,
  onExpand,
  onNext,
  onSubmit,
}: {
  id: GmailStepId;
  idx: number;
  total: number;
  status: "done" | "active" | "pending";
  t: (key: string, values?: Record<string, string>) => string;
  state: Extract<WizardState, { kind: "gmail_smtp_ready" }>;
  isPending: boolean;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  checkboxError: boolean;
  onExpand: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const borderClass =
    status === "active"
      ? "border-mk-accent"
      : status === "done"
        ? "border-mk-success/40"
        : "border-mk-border-subtle";
  const icon =
    status === "done" ? (
      <CheckCircle2 className="size-5 text-mk-success" aria-hidden />
    ) : status === "active" ? (
      <Loader2 className="size-5 animate-spin text-mk-accent" aria-hidden />
    ) : (
      <Circle className="size-5 text-mk-text-tertiary" aria-hidden />
    );

  const title = t(`gmail.steps.${id}.title`);

  return (
    <li
      className={cn(
        "rounded-md border p-4 transition-colors",
        borderClass,
        status === "active" && "bg-mk-accent/[0.04]",
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={status === "active"}
      >
        <span className="flex items-center gap-3">
          {icon}
          <span>
            <span className="block text-xs font-medium text-mk-text-tertiary">
              {t("gmail.progress", {
                current: String(idx + 1),
                total: String(total),
              })}
            </span>
            <span className="block text-sm font-semibold">{title}</span>
          </span>
        </span>
        {status === "done" ? (
          <span className="text-xs font-medium text-mk-success">
            {t("step3.state.ok")}
          </span>
        ) : null}
      </button>

      {status === "active" ? (
        <div className="mt-4 space-y-3 border-t border-mk-border-subtle pt-4">
          <GmailStepBody
            id={id}
            t={t}
            state={state}
            isPending={isPending}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            checkboxError={checkboxError}
            onNext={onNext}
            onSubmit={onSubmit}
          />
        </div>
      ) : null}
    </li>
  );
}

function GmailStepBody({
  id,
  t,
  state,
  isPending,
  confirmed,
  setConfirmed,
  checkboxError,
  onNext,
  onSubmit,
}: {
  id: GmailStepId;
  t: (key: string, values?: Record<string, string>) => string;
  state: Extract<WizardState, { kind: "gmail_smtp_ready" }>;
  isPending: boolean;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  checkboxError: boolean;
  onNext: () => void;
  onSubmit: () => void;
}) {
  if (id === "openSettings") {
    return (
      <>
        <GmailStepSchematic id="openSettings" />
        <p className="text-sm">{t("gmail.steps.openSettings.body")}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://mail.google.com/mail/u/0/#settings/accounts"
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button variant="outline" size="sm">
              Open Gmail Settings ↗
            </Button>
          </a>
          <Button onClick={onNext} size="sm">
            {t("gmail.steps.openSettings.nextCta")}
          </Button>
        </div>
      </>
    );
  }
  if (id === "senderInfo") {
    return (
      <>
        <GmailStepSchematic id="senderInfo" />
        <p className="text-sm">{t("gmail.steps.senderInfo.body")}</p>
        <FieldRow
          label={t("gmail.fields.displayName")}
          value={state.displayName}
          t={t}
        />
        <FieldRow
          label={t("gmail.fields.targetEmail")}
          value={state.targetEmail}
          t={t}
          mono
        />
        <Button onClick={onNext} size="sm">
          {t("gmail.steps.senderInfo.nextCta")}
        </Button>
      </>
    );
  }
  if (id === "smtpSettings") {
    return (
      <>
        <GmailStepSchematic id="smtpSettings" />
        <p className="text-sm">{t("gmail.steps.smtpSettings.body")}</p>
        <FieldRow
          label={t("gmail.fields.smtpHost")}
          value={state.smtp.host}
          t={t}
          mono
        />
        <FieldRow
          label={t("gmail.fields.smtpPort")}
          value={String(state.smtp.port)}
          t={t}
          mono
        />
        <FieldRow
          label={t("gmail.fields.smtpUsername")}
          value={state.smtp.username}
          t={t}
          mono
        />
        <PasswordRow
          label={t("gmail.fields.smtpPassword")}
          value={state.smtp.password}
          t={t}
        />
        <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {t("gmail.steps.smtpSettings.passwordWarning")}
        </div>
        <div className="space-y-1 text-sm">
          <span className="block text-xs font-medium text-mk-text-tertiary">
            {t("gmail.fields.smtpSecurity")}
          </span>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="smtp-security"
              defaultChecked={state.smtp.securityMode === "starttls"}
              readOnly
            />
            {t("gmail.steps.smtpSettings.securityStarttls")}
          </label>
          <label className="flex items-center gap-2 text-mk-text-tertiary">
            <input
              type="radio"
              name="smtp-security"
              defaultChecked={state.smtp.securityMode === "ssl"}
              readOnly
            />
            {t("gmail.steps.smtpSettings.securitySsl")}
          </label>
        </div>
        <Button onClick={onNext} size="sm">
          {t("gmail.steps.smtpSettings.nextCta")}
        </Button>
      </>
    );
  }
  if (id === "verificationEmail") {
    return (
      <>
        <GmailStepSchematic id="verificationEmail" />
        <p className="text-sm">
          {t("gmail.steps.verificationEmail.body", {
            target: state.targetEmail,
          })}
        </p>
        <div className="flex items-center gap-2 text-sm text-mk-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Waiting for verification email…
        </div>
        <Button onClick={onNext} size="sm">
          {t("gmail.steps.verificationEmail.nextCta")}
        </Button>
      </>
    );
  }
  if (id === "confirm") {
    return (
      <>
        <GmailStepSchematic id="confirm" />
        <p className="text-sm">
          {t("gmail.steps.confirm.body", { target: state.targetEmail })}
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>{t("gmail.steps.confirm.checkbox")}</span>
        </label>
        {checkboxError ? (
          <InlineError message={t("gmail.errors.checkboxRequired")} />
        ) : null}
        <Button onClick={onSubmit} size="sm" disabled={isPending}>
          {isPending
            ? t("gmail.steps.confirm.submitCtaLoading")
            : t("gmail.steps.confirm.submitCta")}
        </Button>
      </>
    );
  }
  if (id === "done") {
    return (
      <>
        <GmailStepSchematic id="done" />
        <p className="text-sm">
          {t("gmail.steps.done.body", { target: state.targetEmail })}
        </p>
      </>
    );
  }
  return null;
}

function FieldRow({
  label,
  value,
  t,
  mono = false,
}: {
  label: string;
  value: string;
  t: (key: string) => string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-mk-text-tertiary">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          readOnly
          value={value}
          className={cn("flex-1", mono && "font-mono text-sm")}
        />
        <CopyButton value={value} t={t} />
      </div>
    </div>
  );
}

function PasswordRow({
  label,
  value,
  t,
}: {
  label: string;
  value: string;
  t: (key: string) => string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-mk-text-tertiary">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          readOnly
          value={value}
          type={visible ? "text" : "password"}
          className="flex-1 font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setVisible((v) => !v)}
            aria-label={
              visible
                ? t("gmail.common.hidePassword")
                : t("gmail.common.showPassword")
            }
            className="size-11 sm:size-10"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </Button>
          <CopyButton value={value} t={t} />
        </div>
      </div>
    </div>
  );
}

function CopyButton({
  value,
  t,
}: {
  value: string;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function onCopy() {
    setError(false);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2500);
    }
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onCopy}
      aria-label={copied ? t("gmail.common.copied") : t("gmail.common.copy")}
      className={cn("min-h-11 sm:min-h-10", error && "border-red-400")}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      <span className="ml-1.5 text-xs">
        {error
          ? t("gmail.errors.copyFailed")
          : copied
            ? t("gmail.common.copied")
            : t("gmail.common.copy")}
      </span>
    </Button>
  );
}

function GmailDoneStep({
  state,
  t,
}: {
  state: Extract<WizardState, { kind: "gmail_done" }>;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 p-6 dark:border-emerald-900">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          {t("gmail.steps.done.title")}
        </h2>
      </div>
      <p className="text-sm text-emerald-900 dark:text-emerald-100">
        {t("gmail.steps.done.body", { target: state.targetEmail })}
      </p>
      <p className="rounded-md border border-emerald-200/60 bg-emerald-50/40 px-3 py-2 text-xs leading-5 text-emerald-900/80 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100/80">
        {t("gmail.steps.done.warmupTip")}
      </p>
      <Link href="/app" className="inline-flex">
        <Button variant="outline">
          {t("gmail.steps.done.backToDashboard")}
        </Button>
      </Link>
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
        className="inline-block size-4 rounded-full border border-mk-border-strong"
        aria-hidden
      />
    );
  return (
    <li className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-xs text-mk-text-tertiary">{stateLabel}</span>
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
