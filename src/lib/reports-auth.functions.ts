import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --- Citizen actions ---

export const toggleVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reportId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("report_votes")
      .select("id")
      .eq("report_id", data.reportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing.data) {
      const { error } = await supabase.from("report_votes").delete().eq("id", existing.data.id);
      if (error) throw error;
      return { voted: false };
    }
    const { error } = await supabase
      .from("report_votes")
      .insert({ report_id: data.reportId, user_id: userId });
    if (error) throw error;
    return { voted: true };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reportId: string; body: string }) => {
    const body = String(d.body || "").trim().slice(0, 1000);
    if (!body) throw new Error("Comment cannot be empty");
    return { reportId: d.reportId, body };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const label = (claims?.email as string | undefined)?.split("@")[0] ?? "citizen";
    const { error } = await supabase
      .from("report_comments")
      .insert({ report_id: data.reportId, user_id: userId, body: data.body, author_label: label });
    if (error) throw error;
    return { ok: true };
  });

export const getMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("id, title, issue_type, status, created_at, resolved_at, upvote_count, photo_url")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const paths = Array.from(
      new Set(
        rows
          .map((r: any) => r.photo_url as string | null)
          .filter((v): v is string => !!v && !/^https?:\/\//i.test(v)),
      ),
    );
    if (paths.length === 0) return rows;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("report-photos")
      .createSignedUrls(paths, 3600);
    const map = new Map<string, string | null>();
    for (const s of signed ?? []) map.set(s.path ?? "", s.signedUrl ?? null);
    return rows.map((r: any) =>
      r.photo_url && !/^https?:\/\//i.test(r.photo_url)
        ? { ...r, photo_url: map.get(r.photo_url) ?? null }
        : r,
    );
  });

export const getMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, message, kind, read_at, created_at, report_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });

export const markAllNotifRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw error;
    return { ok: true };
  });

// Paginated notifications feed (matches MCP list_notifications pagination shape).
export const listMyNotificationsPaged = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; offset?: number; cursor?: string; unreadOnly?: boolean }) =>
    z
      .object({
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).max(10000).optional(),
        cursor: z.string().datetime().optional(),
        unreadOnly: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const pageSize = data.limit ?? 20;
    const skip = data.offset ?? 0;
    let q = context.supabase
      .from("notifications")
      .select("id, kind, message, report_id, created_at, read_at", { count: "exact" })
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (data.unreadOnly) q = q.is("read_at", null);
    if (data.cursor) q = q.lt("created_at", data.cursor);
    q = q.range(skip, skip + pageSize - 1);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    const list = rows ?? [];
    const total = count ?? 0;
    const nextOffset = data.cursor ? null : skip + list.length < total ? skip + list.length : null;
    const nextCursor = list.length === pageSize ? list[list.length - 1]?.created_at ?? null : null;
    return {
      notifications: list,
      page: { limit: pageSize, offset: skip, total, next_offset: nextOffset, next_cursor: nextCursor },
    };
  });

export const markNotifRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// --- Admin actions ---

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden");
}

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminUpdateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      status?: string;
      department?: string | null;
      internal_notes?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: {
      status?: string;
      department?: string | null;
      internal_notes?: string | null;
    } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.department !== undefined) patch.department = data.department;
    if (data.internal_notes !== undefined) patch.internal_notes = data.internal_notes;
    const { error } = await context.supabase
      .from("reports")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminBulkStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[]; status: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("reports")
      .update({ status: data.status })
      .in("id", data.ids);
    if (error) throw error;
    return { ok: true, count: data.ids.length };
  });

export const adminExportCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("reports")
      .select(
        "id, title, issue_type, status, ward, department, latitude, longitude, upvote_count, created_at, resolved_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data ?? [];
    const header = [
      "id",
      "title",
      "issue_type",
      "status",
      "ward",
      "department",
      "latitude",
      "longitude",
      "upvote_count",
      "created_at",
      "resolved_at",
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      header.join(","),
      ...rows.map((r: any) => header.map((h) => esc(r[h])).join(",")),
    ].join("\n");
    return { csv };
  });
