import "server-only";

import crypto from "node:crypto";

/**
 * Lemon Squeezy API client for Ticket #7 — order retrieval + refund
 * issuance + webhook signature verification.
 *
 * Native fetch, no SDK, mirror of lib/integrations/postmark.ts:
 *   - 429/5xx → exp backoff 1s/2s/4s (honors Retry-After on 429),
 *     3 retries total; other 4xx bubble.
 *   - Errors wrapped in LemonSqueezyError with code + httpStatus.
 *
 * The `server-only` import keeps this off any client bundle — the
 * API key would otherwise leak.
 *
 * Refund endpoint correction: architect's original spec referenced
 * POST /v1/refunds (does not exist). Actual endpoint is
 * POST /v1/orders/{order_id}/refund, which returns the updated order
 * with `refunded_amount` and `refunded_at` populated. No separate
 * "refund" resource in LS — the refund is a status transition on
 * the order.
 */
const LS_API_BASE =
  process.env.LEMONSQUEEZY_API_URL ?? "https://api.lemonsqueezy.com/v1";

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export class LemonSqueezyError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(opts: {
    message: string;
    code: string;
    httpStatus: number;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "LemonSqueezyError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.details = opts.details;
  }
}

/**
 * Normalized Order shape the rest of the app consumes. LS responses
 * are JSON:API-shaped and mix money fields in cents + formatted
 * strings + currency rates; we keep only the fields we actually need
 * for webhook processing and refund logging.
 */
export type LsOrder = {
  id: string;
  identifier: string;
  status: string;
  userEmail: string;
  totalCents: number;
  currency: string;
  refundedAmountCents: number;
  refunded: boolean;
  refundedAt: string | null;
  testMode: boolean;
};

type RawOrderResponse = {
  data?: {
    type: string;
    id: string;
    attributes: {
      identifier?: string;
      status?: string;
      user_email?: string;
      total?: number;
      currency?: string;
      refunded_amount?: number;
      refunded?: boolean;
      refunded_at?: string | null;
      test_mode?: boolean;
    };
  };
};

export type LsClient = ReturnType<typeof createLemonSqueezyClient>;

export function createLemonSqueezyClient(apiKey: string): {
  getOrder: (orderId: string) => Promise<LsOrder>;
  createRefund: (orderId: string, amountCents?: number) => Promise<LsOrder>;
} {
  if (!apiKey || typeof apiKey !== "string") {
    throw new LemonSqueezyError({
      message: "Missing Lemon Squeezy API key",
      code: "missing_api_key",
      httpStatus: 0,
    });
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${LS_API_BASE}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    let lastError: LemonSqueezyError | null = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const res = await fetch(url, init);
      const retriable = res.status === 429 || res.status >= 500;

      if (!retriable) {
        if (res.status === 204) return undefined as T;
        const json = (await safeJson(res)) as unknown;
        if (res.ok) return json as T;
        throw toLsError(res.status, json);
      }

      const json = (await safeJson(res)) as unknown;
      lastError = toLsError(res.status, json);

      if (attempt === RETRY_DELAYS_MS.length) break;

      const retryAfter = res.headers.get("retry-after");
      const delayMs =
        res.status === 429 && retryAfter
          ? parseRetryAfterMs(retryAfter)
          : RETRY_DELAYS_MS[attempt];

      console.warn(
        `[lemon-squeezy] ${method} ${path} → ${res.status}, retry in ${delayMs}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`,
      );
      await sleep(delayMs);
    }

    throw (
      lastError ??
      new LemonSqueezyError({
        message: "Lemon Squeezy request failed after retries",
        code: "retry_exhausted",
        httpStatus: 0,
      })
    );
  }

  function normalize(raw: RawOrderResponse): LsOrder {
    const data = raw.data;
    if (!data || data.type !== "orders") {
      throw new LemonSqueezyError({
        message: "Unexpected Lemon Squeezy order response shape",
        code: "invalid_response",
        httpStatus: 0,
        details: raw,
      });
    }
    const a = data.attributes ?? {};
    return {
      id: String(data.id),
      identifier: a.identifier ?? "",
      status: a.status ?? "",
      userEmail: a.user_email ?? "",
      totalCents: typeof a.total === "number" ? a.total : 0,
      currency: a.currency ?? "USD",
      refundedAmountCents:
        typeof a.refunded_amount === "number" ? a.refunded_amount : 0,
      refunded: !!a.refunded,
      refundedAt: a.refunded_at ?? null,
      testMode: !!a.test_mode,
    };
  }

  async function getOrder(orderId: string): Promise<LsOrder> {
    const raw = await request<RawOrderResponse>(
      "GET",
      `/orders/${encodeURIComponent(orderId)}`,
    );
    return normalize(raw);
  }

  async function createRefund(
    orderId: string,
    amountCents?: number,
  ): Promise<LsOrder> {
    // LS refund body: data.attributes.amount is cents; omitting →
    // full refund. data.type must be "orders", id must match path.
    const attrs: Record<string, unknown> = {};
    if (typeof amountCents === "number") attrs.amount = amountCents;
    const body = {
      data: {
        type: "orders",
        id: String(orderId),
        attributes: attrs,
      },
    };
    const raw = await request<RawOrderResponse>(
      "POST",
      `/orders/${encodeURIComponent(orderId)}/refund`,
      body,
    );
    return normalize(raw);
  }

  return { getOrder, createRefund };
}

/**
 * Webhook signature verifier — pure function, no client dependency.
 * Used both by the /api/webhooks/lemon-squeezy route handler and by
 * unit tests. Constant-time compare via timingSafeEqual on equal-
 * length Buffers (we fail early on length mismatch — constant-time
 * compare would throw on differing lengths anyway).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHex: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHex || !secret || !rawBody) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHex, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/**
 * SHA-256 hex digest of the raw webhook body — used as the dedupe
 * key in webhook_events (unique index on source + body_hash).
 */
export function hashWebhookBody(rawBody: string): string {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function toLsError(status: number, json: unknown): LemonSqueezyError {
  // LS error shape: { errors: [{ status, title, detail, code }, ...] }
  type LsErrorItem = { title?: string; detail?: string; code?: string };
  let first: LsErrorItem | undefined;
  if (typeof json === "object" && json !== null && "errors" in json) {
    const errs = (json as { errors: unknown }).errors;
    if (Array.isArray(errs) && errs.length > 0) {
      first = errs[0] as LsErrorItem;
    }
  }
  const title = first?.title ?? `HTTP ${status}`;
  const detail = first?.detail ?? "";
  const code = first?.code ?? `http_${status}`;
  return new LemonSqueezyError({
    message: detail ? `${title}: ${detail}` : title,
    code,
    httpStatus: status,
    details: json,
  });
}

function parseRetryAfterMs(headerValue: string): number {
  const asNumber = Number(headerValue);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.max(1000, asNumber * 1000);
  }
  const asDate = Date.parse(headerValue);
  if (!Number.isNaN(asDate)) {
    return Math.max(1000, asDate - Date.now());
  }
  return 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
