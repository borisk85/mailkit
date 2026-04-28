import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

vi.mock("server-only", () => ({}));

import {
  BrevoTransactionalError,
  humanizeFailedStep,
  sendAutoRefundEmail,
  sendTransactionalEmail,
} from "./brevo-transactional";

const BREVO_BASE = "https://api.brevo.com/v3";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BREVO_API_KEY = "k";
  process.env.MAILKIT_SUPPORT_FROM_EMAIL = "support@mailkit-test.ru";
  process.env.MAILKIT_SUPPORT_FROM_NAME = "MailKit support";
});

afterEach(() => {
  delete process.env.BREVO_API_KEY;
  delete process.env.MAILKIT_SUPPORT_FROM_EMAIL;
  delete process.env.MAILKIT_SUPPORT_FROM_NAME;
});

describe("sendTransactionalEmail", () => {
  test("missing BREVO_API_KEY → throws missing_api_key", async () => {
    delete process.env.BREVO_API_KEY;
    await expect(
      sendTransactionalEmail({
        to: { email: "u@example.com" },
        subject: "hi",
        textContent: "body",
      }),
    ).rejects.toMatchObject({
      name: "BrevoTransactionalError",
      code: "missing_api_key",
    });
  });

  test("missing MAILKIT_SUPPORT_FROM_EMAIL → throws missing_from_email", async () => {
    delete process.env.MAILKIT_SUPPORT_FROM_EMAIL;
    await expect(
      sendTransactionalEmail({
        to: { email: "u@example.com" },
        subject: "hi",
        textContent: "body",
      }),
    ).rejects.toMatchObject({
      name: "BrevoTransactionalError",
      code: "missing_from_email",
    });
  });

  test("posts to /smtp/email with expected body shape", async () => {
    let seen: unknown = null;
    server.use(
      http.post(`${BREVO_BASE}/smtp/email`, async ({ request }) => {
        expect(request.headers.get("api-key")).toBe("k");
        seen = await request.json();
        return HttpResponse.json({ messageId: "msg-1" });
      }),
    );

    await sendTransactionalEmail({
      to: { email: "u@example.com", name: "Jane" },
      subject: "hi",
      textContent: "body",
    });

    expect(seen).toEqual({
      sender: {
        email: "support@mailkit-test.ru",
        name: "MailKit support",
      },
      to: [{ email: "u@example.com", name: "Jane" }],
      subject: "hi",
      textContent: "body",
      replyTo: {
        email: "support@mailkit-test.ru",
        name: "MailKit support",
      },
    });
  });

  test("4xx from Brevo → throws BrevoTransactionalError with code", async () => {
    server.use(
      http.post(`${BREVO_BASE}/smtp/email`, () =>
        HttpResponse.json(
          { code: "unauthorized", message: "Invalid API key" },
          { status: 401 },
        ),
      ),
    );
    await expect(
      sendTransactionalEmail({
        to: { email: "u@example.com" },
        subject: "hi",
        textContent: "body",
      }),
    ).rejects.toMatchObject({
      code: "http_401",
      httpStatus: 401,
    });
  });

  test("defaults MAILKIT_SUPPORT_FROM_NAME to 'MailKit' when not set", async () => {
    delete process.env.MAILKIT_SUPPORT_FROM_NAME;
    let seen: { sender?: { name?: string } } = {};
    server.use(
      http.post(`${BREVO_BASE}/smtp/email`, async ({ request }) => {
        seen = (await request.json()) as typeof seen;
        return HttpResponse.json({ messageId: "ok" });
      }),
    );
    await sendTransactionalEmail({
      to: { email: "u@example.com" },
      subject: "hi",
      textContent: "body",
    });
    expect(seen.sender?.name).toBe("MailKit");
  });
});

describe("humanizeFailedStep", () => {
  test.each([
    ["enable_routing", "Cloudflare"],
    ["dns_upsert", "Cloudflare"],
    ["list_destinations", "Cloudflare"],
    ["create_destination", "Cloudflare"],
    ["list_rules", "Cloudflare"],
    ["create_rule", "Cloudflare"],
  ])("%s → mentions Cloudflare", (step, hint) => {
    expect(humanizeFailedStep(step)).toContain(hint);
  });

  test.each([
    ["brevo_create_sender", "Brevo"],
    ["brevo_dns_upsert", "Brevo"],
    ["brevo_spf_merge", "Brevo"],
    ["brevo_verify", "Brevo"],
    ["brevo_finalize", "Brevo"],
  ])("%s → mentions Brevo", (step, hint) => {
    expect(humanizeFailedStep(step)).toContain(hint);
  });

  test("unknown step → neutral catch-all", () => {
    expect(humanizeFailedStep("something_weird")).toBe(
      "Our automation hit an issue we couldn't recover from.",
    );
  });
});

describe("sendAutoRefundEmail", () => {
  test("full email shape matches architect template copy", async () => {
    let seen: {
      subject?: string;
      textContent?: string;
      to?: { email?: string; name?: string }[];
    } = {};
    server.use(
      http.post(`${BREVO_BASE}/smtp/email`, async ({ request }) => {
        seen = (await request.json()) as typeof seen;
        return HttpResponse.json({ messageId: "ok" });
      }),
    );

    await sendAutoRefundEmail({
      toEmail: "buyer@example.com",
      toName: "Boris",
      failedStep: "brevo_verify",
    });

    expect(seen.subject).toBe(
      "Mailkit · Refund issued — $5 setup couldn't complete",
    );
    expect(seen.to).toEqual([{ email: "buyer@example.com", name: "Boris" }]);
    expect(seen.textContent).toContain(
      "Our automated setup for your domain couldn't complete",
    );
    expect(seen.textContent).toContain("3–10 business days");
    expect(seen.textContent).toContain(
      "Brevo SMTP authentication step couldn't complete on our end",
    );
    expect(seen.textContent).toContain("— MailKit support");
  });

  test("unknown failed_step uses catch-all humanization", async () => {
    let seen: { textContent?: string } = {};
    server.use(
      http.post(`${BREVO_BASE}/smtp/email`, async ({ request }) => {
        seen = (await request.json()) as typeof seen;
        return HttpResponse.json({ messageId: "ok" });
      }),
    );
    await sendAutoRefundEmail({
      toEmail: "buyer@example.com",
      failedStep: "unexpected_step",
    });
    expect(seen.textContent).toContain("automation hit an issue");
  });

  test.each([
    ["missing BREVO_API_KEY", "BREVO_API_KEY", "missing_api_key"],
    ["missing FROM_EMAIL", "MAILKIT_SUPPORT_FROM_EMAIL", "missing_from_email"],
  ])("%s propagates the env error code", async (_name, envVar, code) => {
    delete process.env[envVar];
    await expect(
      sendAutoRefundEmail({
        toEmail: "buyer@example.com",
        failedStep: "enable_routing",
      }),
    ).rejects.toMatchObject({
      name: "BrevoTransactionalError",
      code,
    });
  });
});

// Quiet an unused-import warning — exported type helper used for
// cross-file type narrowing but not referenced directly in tests.
void BrevoTransactionalError;
