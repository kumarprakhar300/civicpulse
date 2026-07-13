import { describe, it, expect, vi } from "vitest";
import { fetchUserStatsForCaller, getUserStats } from "@/lib/civic.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATS = {
  reports_count: 3,
  resolved_count: 1,
  upvotes_received: 7,
  comments_count: 2,
};

function mkAdmin(stats = STATS) {
  return {
    rpc: vi.fn(async (_fn: string, _args: any) => ({ data: [stats], error: null })),
  };
}

function mkCaller(isAdmin = false) {
  return {
    rpc: vi.fn(async (_fn: string, _args: any) => ({ data: isAdmin, error: null })),
  };
}

describe("getUserStats server function", () => {
  it("requires authentication (requireSupabaseAuth middleware attached)", () => {
    // Structural guarantee: without this middleware, the handler would run
    // unauthenticated on the published site.
    const middleware = (getUserStats as any).options?.middleware ?? (getUserStats as any).__middleware;
    // TanStack exposes the middleware chain via `.options.middleware`.
    expect(middleware).toBeDefined();
    expect(middleware).toContain(requireSupabaseAuth);
  });
});

describe("fetchUserStatsForCaller authorization", () => {
  it("returns caller's own stats without a role check", async () => {
    const caller = mkCaller(false);
    const admin = mkAdmin();
    const result = await fetchUserStatsForCaller({
      callerId: "user-1",
      callerSupabase: caller,
      adminSupabase: admin,
    });
    expect(result).toEqual(STATS);
    expect(caller.rpc).not.toHaveBeenCalled();
    expect(admin.rpc).toHaveBeenCalledWith("user_stats", { _user_id: "user-1" });
  });

  it("returns own stats when requestedId equals callerId (still no role check)", async () => {
    const caller = mkCaller(false);
    const admin = mkAdmin();
    await fetchUserStatsForCaller({
      callerId: "user-1",
      requestedId: "user-1",
      callerSupabase: caller,
      adminSupabase: admin,
    });
    expect(caller.rpc).not.toHaveBeenCalled();
  });

  it("forbids a non-admin from fetching another user's stats", async () => {
    const caller = mkCaller(false);
    const admin = mkAdmin();
    await expect(
      fetchUserStatsForCaller({
        callerId: "user-1",
        requestedId: "user-2",
        callerSupabase: caller,
        adminSupabase: admin,
      }),
    ).rejects.toThrow("Forbidden");
    expect(caller.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "user-1",
      _role: "admin",
    });
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("allows an admin to fetch another user's stats", async () => {
    const caller = mkCaller(true);
    const admin = mkAdmin();
    const result = await fetchUserStatsForCaller({
      callerId: "admin-1",
      requestedId: "user-2",
      callerSupabase: caller,
      adminSupabase: admin,
    });
    expect(result).toEqual(STATS);
    expect(caller.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "admin-1",
      _role: "admin",
    });
    expect(admin.rpc).toHaveBeenCalledWith("user_stats", { _user_id: "user-2" });
  });

  it("returns a zeroed shape when the RPC yields no rows", async () => {
    const caller = mkCaller(false);
    const admin = {
      rpc: vi.fn(async () => ({ data: [], error: null })),
    };
    const result = await fetchUserStatsForCaller({
      callerId: "user-1",
      callerSupabase: caller,
      adminSupabase: admin,
    });
    expect(result).toEqual({
      reports_count: 0,
      resolved_count: 0,
      upvotes_received: 0,
      comments_count: 0,
    });
  });

  it("surfaces RPC errors as thrown Errors", async () => {
    const caller = mkCaller(false);
    const admin = {
      rpc: vi.fn(async () => ({ data: null, error: { message: "boom" } })),
    };
    await expect(
      fetchUserStatsForCaller({
        callerId: "user-1",
        callerSupabase: caller,
        adminSupabase: admin,
      }),
    ).rejects.toThrow("boom");
  });
});
