import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export const getTopCitizens = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb.rpc("top_citizens" as any, { _limit: 10 });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    user_id: string;
    reports_count: number;
    upvotes_received: number;
    reputation: number;
  }>;
});

export const getUserStats = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: rows, error } = await sb.rpc("user_stats" as any, { _user_id: data.userId });
    if (error) throw new Error(error.message);
    const s = (rows ?? [])[0] ?? {
      reports_count: 0,
      resolved_count: 0,
      upvotes_received: 0,
      comments_count: 0,
    };
    return s as {
      reports_count: number;
      resolved_count: number;
      upvotes_received: number;
      comments_count: number;
    };
  });
