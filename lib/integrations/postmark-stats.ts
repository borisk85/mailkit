import "server-only";

/**
 * Postmark per-server stats client for the anti-abuse cron loop.
 *
 * Uses native fetch against the Postmark Stats API with the Server API token.
 * Returns an AggregatedReport shape compatible with lib/deliverability.ts.
 *
 * Endpoints:
 *   GET https://api.postmarkapp.com/stats/outbound
 *   Headers: X-Postmark-Server-Token: {token}
 *   Query: fromdate (YYYY-MM-DD), todate (YYYY-MM-DD)
 */

const POSTMARK_API_BASE = "https://api.postmarkapp.com";
const RETRY_DELAYS_MS = [1000, 2000, 4000];

export class PostmarkStatsError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(opts: { message: string; code: number; httpStatus: number }) {
    super(opts.message);
    this.name = "PostmarkStatsError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}

export type PostmarkOutboundStats = {
  Sent: number;
  Bounced: number;
  SMTPApiErrors: number;
  BounceRate: number;
  SpamComplaintsRate: number;
  SpamComplaints: number;
  Opens: number;
  UniqueOpens: number;
  Tracked: number;
  WithLinkTracking: number;
  WithOpenTracking: number;
  TotalTracked: number;
  Unique: number;
};

export type PostmarkStatsClient = ReturnType<typeof createPostmarkStatsClient>;

export function createPostmarkStatsClient(serverToken: string) {
  if (!serverToken) {
    throw new PostmarkStatsError({
      message: "Missing Postmark server token",
      code: 0,
      httpStatus: 0,
    });
  }

  async function request<T>(path: string): Promise<T> {
    const url = `${POSTMARK_API_BASE}${path}`;
    const init: RequestInit = {
      method: "GET",
      headers: {
        "X-Postmark-Server-Token": serverToken,
        Accept: "application/json",
      },
    };

    let lastError: PostmarkStatsError | null = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const res = await fetch(url, init);
      const retriable = res.status === 429 || res.status >= 500;

      if (!retriable) {
        const json = (await safeJson(res)) as unknown;
        if (res.ok) return json as T;
        throw toError(res.status, json);
      }

      const json = (await safeJson(res)) as unknown;
      lastError = toError(res.status, json);

      if (attempt === RETRY_DELAYS_MS.length) break;

      const retryAfter = res.headers.get("retry-after");
      const delayMs =
        res.status === 429 && retryAfter
          ? parseRetryAfterMs(retryAfter)
          : RETRY_DELAYS_MS[attempt];

      console.warn(
        `[postmark-stats] GET ${path} → ${res.status}, retry in ${delayMs}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`,
      );
      await sleep(delayMs);
    }

    throw (
      lastError ??
      new PostmarkStatsError({
        message: "Postmark stats request failed after retries",
        code: 0,
        httpStatus: 0,
      })
    );
  }

  /**
   * Returns aggregated outbound stats for this server over the given date range.
   * Maps to the AggregatedReport shape expected by lib/deliverability.ts.
   */
  async function getAggregatedReport(args: {
    startDate: string;
    endDate: string;
  }): Promise<{
    requests: number;
    delivered: number;
    hardBounces: number;
    softBounces: number;
    spamReports: number;
    unsubscribed: number;
  }> {
    const qs = new URLSearchParams({
      fromdate: args.startDate,
      todate: args.endDate,
    });

    const raw = await request<Partial<PostmarkOutboundStats>>(
      `/stats/outbound?${qs.toString()}`,
    );

    const sent = raw.Sent ?? 0;
    const bounced = raw.Bounced ?? 0;
    const spam = raw.SpamComplaints ?? 0;

    return {
      requests: sent,
      delivered: Math.max(0, sent - bounced - spam),
      hardBounces: bounced,
      softBounces: 0,
      spamReports: spam,
      unsubscribed: 0,
    };
  }

  return { getAggregatedReport };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toError(httpStatus: number, json: unknown): PostmarkStatsError {
  const obj =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const code = typeof obj.ErrorCode === "number" ? obj.ErrorCode : httpStatus;
  const message =
    typeof obj.Message === "string"
      ? obj.Message
      : `Postmark stats HTTP ${httpStatus}`;
  return new PostmarkStatsError({ message, code, httpStatus });
}

function parseRetryAfterMs(value: string): number {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, 30_000);
  return 4000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
