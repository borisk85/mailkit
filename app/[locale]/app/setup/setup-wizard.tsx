"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Send,
} from "lucide-react";
import { TbMailFilled } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GmailStepSchematic } from "@/components/app/gmail-step-schematic";
import { GmailScreenshotGallery } from "@/components/app/wizard/gmail-screenshot-gallery";
import { cn } from "@/lib/utils";
import {
  WizardStepper,
  WIZARD_STEPS,
} from "@/components/app/wizard/wizard-stepper";
import { Step1Token } from "@/components/app/wizard/step1-token";
import { Step3Progress } from "@/components/app/wizard/step3-progress";
import { Step4Dkim } from "@/components/app/wizard/step4-dkim";

import {
  checkDomainNS,
  checkPurchaseStatus,
  confirmGmailSendAs,
  continueSmtpSetup,
  pollDkimStatus,
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
      kind: "cf_done_pending_smtp";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      errorKey?: string;
    }
  | {
      kind: "smtp_running";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      reached: "sender" | "dns" | "verify" | "done";
    }
  | {
      kind: "smtp_awaiting_retry";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      errorKey?: string;
    }
  | {
      kind: "smtp_done";
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
      source?: "cf" | "smtp" | "gmail";
    }
  | {
      kind: "smtp_dkim_polling";
      runId: string;
      cfToken: string;
      zoneName: string;
      mailboxLocal: string;
      destinationEmail: string;
      emailRequested?: boolean;
      /** Mock/test override — skip the 15-min timer and show "taking longer" UI immediately */
      mockIsLong?: boolean;
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
  | "smtp_sender_created"
  | "smtp_dns_written"
  | "smtp_verified"
  | "smtp_done"
  | "smtp_dkim_polling"
  | "smtp_dkim_polling_long"
  | "gmail_instructions_shown"
  | "gmail_smtp_ready"
  | "gmail_send_as_verified"
  | "gmail_done"
  | null;

const MOCK_SMTP: SmtpDisplay = {
  host: "smtp.postmarkapp.com",
  port: 587,
  username: "(server token)",
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
        kind: "cf_done_pending_smtp",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "smtp_sender_created":
      return {
        kind: "smtp_running",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        reached: "sender",
      };
    case "smtp_dns_written":
      return {
        kind: "smtp_awaiting_retry",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        errorKey: "setup.errors.smtp_verify_timeout",
      };
    case "smtp_verified":
      return {
        kind: "smtp_running",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        reached: "verify",
      };
    case "smtp_done":
      return {
        kind: "smtp_done",
        runId: "11111111-2222-4333-8444-555555555555",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "smtp_dkim_polling":
      return {
        kind: "smtp_dkim_polling",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
      };
    case "smtp_dkim_polling_long":
      return {
        kind: "smtp_dkim_polling",
        runId: "11111111-2222-4333-8444-555555555555",
        cfToken: "mock_token",
        zoneName: "example.com",
        mailboxLocal: "hello",
        destinationEmail: "owner@gmail.com",
        mockIsLong: true,
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
      };
    default:
      return { kind: "token_entry" };
  }
}

function getStepperStep(kind: WizardState["kind"]): number {
  if (kind === "token_entry" || kind === "token_validating") return 1;
  if (kind === "zone_selection" || kind === "ns_warning") return 2;
  if (
    kind === "setup_running" ||
    kind === "awaiting_verify" ||
    kind === "cf_done_pending_smtp" ||
    kind === "smtp_running" ||
    kind === "smtp_awaiting_retry"
  )
    return 3;
  if (kind === "smtp_done" || kind === "smtp_dkim_polling") return 4;
  if (
    kind === "gmail_instructions_shown" ||
    kind === "gmail_smtp_ready" ||
    kind === "gmail_done"
  )
    return 5;
  return 1; // failed or unknown
}

// CF token in this browser tab's sessionStorage keeps a refresh on the
// zone-selection step from forcing a re-paste. The token is ALSO stored
// encrypted-at-rest on the run server-side (migration 0013) so a paid
// setup can resume in a session that has no sessionStorage — surfaced back
// as the `initialToken` prop. Tab copy clears on token error / Restart /
// tab close; the server copy is deleted the moment setup completes.
const SETUP_SESSION_KEY = "mk_setup_token_session";

/** Coarse URL token per wizard phase — drives browser Back/Forward. */
function stepForKind(kind: WizardState["kind"]): string {
  switch (kind) {
    case "token_entry":
    case "token_validating":
      return "token";
    case "zone_selection":
    case "ns_warning":
      return "domain";
    case "setup_running":
    case "awaiting_verify":
      return "setup";
    case "cf_done_pending_smtp":
      return "pay";
    case "smtp_running":
    case "smtp_awaiting_retry":
    case "smtp_done":
    case "smtp_dkim_polling":
      return "smtp";
    case "gmail_instructions_shown":
    case "gmail_smtp_ready":
    case "gmail_done":
      return "gmail";
    case "failed":
      return "failed";
    default:
      return "token";
  }
}

export function SetupWizard({
  initialMock,
  activeRun,
  hasPurchase,
  initialToken,
  userEmail,
}: {
  initialMock: MockKey;
  activeRun?: {
    id: string;
    domain: string;
    mailboxLocal: string;
    status: string;
  } | null;
  hasPurchase?: boolean;
  /**
   * CF token decrypted server-side for the run's owner. Lets a paid setup
   * resume the SMTP step in a session that has no sessionStorage token
   * (fresh tab / different device / after sign-out) without dropping the
   * user back to step 1.
   */
  initialToken?: string | null;
  /**
   * The signed-in Google account email. Used to deep-link the Gmail
   * Send-As step straight into the right inbox via ?authuser=, so a user
   * with several Google accounts open doesn't land in the wrong one.
   */
  userEmail?: string;
}) {
  const t = useTranslations("setup");
  const tErr = useTranslations("setup.errors");
  const tState = useTranslations("setup.step3.state");
  const tSteps = useTranslations("setup.step3.steps");
  const tSmtp = useTranslations("setup.smtpSteps");
  const [state, setState] = useState<WizardState>(() =>
    mockInitialState(initialMock),
  );
  const [isPending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  // Purchase gate for the post-CF step. Seeded from the server prop, but a
  // payment can land after this page rendered (webhook beats nothing, the
  // redirect can beat the webhook) — so the post-CF effect below polls and
  // flips this true on its own, then auto-advances to SMTP. No reload, no
  // stale tab, no manual "Continue".
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(!!hasPurchase);
  // Guards the cf_done → SMTP hand-off against a double-fire (auto-advance
  // effect + button) for ONE run, but keyed by runId so a fresh run after a
  // restart can advance again — a plain boolean stayed true forever and left
  // the Continue button dead on the next run.
  const advancedRunIdRef = useRef<string | null>(null);

  function runContinueToSmtp(
    snapshot: Extract<WizardState, { kind: "cf_done_pending_smtp" }>,
  ) {
    if (advancedRunIdRef.current === snapshot.runId) return;
    advancedRunIdRef.current = snapshot.runId;
    setState({
      kind: "smtp_running",
      runId: snapshot.runId,
      cfToken: snapshot.cfToken,
      zoneName: snapshot.zoneName,
      mailboxLocal: snapshot.mailboxLocal,
      destinationEmail: snapshot.destinationEmail,
      reached: "sender",
    });
    // Advance the SMTP substep circles in their real order while the server
    // works — continueSmtpSetup runs sender → dns → verify in one response,
    // so without this only the first circle would ever spin.
    const smtpSubsteps = ["sender", "dns", "verify"] as const;
    let sIdx = 0;
    const smtpTimer = setInterval(() => {
      sIdx += 1;
      if (sIdx >= smtpSubsteps.length) {
        clearInterval(smtpTimer);
        return;
      }
      setState((prev) =>
        prev.kind === "smtp_running"
          ? { ...prev, reached: smtpSubsteps[sIdx] }
          : prev,
      );
    }, 1100);
    startTransition(async () => {
      try {
        const result = await continueSmtpSetup({
          runId: snapshot.runId,
          cfToken: snapshot.cfToken,
        });
        clearInterval(smtpTimer);
        handleSmtpResult(result, snapshot, setState);
      } catch {
        // Function timeout / network drop — don't leave the spinner hanging.
        // Offer a retry instead of an infinite "Verifying…" circle.
        clearInterval(smtpTimer);
        setState({
          kind: "smtp_awaiting_retry",
          runId: snapshot.runId,
          cfToken: snapshot.cfToken,
          zoneName: snapshot.zoneName,
          mailboxLocal: snapshot.mailboxLocal,
          destinationEmail: snapshot.destinationEmail,
          errorKey: "setup.errors.smtp_verify_timeout",
        });
      }
    });
  }

  // Survive a refresh anywhere in the flow: restore the saved step (or
  // resume an in-progress run) so the user isn't sent back to re-paste the
  // token. The token lives only in this browser tab — never on our servers —
  // and clears on restart, token error, or tab close.
  useEffect(() => {
    let saved: { token?: string; zones?: Zone[] } | null = null;
    try {
      const raw = sessionStorage.getItem(SETUP_SESSION_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {}

    if (activeRun) {
      const zone = saved?.zones?.find((z) => z.name === activeRun.domain);
      if (saved?.token && zone) {
        // Resume an in-progress run without forcing a token re-paste.
        const tok = saved.token;
        startTransition(async () => {
          const result = await verifyCloudflareToken({ token: tok });
          if (result.status === "ok") {
            await handleStartSetup(
              tok,
              zone.id,
              zone.name,
              activeRun.mailboxLocal,
            );
          } else {
            setState({ kind: "token_entry", errorKey: result.errorKey });
          }
          setHydrated(true);
        });
      } else if (initialToken) {
        // Server-provided token (paid run, fresh session with no
        // sessionStorage) — resume the remaining steps without dropping
        // the user back to step 1.
        const tok = initialToken;
        startTransition(async () => {
          const result = await verifyCloudflareToken({ token: tok });
          if (result.status === "ok") {
            const z = result.zones.find((zz) => zz.name === activeRun.domain);
            if (z) {
              try {
                sessionStorage.setItem(
                  SETUP_SESSION_KEY,
                  JSON.stringify({ token: tok, zones: result.zones }),
                );
              } catch {}
              await handleStartSetup(tok, z.id, z.name, activeRun.mailboxLocal);
            } else {
              setState({ kind: "token_entry" });
            }
          } else {
            setState({ kind: "token_entry", errorKey: result.errorKey });
          }
          setHydrated(true);
        });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHydrated(true);
      }
      return;
    }

    if (saved?.token && Array.isArray(saved.zones) && saved.zones.length) {
      setState({
        kind: "zone_selection",
        zones: saved.zones,
        token: saved.token,
      });
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Browser Back/Forward = move between wizard steps ───────────────────
  // The wizard lives on one URL as client state, so without this Back would
  // exit to /app instead of going to the previous step. Push a history entry
  // per step; on Back, restore: 'token' → token entry; any later step → the
  // domain step (rebuilt from this tab's saved token+zones), from which Start
  // resumes the SAME run (deduped). Back from 'token' leaves to /app (it's
  // the first step). Never dumps the user out mid-wizard.
  const poppingRef = useRef(false);
  const prevStepRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const step = stepForKind(state.kind);
    if (poppingRef.current) {
      poppingRef.current = false;
      prevStepRef.current = step;
      return;
    }
    try {
      if (prevStepRef.current === null) {
        window.history.replaceState({ wizStep: step }, "", `?step=${step}`);
      } else if (prevStepRef.current !== step) {
        window.history.pushState({ wizStep: step }, "", `?step=${step}`);
      }
    } catch {
      // history API unavailable — degrade silently, wizard still works
    }
    prevStepRef.current = step;
  }, [state.kind, hydrated]);

  useEffect(() => {
    const onPop = () => {
      const target =
        new URLSearchParams(window.location.search).get("step") ?? "token";
      poppingRef.current = true;
      if (target === "token") {
        setState({ kind: "token_entry" });
        return;
      }
      // A run that's already underway: Back used to collapse the user to the
      // domain step (step 2), which is jarring from a later step. Re-resume
      // from the server so Back lands the user back on their real step instead.
      if (activeRun) {
        window.location.reload();
        return;
      }
      let saved: { token?: string; zones?: Zone[] } | null = null;
      try {
        const raw = sessionStorage.getItem(SETUP_SESSION_KEY);
        saved = raw ? JSON.parse(raw) : null;
      } catch {}
      if (saved?.token && Array.isArray(saved.zones) && saved.zones.length) {
        setState({
          kind: "zone_selection",
          zones: saved.zones,
          token: saved.token,
        });
      } else {
        setState({ kind: "token_entry" });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [activeRun]);

  // ── Payment lands → leave the pay step on its own ─────────────────────
  // While parked on the post-CF pay step without a confirmed purchase,
  // poll the server (and re-check whenever the tab regains focus — e.g.
  // the user comes back from the checkout). The moment a paid order shows
  // up, flip the gate; the effect below then advances to SMTP.
  useEffect(() => {
    if (state.kind !== "cf_done_pending_smtp" || purchaseConfirmed) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await checkPurchaseStatus();
        if (!cancelled && res.paid) setPurchaseConfirmed(true);
      } catch {
        // transient — next tick retries
      }
    };
    void check();
    const id = setInterval(check, 4000);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", check);
    };
  }, [state.kind, purchaseConfirmed]);

  // Purchase confirmed while on the post-CF step → go straight to SMTP.
  // Fires once per run (advancedRunIdRef). Covers both the just-paid return
  // and a returning paid user — either way the next real action is SMTP.
  useEffect(() => {
    if (state.kind === "cf_done_pending_smtp" && purchaseConfirmed) {
      runContinueToSmtp(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, purchaseConfirmed]);

  async function handleStartSetup(
    token: string,
    zoneId: string,
    zoneName: string,
    mailboxLocal: string,
  ) {
    setState({
      kind: "setup_running",
      token,
      zoneName,
      mailboxLocal,
      reached: "routing",
    });
    // Advance the substep circles in their real order while the server works
    // (the pipeline runs them in this sequence but returns in one response).
    const cfSubsteps = ["routing", "dns", "destination", "rule"] as const;
    let cfIdx = 0;
    const cfTimer = setInterval(() => {
      cfIdx += 1;
      if (cfIdx >= cfSubsteps.length) {
        clearInterval(cfTimer);
        return;
      }
      setState((prev) =>
        prev.kind === "setup_running"
          ? { ...prev, reached: cfSubsteps[cfIdx] }
          : prev,
      );
    }, 1100);
    const result = await startSetupRun({ token, zoneId, mailboxLocal });
    clearInterval(cfTimer);
    if (result.status === "error") {
      setState({
        kind: "failed",
        source: "cf",
        errorKey: result.errorKey,
        errorDetails:
          typeof result.details === "string" ? result.details : undefined,
      });
      return;
    }
    if (result.runStatus === "cf_awaiting_destination_verify") {
      setState({
        kind: "awaiting_verify",
        token,
        runId: result.runId,
        destinationEmail: result.destinationEmail,
        zoneName,
        mailboxLocal,
      });
      return;
    }
    if (result.runStatus === "gmail_instructions_shown") {
      // The run is already in the Gmail step — resume straight there. The
      // loader re-fetches the SMTP creds (prepareGmailStep) and lands the user
      // on step 5 instead of dropping them back to smtp_done (step 4).
      setState({
        kind: "gmail_instructions_shown",
        runId: result.runId,
        zoneName,
        mailboxLocal,
        destinationEmail: result.destinationEmail,
      });
      return;
    }
    if (
      result.runStatus === "smtp_done" ||
      result.runStatus === "gmail_smtp_ready" ||
      result.runStatus === "gmail_send_as_verified" ||
      result.runStatus === "done"
    ) {
      setState({
        kind: "smtp_done",
        runId: result.runId,
        zoneName,
        mailboxLocal,
        destinationEmail: result.destinationEmail,
      });
      return;
    }
    if (
      result.runStatus === "smtp_sender_created" ||
      result.runStatus === "smtp_dns_written" ||
      result.runStatus === "smtp_verified"
    ) {
      setState({
        kind: "smtp_awaiting_retry",
        runId: result.runId,
        cfToken: token,
        zoneName,
        mailboxLocal,
        destinationEmail: result.destinationEmail,
        errorKey: "setup.errors.smtp_verify_timeout",
      });
      return;
    }
    setState({
      kind: "cf_done_pending_smtp",
      runId: result.runId,
      cfToken: token,
      zoneName,
      mailboxLocal,
      destinationEmail: result.destinationEmail,
    });
  }

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

  const phaseSubtitle = (() => {
    switch (state.kind) {
      case "token_entry":
      case "token_validating":
        return t("subtitle");
      case "zone_selection":
        return "Pick the name for your new mailbox — your domain's already set.";
      case "ns_warning":
        return "This domain's DNS is not on Cloudflare yet — migration required before setup.";
      case "setup_running":
      case "awaiting_verify":
        return "Configuring Cloudflare Email Routing to receive mail.";
      case "cf_done_pending_smtp":
        return "Receiving is ready — sending comes next.";
      case "smtp_running":
        return "Configuring DNS records for sending. This is automatic — takes ~30 seconds.";
      case "smtp_dkim_polling":
        return state.mockIsLong
          ? "This is taking longer than usual — still working in the background."
          : "Postmark is checking DKIM on your DNS — usually 5–30 minutes.";
      case "smtp_awaiting_retry":
        return "Configuring DNS records for sending. This is automatic — takes ~30 seconds.";
      case "smtp_done":
        return "One last step — add your new address to Gmail.";
      case "gmail_instructions_shown":
      case "gmail_smtp_ready":
        return "Almost done — add your new address to start sending from it.";
      case "gmail_done":
        return "All set — you can now send from your domain.";
      case "failed":
        return "Something went wrong partway through. Restart below to try again.";
      default:
        return t("subtitle");
    }
  })();

  const phaseTitle = (() => {
    if (state.kind === "cf_done_pending_smtp") return "Almost there";
    if (state.kind === "smtp_done") return "Sending is ready";
    if (state.kind === "failed") return t("step3.failed.title");
    switch (getStepperStep(state.kind)) {
      case 2:
        return "Choose your email address";
      case 3:
        return "Setting up your domain";
      case 4:
        return "Verifying your domain";
      case 5:
        return "Finish in Gmail";
      default:
        return t("title");
    }
  })();

  // Don't flash step 1 on a refresh while we restore a passed step from the
  // browser session — show a neutral loader until we've decided.
  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-[400px] max-w-4xl items-center justify-center">
        <Loader2
          className="size-6 animate-spin text-mk-text-tertiary"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {state.kind !== "failed" &&
        state.kind !== "setup_running" &&
        state.kind !== "smtp_running" && (
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-mk-text-primary">
              {phaseTitle}
            </h1>
            <p className="mt-2 text-sm text-mk-text-secondary">
              {phaseSubtitle}
            </p>
          </header>
        )}

      {state.kind !== "failed" && state.kind !== "gmail_done" && (
        <div className="rounded-xl border border-mk-border-subtle bg-surface-elevated px-6 py-5">
          <WizardStepper
            currentStep={getStepperStep(state.kind)}
            steps={WIZARD_STEPS}
          />
        </div>
      )}

      {state.kind === "token_entry" || state.kind === "token_validating" ? (
        <Step1Token
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
                if (activeRun) {
                  const matchingZone = result.zones.find(
                    (z) => z.name === activeRun.domain,
                  );
                  if (matchingZone) {
                    await handleStartSetup(
                      token,
                      matchingZone.id,
                      matchingZone.name,
                      activeRun.mailboxLocal,
                    );
                    return;
                  }
                }
                try {
                  sessionStorage.setItem(
                    SETUP_SESSION_KEY,
                    JSON.stringify({ token, zones: result.zones }),
                  );
                } catch {}
                setState({
                  kind: "zone_selection",
                  zones: result.zones,
                  token,
                });
              } else {
                try {
                  sessionStorage.removeItem(SETUP_SESSION_KEY);
                } catch {}
                const errKey = result.errorKey;
                setState({
                  kind: "token_entry",
                  errorKey: errKey,
                  errorDetails:
                    typeof result.details === "string"
                      ? result.details
                      : undefined,
                });
                setTimeout(() => {
                  setState((prev) =>
                    prev.kind === "token_entry" && prev.errorKey === errKey
                      ? { kind: "token_entry" }
                      : prev,
                  );
                }, 5000);
              }
            });
          }}
          resumeFor={
            activeRun
              ? {
                  domain: activeRun.domain,
                  mailboxLocal: activeRun.mailboxLocal,
                }
              : undefined
          }
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
              await handleStartSetup(
                state.token,
                zoneId,
                chosen.name,
                mailboxLocal,
              );
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
              className="inline-flex items-center gap-1 font-medium text-mk-accent underline-offset-2 hover:underline"
            >
              {t("nsWarning.guideLink")}
              <ArrowUpRight className="size-3.5" aria-hidden />
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
        <Step3Progress
          phase="cf"
          reached={state.reached}
          zoneName={state.zoneName}
          mailboxLocal={state.mailboxLocal}
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
                  kind: "cf_done_pending_smtp",
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

      {state.kind === "cf_done_pending_smtp" ? (
        <CfDonePendingSmtpStep
          state={state}
          isPending={isPending}
          hasPurchase={purchaseConfirmed}
          t={t}
          tState={tState}
          tSteps={tSteps}
          translateErr={translateErr}
          onContinue={() => runContinueToSmtp(state)}
        />
      ) : null}

      {state.kind === "smtp_running" ? (
        <Step3Progress
          phase="smtp"
          reached={state.reached}
          zoneName={state.zoneName}
          mailboxLocal={state.mailboxLocal}
        />
      ) : null}

      {state.kind === "smtp_awaiting_retry" ? (
        <SmtpAwaitingRetryStep
          state={state}
          isPending={isPending}
          t={t}
          tState={tState}
          tSteps={tSteps}
          tSmtp={tSmtp}
          translateErr={translateErr}
          onRetry={() => {
            const snapshot = state;
            startTransition(async () => {
              const result = await continueSmtpSetup({
                runId: snapshot.runId,
                cfToken: snapshot.cfToken,
              });
              handleSmtpResult(result, snapshot, setState);
            });
          }}
        />
      ) : null}

      {state.kind === "smtp_dkim_polling" ? (
        <DkimPollingStep
          state={state}
          onReady={() =>
            setState({
              kind: "smtp_done",
              runId: state.runId,
              zoneName: state.zoneName,
              mailboxLocal: state.mailboxLocal,
              destinationEmail: state.destinationEmail,
            })
          }
        />
      ) : null}

      {state.kind === "smtp_done" ? (
        <SmtpDoneStep
          state={state}
          isPending={isPending}
          t={t}
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
                // The run is behind the UI (stale tab / earlier restart left
                // this tab ahead of the real progress). Reload to re-sync to
                // the actual step instead of dead-ending on an error.
                if (result.errorKey === "setup.errors.run_wrong_state") {
                  window.location.reload();
                  return;
                }
                setState({
                  kind: "smtp_done",
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
        <GmailLoadingStep
          state={state}
          t={t}
          onReady={(result) => {
            if (result.status === "error") {
              if (result.errorKey === "setup.errors.run_wrong_state") {
                window.location.reload();
                return;
              }
              setState({
                kind: "smtp_done",
                runId: state.runId,
                zoneName: state.zoneName,
                mailboxLocal: state.mailboxLocal,
                destinationEmail: state.destinationEmail,
                errorKey: result.errorKey,
              });
              return;
            }
            setState({
              kind: "gmail_smtp_ready",
              runId: state.runId,
              zoneName: state.zoneName,
              mailboxLocal: state.mailboxLocal,
              destinationEmail: state.destinationEmail,
              targetEmail: result.targetEmail,
              displayName: result.displayName,
              smtp: result.smtp,
            });
          }}
        />
      ) : null}

      {state.kind === "gmail_smtp_ready" ? (
        <GmailWizard
          state={state}
          isPending={isPending}
          userEmail={userEmail}
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
          onRestart={() => {
            try {
              sessionStorage.removeItem(SETUP_SESSION_KEY);
            } catch {}
            setState({ kind: "token_entry" });
          }}
          t={t}
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
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
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

// Smooth, MailKit-styled domain picker (replaces the native <select> that
// flashed and drifted on mobile). Used only when a token can see 2+ domains.
function DomainSelect({
  zones,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  zones: Zone[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = zones.find((z) => z.id === value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const onDown = (e: MouseEvent | TouchEvent) => {
      const tgt = e.target as Node;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(tgt) &&
        (!dropRef.current || !dropRef.current.contains(tgt))
      ) {
        setOpen(false);
      }
    };
    const onScroll = (e: Event) => {
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setOpen((o) => !o);
  };

  const menu =
    open && pos && mounted
      ? createPortal(
          <div
            ref={dropRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="max-h-60 origin-top animate-in overflow-y-auto rounded-lg border border-mk-border-subtle bg-surface-elevated p-1 shadow-xl ring-1 ring-black/5 duration-100 fade-in-0 zoom-in-95"
          >
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  onChange(z.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-mono text-sm transition-colors",
                  z.id === value
                    ? "bg-mk-accent/10 text-mk-accent"
                    : "text-mk-text-primary hover:bg-mk-border-subtle/40",
                )}
              >
                {z.name}
                {z.id === value && <Check className="size-4" aria-hidden />}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-mk-border-subtle bg-surface-elevated-2 px-3 font-mono text-sm text-mk-text-primary transition-colors hover:border-mk-border-strong focus-visible:border-mk-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "" : "font-sans text-mk-text-tertiary"}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-mk-text-tertiary transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
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
  const domain = useMemo(
    () => zones.find((z) => z.id === zoneId)?.name ?? "your-domain",
    [zones, zoneId],
  );
  return (
    <section className="rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <h2 className="text-lg font-semibold text-mk-text-primary">
        {t("step2.title")}
      </h2>

      <div className="mt-6 grid items-center gap-8 md:grid-cols-2">
        {/* Left: form */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!zoneId || !mailboxLocal) return;
            onSubmit(zoneId, mailboxLocal);
          }}
        >
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-mk-text-primary">
              {t("step2.zoneLabel")}
            </span>
            {zones.length > 1 ? (
              <DomainSelect
                zones={zones}
                value={zoneId}
                onChange={setZoneId}
                disabled={isPending}
                placeholder={t("step2.zonePlaceholder")}
              />
            ) : (
              <div className="flex h-9 w-full items-center rounded-lg border border-mk-border-subtle bg-surface-elevated-2 px-3 font-mono text-sm text-mk-text-primary">
                {zones[0]?.name}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-mk-text-primary">
              {t("step2.mailboxLabel")}
            </span>
            <Input
              className="h-9 font-mono focus-visible:ring-1"
              value={mailboxLocal}
              onChange={(e) =>
                setMailboxLocal(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9._-]/g, "")
                    .replace(/^[._-]+/, "")
                    .replace(/\.{2,}/g, "."),
                )
              }
              disabled={isPending}
              placeholder="hello"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              pattern="[a-z0-9._-]{1,64}"
              maxLength={64}
              required
            />
            <p className="text-xs text-mk-text-tertiary">
              {t("step2.mailboxRules")}
            </p>
          </div>

          <Button
            type="submit"
            disabled={isPending || !mailboxLocal}
            className="bg-mk-accent text-white hover:bg-mk-accent-hover"
          >
            {isPending ? t("step2.ctaLoading") : t("step2.cta")}
          </Button>
        </form>

        {/* Right: live address — the hero of this step */}
        <div className="flex flex-col items-center justify-center gap-4 md:-translate-y-14">
          <TbMailFilled className="size-20 text-mk-accent/60" aria-hidden />
          <p className="break-all text-center font-mono text-2xl font-semibold leading-tight">
            <span className="text-mk-text-primary">{mailboxLocal}</span>
            <span className="text-mk-text-tertiary">@{domain}</span>
          </p>
        </div>
      </div>
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
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
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
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
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
      <div
        className="rounded-md border border-mk-warning/40 bg-mk-warning/10 p-5 text-sm"
        style={{ borderLeftWidth: "4px", borderLeftColor: "var(--mk-warning)" }}
      >
        <div className="flex items-center gap-2 text-base font-semibold text-mk-text-primary">
          <AlertCircle
            className="size-5 shrink-0 text-mk-warning"
            aria-hidden
          />
          {t("step3.awaitingVerify.title")}
        </div>
        <p className="mt-2 text-mk-text-secondary">
          {t("step3.awaitingVerify.body", { email: state.destinationEmail })}
        </p>
        <Button
          className="mt-4"
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

type SmtpReached = "sender" | "dns" | "verify" | "done";
const SMTP_PROGRESS_ORDER: SmtpReached[] = ["sender", "dns", "verify", "done"];

function smtpStatusOf(
  step: SmtpReached,
  overall: "running" | "awaiting" | "done",
  reached: SmtpReached,
): "pending" | "running" | "ok" | "error" {
  if (overall === "done") return "ok";
  const idxStep = SMTP_PROGRESS_ORDER.indexOf(step);
  const idxReached = SMTP_PROGRESS_ORDER.indexOf(reached);
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

function SmtpProgressList({
  overall,
  reached,
  tState,
  tSmtp,
}: {
  overall: "running" | "awaiting" | "done";
  reached: SmtpReached;
  tState: (key: string) => string;
  tSmtp: (key: string) => string;
}) {
  return (
    <ol className="space-y-2">
      {SMTP_PROGRESS_ORDER.map((step) => {
        const s = smtpStatusOf(step, overall, reached);
        return (
          <ProgressRow
            key={`smtp-${step}`}
            label={tSmtp(step)}
            status={s}
            stateLabel={tState(s)}
          />
        );
      })}
    </ol>
  );
}

function CfDonePendingSmtpStep({
  state,
  isPending,
  hasPurchase,
  t,
  tState,
  tSteps,
  translateErr,
  onContinue,
}: {
  state: Extract<WizardState, { kind: "cf_done_pending_smtp" }>;
  isPending: boolean;
  hasPurchase: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <h2 className="pb-2 font-mono text-[1.3125rem] font-semibold text-mk-text-primary">
        {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
      <div className="rounded-lg border border-mk-success/30 bg-mk-success/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium text-mk-success">
          <Inbox className="size-5" aria-hidden />
          {t("step3.done.title")}
        </div>

        {hasPurchase ? (
          <Button
            className="mt-3 bg-mk-accent text-white hover:bg-mk-accent-hover mk-cta-shadow"
            onClick={onContinue}
            disabled={isPending}
          >
            {isPending ? t("smtp.continueCtaLoading") : t("smtp.continueCta")}
          </Button>
        ) : (
          <div className="mt-3">
            {/* Same-tab checkout: the pay route 303-redirects to Lemon
                Squeezy and LS redirects back to /app/setup?paid=1, so this
                one tab returns freshly rendered with the purchase recorded —
                no orphaned stale tab. Real <a> (API route), not next/link. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/checkout/start"
              className="mk-cta-shadow inline-flex h-8 items-center justify-center rounded-lg bg-mk-accent px-2.5 text-sm font-medium text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40"
            >
              Complete setup — $5
            </a>
            <p className="mt-2 text-xs text-mk-text-tertiary">
              One-time payment — lets you{" "}
              <span className="underline underline-offset-2">
                send from this address
              </span>
              , not just receive.
            </p>
          </div>
        )}
      </div>
      {state.errorKey ? (
        <InlineError message={translateErr(state.errorKey)} />
      ) : null}
    </section>
  );
}

function SmtpRunningStep({
  state,
  t: _t,
  tState,
  tSteps,
  tSmtp,
}: {
  state: Extract<WizardState, { kind: "smtp_running" }>;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  tSmtp: (key: string) => string;
}) {
  void _t;
  return (
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
      <SmtpProgressList
        overall="running"
        reached={state.reached}
        tState={tState}
        tSmtp={tSmtp}
      />
    </section>
  );
}

function SmtpAwaitingRetryStep({
  state,
  isPending,
  t,
  tState,
  tSteps,
  tSmtp,
  translateErr,
  onRetry,
}: {
  state: Extract<WizardState, { kind: "smtp_awaiting_retry" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  tState: (key: string) => string;
  tSteps: (key: string) => string;
  tSmtp: (key: string) => string;
  translateErr: (key: string, details?: string) => string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <h2 className="text-lg font-semibold">
        {state.zoneName} · {state.mailboxLocal}@{state.zoneName}
      </h2>
      <CfDoneBlock zoneName={state.zoneName} tState={tState} tSteps={tSteps} />
      <SmtpProgressList
        overall="awaiting"
        reached="verify"
        tState={tState}
        tSmtp={tSmtp}
      />
      <div className="rounded-md border border-mk-warning/40 bg-mk-warning/10 p-4 text-sm">
        <div className="font-medium text-mk-text-primary">
          {t("smtp.recheck.title")}
        </div>
        <p className="mt-1 text-mk-text-secondary">{t("smtp.recheck.body")}</p>
        <Button
          className="mt-3"
          onClick={onRetry}
          disabled={isPending}
          variant="outline"
        >
          {isPending ? t("smtp.recheck.ctaLoading") : t("smtp.recheck.cta")}
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

function SmtpDoneStep({
  state,
  isPending,
  t,
  translateErr,
  onContinue,
}: {
  state: Extract<WizardState, { kind: "smtp_done" }>;
  isPending: boolean;
  t: (key: string, values?: Record<string, string>) => string;
  translateErr: (key: string, details?: string) => string;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <h2 className="pb-2 font-mono text-[1.3125rem] font-semibold text-mk-text-primary">
        {state.mailboxLocal}@{state.zoneName}
      </h2>
      <div className="rounded-lg border border-mk-success/30 bg-mk-success/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium text-mk-success">
          <Send className="size-5" aria-hidden />
          {t("smtp.terminal.title")}
        </div>
        <Button
          className="mt-3 bg-mk-accent text-white hover:bg-mk-accent-hover mk-cta-shadow"
          onClick={onContinue}
          disabled={isPending}
        >
          {isPending
            ? t("gmail.intro.startCtaLoading")
            : t("smtp.terminal.gmailCta")}
        </Button>
      </div>
      {state.errorKey ? (
        <InlineError message={translateErr(state.errorKey)} />
      ) : null}
    </section>
  );
}

function handleSmtpResult(
  result: Awaited<ReturnType<typeof continueSmtpSetup>>,
  snapshot: Extract<
    WizardState,
    { kind: "cf_done_pending_smtp" | "smtp_awaiting_retry" }
  >,
  setState: (s: WizardState) => void,
) {
  if (result.status === "error") {
    if (result.errorKey === "setup.errors.smtp_verify_timeout") {
      setState({
        kind: "smtp_awaiting_retry",
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
      source: "smtp",
      errorKey: result.errorKey,
      errorDetails:
        typeof result.details === "string" ? result.details : undefined,
    });
    return;
  }
  if (result.runStatus === "smtp_done") {
    setState({
      kind: "smtp_done",
      runId: snapshot.runId,
      zoneName: snapshot.zoneName,
      mailboxLocal: snapshot.mailboxLocal,
      destinationEmail: snapshot.destinationEmail,
    });
    return;
  }
  // DNS records written but DKIM not yet verified — switch to async
  // polling page instead of showing an error or a spinner.
  if (
    result.runStatus === "smtp_dns_written" ||
    result.runStatus === "smtp_verified"
  ) {
    setState({
      kind: "smtp_dkim_polling",
      runId: snapshot.runId,
      cfToken: snapshot.cfToken,
      zoneName: snapshot.zoneName,
      mailboxLocal: snapshot.mailboxLocal,
      destinationEmail: snapshot.destinationEmail,
    });
    return;
  }
  // Still creating the server or writing DNS records.
  const reached: SmtpReached =
    result.runStatus === "smtp_sender_created" ? "sender" : "done";
  setState({
    kind: "smtp_running",
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
}: {
  state: Extract<WizardState, { kind: "failed" }>;
  onRestart: () => void;
  t: (key: string) => string;
}) {
  const bodyKey =
    state.source === "cf"
      ? "step3.failed.bodyCf"
      : state.source === "smtp"
        ? "step3.failed.bodySmtp"
        : state.source === "gmail"
          ? "step3.failed.bodyGmail"
          : "step3.failed.body";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center sm:py-16">
      <div className="flex size-14 items-center justify-center rounded-full bg-mk-danger/10 ring-1 ring-mk-danger/25">
        <AlertCircle className="size-7 text-mk-danger" aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-mk-text-primary">
        {t("step3.failed.title")}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-mk-text-secondary">
        {t(bodyKey)}
      </p>
      <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
        <Button
          onClick={onRestart}
          className="w-full bg-mk-accent text-white hover:bg-mk-accent-hover mk-cta-shadow sm:w-auto"
        >
          {t("step3.failed.restartCta")}
        </Button>
        <a
          href="mailto:support@getmailkit.com"
          className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-mk-border-strong px-2.5 text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary sm:w-auto"
        >
          {t("step3.failed.supportCta")}
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ticket #6 etap 2 — Gmail Send-As wizard
 * ------------------------------------------------------------------ */

function GmailLoadingStep({
  state,
  t,
  onReady,
}: {
  state: Extract<WizardState, { kind: "gmail_instructions_shown" }>;
  t: (key: string, values?: Record<string, string>) => string;
  onReady: (result: Awaited<ReturnType<typeof prepareGmailStep>>) => void;
}) {
  const targetEmail = `${state.mailboxLocal}@${state.zoneName}`;
  const runId = state.runId;

  useEffect(() => {
    let cancelled = false;
    prepareGmailStep({ runId }).then((result) => {
      if (!cancelled) onReady(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  return (
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
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
  userEmail,
  t,
  translateErr,
  onComplete,
}: {
  state: Extract<WizardState, { kind: "gmail_smtp_ready" }>;
  isPending: boolean;
  userEmail?: string;
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
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("gmail.intro.title")}</h2>
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
              userEmail={userEmail}
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
  userEmail,
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
  userEmail?: string;
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
      </button>

      {status === "active" ? (
        <div className="mt-4 space-y-3 border-t border-mk-border-subtle pt-4">
          <GmailStepBody
            id={id}
            t={t}
            state={state}
            userEmail={userEmail}
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
  userEmail,
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
  userEmail?: string;
  isPending: boolean;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  checkboxError: boolean;
  onNext: () => void;
  onSubmit: () => void;
}) {
  if (id === "openSettings") {
    // Deep-link straight into the signed-in account's Settings → Accounts
    // tab. ?authuser=<email> pins the right inbox even when several Google
    // accounts are open in the browser; fall back to u/0 if we have no email.
    const settingsHref = userEmail
      ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(
          userEmail,
        )}#settings/accounts`
      : "https://mail.google.com/mail/u/0/#settings/accounts";
    return (
      <>
        <p className="text-sm">{t("gmail.steps.openSettings.body")}</p>
        <GmailScreenshotGallery />
        <div className="flex flex-wrap gap-2">
          <a
            href={settingsHref}
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
        <p className="text-sm">{t("gmail.steps.senderInfo.body")}</p>
        <GmailScreenshotGallery
          screens={[
            {
              src: "/screenshots/gmail/senderinfo-1.webp",
              label: "Add another email address",
            },
          ]}
        />
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
        <p className="text-sm">{t("gmail.steps.smtpSettings.body")}</p>
        <GmailScreenshotGallery
          screens={[
            {
              src: "/screenshots/gmail/smtpsettings-1.webp",
              label: "Send mail through your SMTP server",
            },
          ]}
        />
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
        <div className="rounded-md border border-mk-warning/30 bg-mk-warning/10 p-3 text-xs text-mk-text-secondary">
          {t("gmail.steps.smtpSettings.passwordWarning")}
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
      className={cn("min-h-11 sm:min-h-10", error && "border-mk-danger")}
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
    <section className="space-y-4 rounded-xl border border-mk-border-subtle bg-surface-elevated p-6">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-6 text-mk-success" aria-hidden />
        <h2 className="text-lg font-semibold text-mk-text-primary">
          {t("gmail.steps.done.title")}
        </h2>
      </div>
      <p className="text-sm text-mk-text-secondary">
        {t("gmail.steps.done.body", { target: state.targetEmail })}
      </p>
      <p className="rounded-md border border-mk-success/30 bg-mk-success/10 px-3 py-2 text-xs leading-5 text-mk-text-secondary">
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
      <CheckCircle2 className="size-4 text-mk-success" aria-hidden />
    ) : status === "error" ? (
      <AlertCircle className="size-4 text-mk-danger" aria-hidden />
    ) : status === "running" ? (
      <Loader2 className="size-4 animate-spin text-mk-accent" aria-hidden />
    ) : (
      <span
        className="inline-block size-4 rounded-full border border-mk-border-strong"
        aria-hidden
      />
    );
  return (
    <li className="flex items-center justify-between rounded-lg border border-mk-border-subtle px-3 py-2 text-sm text-mk-text-secondary">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {status !== "ok" ? (
        <span className="text-xs text-mk-text-tertiary">{stateLabel}</span>
      ) : null}
    </li>
  );
}

const DKIM_LONG_THRESHOLD_MS = 15 * 60 * 1000;

function DkimPollingStep({
  state,
  onReady,
}: {
  state: Extract<WizardState, { kind: "smtp_dkim_polling" }>;
  onReady: () => void;
}) {
  const [isLong, setIsLong] = useState(state.mockIsLong ?? false);
  // eslint-disable-next-line react-hooks/purity -- one-time timestamp, not used in render
  const startedAt = useMemo(() => Date.now(), []);

  // Poll every 30 seconds.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function check() {
      const res = await pollDkimStatus({ runId: state.runId });
      if (cancelled) return;
      if (res.status === "ready") {
        onReady();
        return;
      }
      // Flip "taking longer" UI after threshold.
      if (Date.now() - startedAt >= DKIM_LONG_THRESHOLD_MS) setIsLong(true);
      timer = setTimeout(check, 30_000);
    }

    timer = setTimeout(check, 30_000);
    // Also set a one-shot timer for the "long" threshold.
    const longTimer = state.mockIsLong
      ? undefined
      : setTimeout(() => setIsLong(true), DKIM_LONG_THRESHOLD_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (longTimer !== undefined) clearTimeout(longTimer);
    };
  }, [state.runId, state.mockIsLong, onReady, startedAt]);

  return (
    <Step4Dkim destinationEmail={state.destinationEmail} isLongPoll={isLong} />
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-mk-danger/30 bg-mk-danger/10 px-3 py-2 text-sm text-mk-text-primary"
    >
      <span className="flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0 text-mk-danger" aria-hidden />
        {message}
      </span>
    </div>
  );
}
