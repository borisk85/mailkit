import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// server-only is a stub in vitest — replace with a no-op.
vi.mock("server-only", () => ({}));

import { BrevoError, createBrevoClient } from "./brevo";

const BASE = "https://api.brevo.com/v3";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("createBrevoClient", () => {
  test("throws BrevoError when API key is missing", () => {
    expect(() => createBrevoClient("")).toThrow(BrevoError);
  });

  test("listSenderDomains returns normalized list", async () => {
    server.use(
      http.get(`${BASE}/senders/domains`, ({ request }) => {
        expect(request.headers.get("api-key")).toBe("key");
        return HttpResponse.json({
          domains: [
            {
              id: 1,
              domain_name: "a.com",
              authenticated: true,
              verified: true,
            },
          ],
        });
      }),
    );
    const client = createBrevoClient("key");
    const list = await client.listSenderDomains();
    expect(list).toEqual([
      {
        id: 1,
        domain_name: "a.com",
        authenticated: true,
        verified: true,
        dkim_record: undefined,
        brevo_code_record: undefined,
        dmarc_record: undefined,
      },
    ]);
  });

  test("listSenderDomains tolerates camelCase variant", async () => {
    server.use(
      http.get(`${BASE}/senders/domains`, () =>
        HttpResponse.json({
          domains: [
            {
              id: 2,
              domainName: "b.com",
              authenticated: false,
              dkimRecord: {
                hostname: "mail._domainkey.b.com",
                value: "v=DKIM1; p=AAA",
              },
            },
          ],
        }),
      ),
    );
    const client = createBrevoClient("key");
    const [d] = await client.listSenderDomains();
    expect(d.domain_name).toBe("b.com");
    expect(d.dkim_record?.hostname).toBe("mail._domainkey.b.com");
    expect(d.dkim_record?.value).toBe("v=DKIM1; p=AAA");
  });

  test("getSenderDomain fetches single record by name", async () => {
    server.use(
      http.get(`${BASE}/senders/domains/example.com`, () =>
        HttpResponse.json({
          id: 10,
          domain_name: "example.com",
          authenticated: false,
          verified: false,
          dkim_record: {
            hostname: "mail._domainkey.example.com",
            value: "v=DKIM1; p=PUBKEY",
          },
          brevo_code_record: {
            hostname: "example.com",
            value: "brevo-code:xyz",
          },
          dmarc_record: {
            hostname: "_dmarc.example.com",
            value: "v=DMARC1; p=none; rua=mailto:postmaster@example.com",
          },
        }),
      ),
    );
    const client = createBrevoClient("key");
    const d = await client.getSenderDomain("example.com");
    expect(d.id).toBe(10);
    expect(d.dkim_record?.value).toContain("DKIM1");
    expect(d.brevo_code_record?.value).toBe("brevo-code:xyz");
    expect(d.dmarc_record?.hostname).toBe("_dmarc.example.com");
  });

  test("createSenderDomain happy path returns { created: true }", async () => {
    server.use(
      http.post(`${BASE}/senders/domains`, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        expect(body.name).toBe("new.com");
        return HttpResponse.json({
          id: 42,
          domain_name: "new.com",
          authenticated: false,
          dkim_record: {
            hostname: "mail._domainkey.new.com",
            value: "v=DKIM1; p=A",
          },
          brevo_code_record: { hostname: "new.com", value: "brevo-code:abc" },
        });
      }),
    );
    const client = createBrevoClient("key");
    const { domain, created } = await client.createSenderDomain("new.com");
    expect(created).toBe(true);
    expect(domain.id).toBe(42);
  });

  test("createSenderDomain on duplicate resolves to existing via list", async () => {
    let listCalls = 0;
    server.use(
      http.post(`${BASE}/senders/domains`, () =>
        HttpResponse.json(
          {
            code: "duplicate_parameter",
            message: "Domain already exists",
          },
          { status: 400 },
        ),
      ),
      http.get(`${BASE}/senders/domains`, () => {
        listCalls += 1;
        return HttpResponse.json({
          domains: [
            { id: 7, domain_name: "other.com", authenticated: true },
            {
              id: 99,
              domain_name: "taken.com",
              authenticated: true,
              verified: true,
            },
          ],
        });
      }),
    );
    const client = createBrevoClient("key");
    const { domain, created } = await client.createSenderDomain("taken.com");
    expect(created).toBe(false);
    expect(domain.id).toBe(99);
    expect(listCalls).toBe(1);
  });

  test("createSenderDomain 400 with non-duplicate code bubbles", async () => {
    server.use(
      http.post(`${BASE}/senders/domains`, () =>
        HttpResponse.json(
          { code: "invalid_parameter", message: "bad name" },
          { status: 400 },
        ),
      ),
    );
    const client = createBrevoClient("key");
    await expect(client.createSenderDomain("!!!")).rejects.toMatchObject({
      name: "BrevoError",
      httpStatus: 400,
      code: "invalid_parameter",
    });
  });

  test("401 invalid api key — no retry, bubble", async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/senders/domains`, () => {
        calls += 1;
        return HttpResponse.json(
          { code: "unauthorized", message: "Key not found" },
          { status: 401 },
        );
      }),
    );
    const client = createBrevoClient("bad");
    await expect(client.listSenderDomains()).rejects.toMatchObject({
      httpStatus: 401,
      code: "unauthorized",
    });
    expect(calls).toBe(1);
  });

  test("429 rate-limited retries with exp backoff then succeeds", async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/senders/domains`, () => {
        calls += 1;
        if (calls < 3) {
          return HttpResponse.json(
            { code: "rate_limit", message: "Too many requests" },
            { status: 429 },
          );
        }
        return HttpResponse.json({ domains: [] });
      }),
    );
    const client = createBrevoClient("key");
    const p = client.listSenderDomains();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const out = await p;
    expect(out).toEqual([]);
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  test("429 with Retry-After (seconds) honors the header", async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/senders/domains`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { code: "rate_limit", message: "slow down" },
            { status: 429, headers: { "retry-after": "3" } },
          );
        }
        return HttpResponse.json({ domains: [] });
      }),
    );
    const client = createBrevoClient("key");
    const p = client.listSenderDomains();
    await vi.advanceTimersByTimeAsync(2500);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(600);
    await p;
    expect(calls).toBe(2);
    vi.useRealTimers();
  });

  test("5xx retries, exhausts, surfaces BrevoError", async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/senders/domains`, () => {
        calls += 1;
        return HttpResponse.json(
          { code: "server_error", message: "oops" },
          { status: 500 },
        );
      }),
    );
    const client = createBrevoClient("key");
    const p = client.listSenderDomains().catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    const err = await p;
    expect(err).toBeInstanceOf(BrevoError);
    expect(err.httpStatus).toBe(500);
    expect(calls).toBe(4); // 1 initial + 3 retries
    vi.useRealTimers();
  });

  test("verifyDomain PUTs to /authenticate and normalizes response", async () => {
    server.use(
      http.put(`${BASE}/senders/domains/example.com/authenticate`, () =>
        HttpResponse.json({
          id: 10,
          domain_name: "example.com",
          authenticated: true,
          verified: true,
        }),
      ),
    );
    const client = createBrevoClient("key");
    const d = await client.verifyDomain("example.com");
    expect(d.authenticated).toBe(true);
    expect(d.verified).toBe(true);
  });

  test("verifyDomain pending response normalizes verified=false", async () => {
    server.use(
      http.put(`${BASE}/senders/domains/pending.com/authenticate`, () =>
        HttpResponse.json({
          id: 11,
          domain_name: "pending.com",
          authenticated: false,
          verified: false,
        }),
      ),
    );
    const client = createBrevoClient("key");
    const d = await client.verifyDomain("pending.com");
    expect(d.authenticated).toBe(false);
    expect(d.verified).toBe(false);
  });
});
