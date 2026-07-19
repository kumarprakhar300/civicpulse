import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_unread_notifications",
  title: "List unread notifications",
  description:
    "List in-app notifications for the signed-in user that have not been marked as read. Supports pagination via `limit` and `offset`, or `cursor` (ISO timestamp of the last item's created_at) to fetch older pages.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max notifications per page (default 20)."),
    offset: z.number().int().min(0).max(10000).optional().describe("Rows to skip from the start (default 0)."),
    cursor: z
      .string()
      .datetime()
      .optional()
      .describe("ISO timestamp; returns unread notifications older than this (use last item's created_at)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset, cursor }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const pageSize = limit ?? 20;
    const skip = offset ?? 0;
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("notifications")
      .select("id, kind, message, report_id, created_at", { count: "exact" })
      .eq("user_id", ctx.getUserId())
      .is("read_at", null)
      .order("created_at", { ascending: false });
    if (cursor) q = q.lt("created_at", cursor);
    q = q.range(skip, skip + pageSize - 1);
    const { data, error, count } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const total = count ?? 0;
    const nextOffset = cursor ? null : skip + rows.length < total ? skip + rows.length : null;
    const nextCursor = rows.length === pageSize ? rows[rows.length - 1]?.created_at ?? null : null;
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: {
        notifications: rows,
        unread_total: total,
        page: { limit: pageSize, offset: skip, next_offset: nextOffset, next_cursor: nextCursor },
      },
    };
  },
});
