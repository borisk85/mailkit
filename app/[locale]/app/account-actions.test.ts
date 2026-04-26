import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import * as sbModule from "@/lib/supabase/server";

import { deleteAccount } from "./account-actions";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeUserClient(opts: {
  user?: { id: string } | null;
  authErr?: { message: string } | null;
  signOutFails?: boolean;
}) {
  const { user = { id: "u-1" }, authErr = null, signOutFails = false } = opts;
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user },
        error: authErr,
      })),
      signOut: vi.fn(async () => {
        if (signOutFails) throw new Error("session already invalidated");
        return { error: null };
      }),
    },
  };
}

function makeAdminClient(opts: { deleteUserErr?: { message: string } | null }) {
  const { deleteUserErr = null } = opts;
  return {
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({
          data: { user: null },
          error: deleteUserErr,
        })),
      },
    },
  };
}

describe("deleteAccount", () => {
  test("happy path: getUser → admin.deleteUser(id) → signOut", async () => {
    const userClient = makeUserClient({ user: { id: "u-abc" } });
    const adminClient = makeAdminClient({});
    vi.mocked(sbModule.createClient).mockResolvedValue(
      userClient as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    await deleteAccount();

    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith("u-abc");
    expect(userClient.auth.signOut).toHaveBeenCalled();
  });

  test("not authenticated → throws", async () => {
    const userClient = makeUserClient({ user: null });
    const adminClient = makeAdminClient({});
    vi.mocked(sbModule.createClient).mockResolvedValue(
      userClient as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    await expect(deleteAccount()).rejects.toThrow(/Not authenticated/);
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  test("auth.getUser error → throws and never deletes", async () => {
    const userClient = makeUserClient({
      user: null,
      authErr: { message: "token expired" },
    });
    const adminClient = makeAdminClient({});
    vi.mocked(sbModule.createClient).mockResolvedValue(
      userClient as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    await expect(deleteAccount()).rejects.toThrow(/Not authenticated/);
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  test("admin.deleteUser error → propagates as Error", async () => {
    const userClient = makeUserClient({});
    const adminClient = makeAdminClient({
      deleteUserErr: { message: "user not found" },
    });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      userClient as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    await expect(deleteAccount()).rejects.toThrow(
      /Account deletion failed: user not found/,
    );
    expect(userClient.auth.signOut).not.toHaveBeenCalled();
  });

  test("signOut failure does NOT cascade — deletion already happened", async () => {
    const userClient = makeUserClient({ signOutFails: true });
    const adminClient = makeAdminClient({});
    vi.mocked(sbModule.createClient).mockResolvedValue(
      userClient as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    // No throw — signOut is best-effort; the auth.users row is gone
    // either way, so a session-cleanup hiccup must not surface.
    await expect(deleteAccount()).resolves.toBeUndefined();
    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalled();
  });

  test("uses caller's session user.id, not any client-provided value", async () => {
    // Defense-in-depth: the action takes no arguments, so the only
    // way to identify which user gets deleted is auth.getUser. This
    // test pins that contract — if someone refactors the signature
    // to take an id parameter, this test will need a careful look.
    const userClient = makeUserClient({ user: { id: "session-user-real" } });
    const adminClient = makeAdminClient({});
    vi.mocked(sbModule.createClient).mockResolvedValue(
      userClient as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      adminClient as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    await deleteAccount();

    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledTimes(1);
    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      "session-user-real",
    );
  });
});
