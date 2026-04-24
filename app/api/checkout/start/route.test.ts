import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import * as sbModule from "@/lib/supabase/server";
import { GET } from "./route";

function makeAuthStub(opts: {
  user?: { id: string; email?: string | null } | null;
  error?: { message: string } | null;
}) {
  const { user = null, error = null } = opts;
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
        error,
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.LEMONSQUEEZY_CHECKOUT_URL =
    "https://velabot.lemonsqueezy.com/buy/test-variant-uuid";
});

afterEach(() => {
  delete process.env.LEMONSQUEEZY_CHECKOUT_URL;
});

describe("GET /api/checkout/start", () => {
  test("missing LEMONSQUEEZY_CHECKOUT_URL → 500", async () => {
    delete process.env.LEMONSQUEEZY_CHECKOUT_URL;
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("Checkout URL not configured");
  });

  test("no auth session → 401", async () => {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({ user: null }) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.text()).toContain("Not authenticated");
  });

  test("auth error from Supabase → 401", async () => {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({
        user: null,
        error: { message: "token expired" },
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test("happy path → 303 with user_id + email in checkout[custom]/checkout[email]", async () => {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({
        user: { id: "user-abc", email: "buyer@example.com" },
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const res = await GET();
    expect(res.status).toBe(303);
    const loc = res.headers.get("Location");
    expect(loc).toBeTruthy();
    const outUrl = new URL(loc!);
    expect(outUrl.origin + outUrl.pathname).toBe(
      "https://velabot.lemonsqueezy.com/buy/test-variant-uuid",
    );
    expect(outUrl.searchParams.get("checkout[custom][user_id]")).toBe(
      "user-abc",
    );
    expect(outUrl.searchParams.get("checkout[email]")).toBe(
      "buyer@example.com",
    );
  });

  test("user without email → no checkout[email] param but user_id still set", async () => {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({
        user: { id: "user-noemail", email: null },
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const res = await GET();
    expect(res.status).toBe(303);
    const outUrl = new URL(res.headers.get("Location")!);
    expect(outUrl.searchParams.get("checkout[custom][user_id]")).toBe(
      "user-noemail",
    );
    expect(outUrl.searchParams.has("checkout[email]")).toBe(false);
  });

  test("checkout URL with pre-existing query params → preserved + our params added", async () => {
    process.env.LEMONSQUEEZY_CHECKOUT_URL =
      "https://velabot.lemonsqueezy.com/buy/test-variant-uuid?discount=LAUNCH20&aff=boris";
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({
        user: { id: "user-abc", email: "buyer@example.com" },
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const res = await GET();
    expect(res.status).toBe(303);
    const outUrl = new URL(res.headers.get("Location")!);
    expect(outUrl.searchParams.get("discount")).toBe("LAUNCH20");
    expect(outUrl.searchParams.get("aff")).toBe("boris");
    expect(outUrl.searchParams.get("checkout[custom][user_id]")).toBe(
      "user-abc",
    );
    expect(outUrl.searchParams.get("checkout[email]")).toBe(
      "buyer@example.com",
    );
  });

  test("malformed LEMONSQUEEZY_CHECKOUT_URL → 500", async () => {
    process.env.LEMONSQUEEZY_CHECKOUT_URL = "not a url";
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({
        user: { id: "user-abc", email: "buyer@example.com" },
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("malformed");
  });

  test("existing checkout[custom][user_id] in env URL → overwritten by session user.id", async () => {
    process.env.LEMONSQUEEZY_CHECKOUT_URL =
      "https://velabot.lemonsqueezy.com/buy/test-variant-uuid?checkout%5Bcustom%5D%5Buser_id%5D=stale";
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAuthStub({
        user: { id: "user-fresh", email: "buyer@example.com" },
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const res = await GET();
    expect(res.status).toBe(303);
    const outUrl = new URL(res.headers.get("Location")!);
    expect(outUrl.searchParams.get("checkout[custom][user_id]")).toBe(
      "user-fresh",
    );
  });
});
