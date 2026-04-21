/**
 * Cloudflare API client for Ticket #4a setup pipeline.
 *
 * Native fetch, no SDK. Retry policy: 429/5xx → exp backoff 1s/2s/4s
 * (respects Retry-After on 429), 3 attempts total. Other 4xx → bubble.
 * All errors wrap in CloudflareError with CF error code + HTTP status.
 *
 * Callers never persist the user's API token — it lives in-memory on
 * the server action request only.
 */

const CF_API_BASE =
  process.env.CLOUDFLARE_API_BASE ?? "https://api.cloudflare.com/client/v4";

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export class CloudflareError extends Error {
  readonly code: number | string;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(opts: {
    message: string;
    code: number | string;
    httpStatus: number;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "CloudflareError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.details = opts.details;
  }
}

type CfEnvelope<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
  };
};

export type Zone = {
  id: string;
  name: string;
  status: string;
  account: { id: string; name: string };
};

export type DnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
};

export type DnsRecordInput = {
  type: "MX" | "TXT" | "A" | "AAAA" | "CNAME";
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
};

export type EmailRoutingStatus = {
  enabled: boolean;
  name?: string;
  status: "ready" | "unlocked" | string;
  created?: string;
  modified?: string;
};

export type EmailRoutingRule = {
  id?: string;
  name?: string;
  enabled: boolean;
  matchers: Array<{ type: "literal"; field: "to"; value: string }>;
  actions: Array<{ type: "forward" | "drop" | "worker"; value: string[] }>;
  priority?: number;
};

export type EmailRoutingDestination = {
  email: string;
  verified: string | null;
  created?: string;
  modified?: string;
  tag?: string;
};

export type CloudflareClient = ReturnType<typeof createCloudflareClient>;

export function createCloudflareClient(token: string) {
  if (!token || typeof token !== "string") {
    throw new CloudflareError({
      message: "Missing Cloudflare API token",
      code: "missing_token",
      httpStatus: 0,
    });
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${CF_API_BASE}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    let lastError: CloudflareError | null = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const res = await fetch(url, init);
      const retriable = res.status === 429 || res.status >= 500;

      if (!retriable) {
        const json = (await safeJson(res)) as CfEnvelope<T> | null;
        if (res.ok && json?.success) {
          return json.result;
        }
        throw toCfError(res.status, json);
      }

      // Retriable path — capture error, maybe retry
      const json = (await safeJson(res)) as CfEnvelope<T> | null;
      lastError = toCfError(res.status, json);

      if (attempt === RETRY_DELAYS_MS.length) break;

      const retryAfter = res.headers.get("retry-after");
      const delayMs =
        res.status === 429 && retryAfter
          ? parseRetryAfterMs(retryAfter)
          : RETRY_DELAYS_MS[attempt];

      console.warn(
        `[cloudflare] ${method} ${path} → ${res.status}, retry in ${delayMs}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`,
      );
      await sleep(delayMs);
    }

    throw (
      lastError ??
      new CloudflareError({
        message: "Cloudflare request failed after retries",
        code: "retry_exhausted",
        httpStatus: 0,
      })
    );
  }

  async function listZones(): Promise<Zone[]> {
    const zones = await request<Zone[]>(
      "GET",
      "/zones?status=active&per_page=50",
    );
    return zones;
  }

  async function getEmailRoutingStatus(
    zoneId: string,
  ): Promise<EmailRoutingStatus> {
    return request<EmailRoutingStatus>(
      "GET",
      `/zones/${encodeURIComponent(zoneId)}/email/routing`,
    );
  }

  async function enableEmailRouting(
    zoneId: string,
  ): Promise<{ status: EmailRoutingStatus; skipped: boolean }> {
    const current = await getEmailRoutingStatus(zoneId);
    if (current.enabled || current.status === "ready") {
      return { status: current, skipped: true };
    }
    const status = await request<EmailRoutingStatus>(
      "POST",
      `/zones/${encodeURIComponent(zoneId)}/email/routing/enable`,
    );
    return { status, skipped: false };
  }

  async function listDnsRecords(
    zoneId: string,
    filter?: { type?: string; name?: string },
  ): Promise<DnsRecord[]> {
    const qs = new URLSearchParams();
    if (filter?.type) qs.set("type", filter.type);
    if (filter?.name) qs.set("name", filter.name);
    qs.set("per_page", "100");
    return request<DnsRecord[]>(
      "GET",
      `/zones/${encodeURIComponent(zoneId)}/dns_records?${qs.toString()}`,
    );
  }

  async function createDnsRecord(
    zoneId: string,
    record: DnsRecordInput,
  ): Promise<DnsRecord> {
    return request<DnsRecord>(
      "POST",
      `/zones/${encodeURIComponent(zoneId)}/dns_records`,
      record,
    );
  }

  async function updateDnsRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecordInput,
  ): Promise<DnsRecord> {
    return request<DnsRecord>(
      "PUT",
      `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`,
      record,
    );
  }

  async function listEmailRoutingRules(
    zoneId: string,
  ): Promise<EmailRoutingRule[]> {
    return request<EmailRoutingRule[]>(
      "GET",
      `/zones/${encodeURIComponent(zoneId)}/email/routing/rules?per_page=50`,
    );
  }

  async function createEmailRoutingRule(
    zoneId: string,
    rule: EmailRoutingRule,
  ): Promise<EmailRoutingRule> {
    return request<EmailRoutingRule>(
      "POST",
      `/zones/${encodeURIComponent(zoneId)}/email/routing/rules`,
      rule,
    );
  }

  async function listEmailRoutingDestinations(
    accountId: string,
  ): Promise<EmailRoutingDestination[]> {
    return request<EmailRoutingDestination[]>(
      "GET",
      `/accounts/${encodeURIComponent(accountId)}/email/routing/addresses?per_page=50`,
    );
  }

  async function createEmailRoutingDestination(
    accountId: string,
    email: string,
  ): Promise<EmailRoutingDestination> {
    return request<EmailRoutingDestination>(
      "POST",
      `/accounts/${encodeURIComponent(accountId)}/email/routing/addresses`,
      { email },
    );
  }

  return {
    listZones,
    getEmailRoutingStatus,
    enableEmailRouting,
    listDnsRecords,
    createDnsRecord,
    updateDnsRecord,
    listEmailRoutingRules,
    createEmailRoutingRule,
    listEmailRoutingDestinations,
    createEmailRoutingDestination,
  };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toCfError(
  httpStatus: number,
  json: CfEnvelope<unknown> | null,
): CloudflareError {
  const first = json?.errors?.[0];
  return new CloudflareError({
    message: first?.message ?? `Cloudflare HTTP ${httpStatus}`,
    code: first?.code ?? httpStatus,
    httpStatus,
    details: json,
  });
}

function parseRetryAfterMs(value: string): number {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.min(n, 30) * 1000;
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return Math.max(0, Math.min(delta, 30_000));
  }
  return 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
