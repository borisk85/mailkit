import { describe, expect, test, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import GmailStepPage from "./page";

describe("/app/setup/gmail-step redirect", () => {
  test("redirects to /app/setup", async () => {
    redirectMock.mockClear();
    await expect(GmailStepPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/app/setup");
  });
});
