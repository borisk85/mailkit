import "server-only";

/**
 * Brevo statistics client — read-only wrapper over the SMTP stats
 * endpoints used by the anti-abuse cron loop (#21 + #22). Lives next
 * to brevo.ts (sender-domain management) and brevo-transactional.ts
 * (outbound mail) but stays separate because the concerns are
 * orthogonal: this file *reads* aggregate counters; nothing here
 * mutates a customer's setup.
 *
 * Endpoints used:
 *   - GET /v3/smtp/statistics/events
 *     https://developers.brevo.com/reference/getemaileventreport
 *   - GET /v3/smtp/statistics/aggregatedReport
 *     https://developers.brevo.com/reference/getaggregatedsmtpreport
 *
 * Retry posture mirrors brevo.ts: 429 + 5xx with 1s/2s/4s backoff,
 * Retry-After honored, 4xx bubbles up. We accept a `fetcher` injection
 * so unit tests can stub the timing without spying on globals.
 */

const BREVO_API_BASE = process.env.BREVO_API_URL ?? "https://api.brevo.com/v3";

const RETRY_DELAYS_MS = [1000, 2000, 4000];

export class BrevoStatsError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(opts: { message: string; code: string; httpStatus: number }) {
    super(opts.message);
    this.name = "BrevoStatsError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}

export type BrevoEvent = {
  email: string;
  date: string;
  event: string;
  reason?: string;
  tag?: string;
  ip?: string;
  messageId?: string;
};

export type BrevoEventsResponse = {
  events?: BrevoEvent[];
};

export type BrevoAggregatedReport = {
  range: string;
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  clicks: number;
  uniqueClicks: number;
  opens: number;
  uniqueOpens: number;
  spamReports: number;
  blocked: number;
  invalid: number;
  unsubscribed: number;
};

export type BrevoStatsClient = ReturnType<typeof createBrevoStatsClient>;

export function createBrevoStatsClient(apiKey: string) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new BrevoStatsError({
      message: "Missing Brevo API key",
      code: "missing_api_key",
      httpStatus: 0,
    });
  }

  async function request<T>(path: string): Promise<T> {
    const url = `${BREVO_API_BASE}${path}`;
    const init: RequestInit = {
      method: "GET",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
      },
    };

    let lastError: BrevoStatsError | null = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const res = await fetch(url, init);
      const retriable = res.status === 429 || res.status >= 500;

      if (!retriable) {
        if (res.status === 204) return undefined as T;
        const json = (await safeJson(res)) as unknown;
        if (res.ok) return json as T;
        throw toBrevoStatsError(res.status, json);
      }

      const json = (await safeJson(res)) as unknown;
      lastError = toBrevoStatsError(res.status, json);

      if (attempt === RETRY_DELAYS_MS.length) break;

      const retryAfter = res.headers.get("retry-after");
      const delayMs =
        res.status === 429 && retryAfter
          ? parseRetryAfterMs(retryAfter)
          : RETRY_DELAYS_MS[attempt];

      console.warn(
        `[brevo-stats] GET ${path} → ${res.status}, retry in ${delayMs}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`,
      );
      await sleep(delayMs);
    }

    throw (
      lastError ??
      new BrevoStatsError({
        message: "Brevo stats request failed after retries",
        code: "retry_exhausted",
        httpStatus: 0,
      })
    );
  }

  /**
   * List individual SMTP events for a sender domain. The events
   * endpoint paginates at 5000 per call (Brevo's max limit). The
   * cron only needs aggregate counts so this list is a fallback for
   * forensic queries; the hourly snapshot uses getAggregatedReport.
   */
  async function getEvents(args: {
    senderDomain: string;
    startDate: string;
    endDate: string;
    event?:
      | "requests"
      | "delivered"
      | "hardBounces"
      | "softBounces"
      | "complaints"
      | "unsubscribed";
    limit?: number;
    offset?: number;
  }): Promise<BrevoEventsResponse> {
    const { senderDomain, startDate, endDate, event, limit, offset } = args;
    const qs = new URLSearchParams();
    qs.set("startDate", startDate);
    qs.set("endDate", endDate);
    qs.set("sender", senderDomain);
    if (event) qs.set("event", event);
    if (typeof limit === "number") qs.set("limit", String(limit));
    if (typeof offset === "number") qs.set("offset", String(offset));
    return request<BrevoEventsResponse>(
      `/smtp/statistics/events?${qs.toString()}`,
    );
  }

  /**
   * Aggregated report for a sender domain over a date range. This is
   * the primary input for both the hourly send-counter sync (uses
   * `requests` only) and the hourly deliverability sync (uses the
   * full report for bounce/complaint/unsub rates).
   *
   * Brevo's `aggregatedReport` returns one row when called without
   * `days` — that single object is the cumulative figure for the
   * range. We coerce missing fields to 0 because some accounts omit
   * keys with zero values.
   */
  async function getAggregatedReport(args: {
    senderDomain: string;
    startDate: string;
    endDate: string;
  }): Promise<BrevoAggregatedReport> {
    const { senderDomain, startDate, endDate } = args;
    const qs = new URLSearchParams();
    qs.set("startDate", startDate);
    qs.set("endDate", endDate);
    qs.set("sender", senderDomain);
    const raw = await request<Partial<BrevoAggregatedReport>>(
      `/smtp/statistics/aggregatedReport?${qs.toString()}`,
    );
    return {
      range: raw.range ?? `${startDate}|${endDate}`,
      requests: raw.requests ?? 0,
      delivered: raw.delivered ?? 0,
      hardBounces: raw.hardBounces ?? 0,
      softBounces: raw.softBounces ?? 0,
      clicks: raw.clicks ?? 0,
      uniqueClicks: raw.uniqueClicks ?? 0,
      opens: raw.opens ?? 0,
      uniqueOpens: raw.uniqueOpens ?? 0,
      spamReports: raw.spamReports ?? 0,
      blocked: raw.blocked ?? 0,
      invalid: raw.invalid ?? 0,
      unsubscribed: raw.unsubscribed ?? 0,
    };
  }

  return {
    getEvents,
    getAggregatedReport,
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toBrevoStatsError(httpStatus: number, json: unknown): BrevoStatsError {
  let detail = "";
  if (json && typeof json === "object") {
    const j = json as { message?: string; code?: string };
    detail = j.code ? `${j.code}: ${j.message ?? ""}` : (j.message ?? "");
  }
  return new BrevoStatsError({
    message: detail || `Brevo stats request failed: HTTP ${httpStatus}`,
    code: `http_${httpStatus}`,
    httpStatus,
  });
}

function parseRetryAfterMs(value: string): number {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, 30_000);
  return 4000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
