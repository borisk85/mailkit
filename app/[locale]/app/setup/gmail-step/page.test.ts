import { describe, expect, test, vi } from "vitest";

// next/navigation.redirect throws NEXT_REDIRECT at runtime — mock it as
// a stub that captures the call so we can assert the target without
// hitting Next's App-Router plumbing. Use vi.hoisted so redirectMock is
// available inside the hoisted vi.mock factory.
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
  test("/en redirects to /en/app/setup", async () => {
    redirectMock.mockClear();
    await expect(
      GmailStepPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/en/app/setup");
  });

  test("/ru redirects to /ru/app/setup", async () => {
    redirectMock.mockClear();
    await expect(
      GmailStepPage({ params: Promise.resolve({ locale: "ru" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/ru/app/setup");
  });
});
