import "server-only";

import type { DashboardData } from "@/lib/dashboard-data";

/**
 * Synthetic dashboard fixtures for preview-mode (`?mock=…`). Exercised
 * by Playwright snapshots and by the local `pnpm dev` flow when the
 * developer doesn't have a real Supabase session.
 *
 * Production proxy hard-disables the mock header so this module never
 * runs on prod regardless of what a client tries.
 */

export type DashboardMock = {
  profile: { email: string; fullName: string | null };
  data: DashboardData;
};

const PROFILE_DEFAULT = {
  email: "preview@mailkit.local",
  fullName: "Preview User",
};

const TODAY = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const LAST_WEEK = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const EMPTY: DashboardData = {
  setups: [],
  purchases: [],
  refunds: [],
  sendUsage: [],
};

const ACTIVE: DashboardData = {
  setups: [
    {
      id: "mock-setup-active",
      domain: "founders.example",
      mailboxLocal: "hello",
      status: "brevo_dns_written",
      errorMsg: null,
      createdAt: YESTERDAY,
      updatedAt: TODAY,
    },
  ],
  purchases: [
    {
      id: "mock-purchase-1",
      amountCents: 500,
      currency: "USD",
      status: "paid",
      lsOrderId: "8171995",
      lsOrderIdentifier: "ord-uuid-1",
      domain: "founders.example",
      testMode: true,
      createdAt: YESTERDAY,
      refundedAt: null,
      suspendedAt: null,
      suspensionReason: null,
    },
  ],
  refunds: [],
  sendUsage: [],
};

const DONE: DashboardData = {
  setups: [
    {
      id: "mock-setup-done",
      domain: "founders.example",
      mailboxLocal: "hello",
      status: "done",
      errorMsg: null,
      createdAt: LAST_WEEK,
      updatedAt: YESTERDAY,
    },
  ],
  purchases: ACTIVE.purchases,
  refunds: [],
  sendUsage: [],
};

const FAILED_REFUNDED: DashboardData = {
  setups: [
    {
      id: "mock-setup-failed",
      domain: "founders.example",
      mailboxLocal: "hello",
      status: "failed",
      errorMsg:
        "Postmark verification timed out — DKIM record didn't propagate.",
      createdAt: LAST_WEEK,
      updatedAt: YESTERDAY,
    },
  ],
  purchases: [
    {
      id: "mock-purchase-refunded",
      amountCents: 500,
      currency: "USD",
      status: "refunded",
      lsOrderId: "8171995",
      lsOrderIdentifier: "ord-uuid-2",
      domain: "founders.example",
      testMode: true,
      createdAt: LAST_WEEK,
      refundedAt: YESTERDAY,
      suspendedAt: null,
      suspensionReason: null,
    },
  ],
  refunds: [
    {
      id: "mock-refund-1",
      purchaseId: "mock-purchase-refunded",
      amountCents: 500,
      currency: "USD",
      reason: "automation_failure",
      triggeredBy: "system",
      notes: "Auto-refund triggered by failed_step=brevo_verify.",
      createdAt: YESTERDAY,
    },
  ],
  sendUsage: [],
};

const FIXTURES: Record<string, DashboardData> = {
  default: EMPTY,
  empty: EMPTY,
  active: ACTIVE,
  done: DONE,
  failed: FAILED_REFUNDED,
};

export function mockDashboardForFixture(key: string): DashboardMock {
  const data = FIXTURES[key] ?? EMPTY;
  return { profile: PROFILE_DEFAULT, data };
}
