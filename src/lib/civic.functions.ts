import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function pub() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getWardScorecards = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await pub().rpc("ward_scorecards" as any);
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
  const { data, error } = await pub().rpc("top_citizens" as any, { _limit: 10 });
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
    const { data: rows, error } = await pub().rpc("user_stats" as any, { _user_id: data.userId });
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
