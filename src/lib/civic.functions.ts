import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

// These analytics helpers wrap SECURITY DEFINER RPCs that are no longer
// callable by anon/authenticated roles. We invoke them through the trusted
// service-role client on the server so the aggregates stay available to
// public pages without exposing the underlying RPCs to end users.
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getWardScorecards = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb.rpc("ward_scorecards" as any);
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    ward: string;
    total: number;
    resolved: number;
    open_count: number;
    overdue: number;
    avg_resolution_hours: number | null;
    on_time_rate: number | null;
  }>;
});

// Public leaderboard. Do NOT return raw user_id — expose a stable, non-identifying
// pseudonym derived from a one-way hash so anonymous visitors can't enumerate
// real account IDs from the top-citizens list.
export const getTopCitizens = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb.rpc("top_citizens" as any, { _limit: 10 });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    user_id: string;
    reports_count: number;
    upvotes_received: number;
    reputation: number;
  }>;
  return rows.map((r, i) => ({
    rank: i + 1,
    citizen_label: `Citizen #${createHash("sha256").update(r.user_id).digest("hex").slice(0, 8)}`,
    reports_count: r.reports_count,
    upvotes_received: r.upvotes_received,
    reputation: r.reputation,
  }));
});

export type UserStats = {
  reports_count: number;
  resolved_count: number;
  upvotes_received: number;
  comments_count: number;
};

// Extracted so it can be integration-tested without going through the
// createServerFn RPC wrapper. Authorization + data fetching lives here;
// the server fn is a thin binding over auth-middleware context.
export async function fetchUserStatsForCaller(opts: {
  callerId: string;
  requestedId?: string;
  callerSupabase: { rpc: (fn: string, args: any) => Promise<{ data: any; error: any }> };
  adminSupabase: { rpc: (fn: string, args: any) => Promise<{ data: any; error: any }> };
}): Promise<UserStats> {
  const requestedId = opts.requestedId ?? opts.callerId;
  if (requestedId !== opts.callerId) {
    const { data: isAdmin } = await opts.callerSupabase.rpc("has_role", {
      _user_id: opts.callerId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
  }
  const { data: rows, error } = await opts.adminSupabase.rpc("user_stats", { _user_id: requestedId });
  if (error) throw new Error(error.message);
  return ((rows ?? [])[0] ?? {
    reports_count: 0,
    resolved_count: 0,
    upvotes_received: 0,
    comments_count: 0,
  }) as UserStats;
}

// User stats require authentication. A user may only fetch their own stats;
// admins may fetch any user's stats.
export const getUserStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const sb = await admin();
    return fetchUserStatsForCaller({
      callerId: context.userId,
      requestedId: data.userId,
      callerSupabase: context.supabase as any,
      adminSupabase: sb as any,
    });
  });

