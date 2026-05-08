import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import * as sbModule from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("https://getmailkit.com/en/auth/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

function makeExchangeMock(result: {
  session: {
    user: { id: string };
    provider_refresh_token?: string | null;
  } | null;
  error: { message: string } | null;
}) {
  return vi.fn().mockResolvedValue({ data: result, error: result.error });
}

function makeClientStub(exchangeFn: ReturnType<typeof vi.fn>) {
  return {
    auth: {
      exchangeCodeForSession: exchangeFn,
    },
  };
}

function makeServiceClientStub() {
  const eqFn = vi.fn();
  return {
    stub: {
      from: () => ({
        update: () => ({ eq: eqFn }),
      }),
    },
    eqFn,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /auth/callback", () => {
  test("no_code: missing ?code → 307 with error=no_code", async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("Location") ?? "";
    expect(location).toContain("error=no_code");
  });

  test("oauth_failed on error: exchange returns error → 307 with error=oauth_failed", async () => {
    const exchangeFn = makeExchangeMock({
      session: null,
      error: { message: "bad code" },
    });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeClientStub(exchangeFn) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );

    const req = makeRequest({ code: "testcode123" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("Location") ?? "";
    expect(location).toContain("error=oauth_failed");
  });

  test("oauth_failed on null session: exchange returns null session with no error → 307 with error=oauth_failed", async () => {
    const exchangeFn = vi
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeClientStub(exchangeFn) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );

    const req = makeRequest({ code: "testcode456" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("Location") ?? "";
    expect(location).toContain("error=oauth_failed");
  });

  test("success redirect to /app: valid session without provider_refresh_token → 307 ending with /app", async () => {
    const exchangeFn = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "user-001" },
          provider_refresh_token: null,
        },
      },
      error: null,
    });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeClientStub(exchangeFn) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );

    const req = makeRequest({ code: "happycode" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("Location") ?? "";
    expect(location.endsWith("/app")).toBe(true);
    expect(sbModule.createServiceClient).not.toHaveBeenCalled();
  });

  test("success with custom ?next=: valid session + next=/app/setup → 307 ending with /app/setup", async () => {
    const exchangeFn = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "user-002" },
          provider_refresh_token: null,
        },
      },
      error: null,
    });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeClientStub(exchangeFn) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );

    const req = makeRequest({ code: "happycode2", next: "/app/setup" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("Location") ?? "";
    expect(location.endsWith("/app/setup")).toBe(true);
  });

  test("provider_refresh_token saved: session has token → createServiceClient called + update().eq() called with google_refresh_token", async () => {
    const exchangeFn = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: "user-003" },
          provider_refresh_token: "rtoken",
        },
      },
      error: null,
    });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeClientStub(exchangeFn) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );

    const { stub, eqFn } = makeServiceClientStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      stub as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const req = makeRequest({ code: "tokencode" });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(sbModule.createServiceClient).toHaveBeenCalledTimes(1);
    expect(eqFn).toHaveBeenCalledWith("id", "user-003");
  });
});
