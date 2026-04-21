import "server-only";

/**
 * Brevo API client for Ticket #4b sender-domain setup.
 *
 * Native fetch, no SDK. Mirror of lib/integrations/cloudflare.ts:
 * 429/5xx → exp backoff 1s/2s/4s (honors Retry-After on 429),
 * 3 retries total; other 4xx bubble. All errors wrap in BrevoError
 * with provider code + HTTP status.
 *
 * The `server-only` import above ensures this module never lands in
 * a client bundle — the API key travels with every request and must
 * not leak.
 */

const BREVO_API_BASE = process.env.BREVO_API_URL ?? "https://api.brevo.com/v3";

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;

export class BrevoError extends Error {
  readonly code: string | number;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(opts: {
    message: string;
    code: string | number;
    httpStatus: number;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "BrevoError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.details = opts.details;
  }
}

export type SenderDomainRecord = {
  type: "TXT";
  hostname: string;
  value: string;
};

export type SenderDomain = {
  id: number;
  domain_name: string;
  authenticated: boolean;
  verified?: boolean;
  dkim_record?: SenderDomainRecord;
  brevo_code_record?: SenderDomainRecord;
  dmarc_record?: SenderDomainRecord;
};

export type BrevoClient = ReturnType<typeof createBrevoClient>;

/**
 * Brevo responses vary by endpoint; the fields we rely on are whatever
 * the `domains` endpoints emit. We model the normalized shape and map
 * raw responses in each method so callers never see Brevo-specific
 * snake_case outside of this file.
 */
type RawDomainResponse = {
  id: number;
  domain_name?: string;
  domainName?: string;
  authenticated?: boolean;
  verified?: boolean;
  dkim_record?: Partial<SenderDomainRecord>;
  dkimRecord?: Partial<SenderDomainRecord>;
  brevo_code_record?: Partial<SenderDomainRecord>;
  brevoCodeRecord?: Partial<SenderDomainRecord>;
  dmarc_record?: Partial<SenderDomainRecord>;
  dmarcRecord?: Partial<SenderDomainRecord>;
};

type RawListResponse = {
  domains?: RawDomainResponse[];
};

export function createBrevoClient(apiKey: string) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new BrevoError({
      message: "Missing Brevo API key",
      code: "missing_api_key",
      httpStatus: 0,
    });
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${BREVO_API_BASE}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    let lastError: BrevoError | null = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      const res = await fetch(url, init);
      const retriable = res.status === 429 || res.status >= 500;

      if (!retriable) {
        if (res.status === 204) return undefined as T;
        const json = (await safeJson(res)) as unknown;
        if (res.ok) return json as T;
        throw toBrevoError(res.status, json);
      }

      const json = (await safeJson(res)) as unknown;
      lastError = toBrevoError(res.status, json);

      if (attempt === RETRY_DELAYS_MS.length) break;

      const retryAfter = res.headers.get("retry-after");
      const delayMs =
        res.status === 429 && retryAfter
          ? parseRetryAfterMs(retryAfter)
          : RETRY_DELAYS_MS[attempt];

      console.warn(
        `[brevo] ${method} ${path} → ${res.status}, retry in ${delayMs}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`,
      );
      await sleep(delayMs);
    }

    throw (
      lastError ??
      new BrevoError({
        message: "Brevo request failed after retries",
        code: "retry_exhausted",
        httpStatus: 0,
      })
    );
  }

  function normalize(raw: RawDomainResponse): SenderDomain {
    const dkim = raw.dkim_record ?? raw.dkimRecord;
    const brevoCode = raw.brevo_code_record ?? raw.brevoCodeRecord;
    const dmarc = raw.dmarc_record ?? raw.dmarcRecord;
    return {
      id: raw.id,
      domain_name: raw.domain_name ?? raw.domainName ?? "",
      authenticated: !!raw.authenticated,
      verified: raw.verified,
      dkim_record: dkim ? coerceRecord(dkim) : undefined,
      brevo_code_record: brevoCode ? coerceRecord(brevoCode) : undefined,
      dmarc_record: dmarc ? coerceRecord(dmarc) : undefined,
    };
  }

  async function listSenderDomains(): Promise<SenderDomain[]> {
    const raw = await request<RawListResponse>("GET", "/senders/domains");
    return (raw.domains ?? []).map(normalize);
  }

  async function getSenderDomain(domainName: string): Promise<SenderDomain> {
    const raw = await request<RawDomainResponse>(
      "GET",
      `/senders/domains/${encodeURIComponent(domainName)}`,
    );
    return normalize(raw);
  }

  /**
   * Create a sender domain. If Brevo reports the domain is already
   * claimed ("Domain already exists" — code `duplicate_parameter` or
   * HTTP 400 with that message), resolve it to the existing record
   * via listSenderDomains() and return `{ domain, created: false }`.
   * Callers treat both branches identically.
   */
  async function createSenderDomain(
    name: string,
  ): Promise<{ domain: SenderDomain; created: boolean }> {
    try {
      const raw = await request<RawDomainResponse>("POST", "/senders/domains", {
        name,
      });
      return { domain: normalize(raw), created: true };
    } catch (e) {
      if (isDuplicateDomain(e)) {
        const list = await listSenderDomains();
        const existing = list.find((d) => d.domain_name === name);
        if (existing) return { domain: existing, created: false };
      }
      throw e;
    }
  }

  async function verifyDomain(domainName: string): Promise<SenderDomain> {
    const raw = await request<RawDomainResponse>(
      "PUT",
      `/senders/domains/${encodeURIComponent(domainName)}/authenticate`,
    );
    return normalize(raw);
  }

  return {
    listSenderDomains,
    getSenderDomain,
    createSenderDomain,
    verifyDomain,
  };
}

function coerceRecord(
  partial: Partial<SenderDomainRecord>,
): SenderDomainRecord {
  return {
    type: "TXT",
    hostname: partial.hostname ?? "",
    value: partial.value ?? "",
  };
}

function isDuplicateDomain(e: unknown): boolean {
  if (!(e instanceof BrevoError)) return false;
  if (e.httpStatus !== 400) return false;
  const code = String(e.code).toLowerCase();
  if (code === "duplicate_parameter" || code === "duplicate") return true;
  return /already exists|already registered/i.test(e.message);
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toBrevoError(httpStatus: number, json: unknown): BrevoError {
  const obj = (json && typeof json === "object" ? json : {}) as Record<
    string,
    unknown
  >;
  const code =
    (typeof obj.code === "string" || typeof obj.code === "number"
      ? obj.code
      : undefined) ?? httpStatus;
  const message =
    typeof obj.message === "string" ? obj.message : `Brevo HTTP ${httpStatus}`;
  return new BrevoError({ message, code, httpStatus, details: json });
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
