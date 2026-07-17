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
  name: "mark_notification_read",
  title: "Mark notification(s) as read",
  description:
    "Mark one or more notifications as read for the signed-in user. Pass an array of notification IDs, or set all=true to mark every unread notification as read.",
  inputSchema: {
    ids: z.array(z.string().uuid()).optional().describe("Notification UUIDs to mark read."),
    all: z.boolean().optional().describe("If true, mark all unread notifications as read."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ ids, all }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!all && (!ids || ids.length === 0)) {
      return {
        content: [{ type: "text", text: "Provide `ids` or set `all` to true." }],
        isError: true,
      };
    }
    const sb = supabaseForUser(ctx);
    let query = sb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", ctx.getUserId())
      .is("read_at", null);
    if (!all && ids) query = query.in("id", ids);
    const { data, error } = await query.select("id");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const count = data?.length ?? 0;
    return {
      content: [{ type: "text", text: `Marked ${count} notification(s) as read.` }],
      structuredContent: { updated: count, ids: data?.map((r) => r.id) ?? [] },
    };
  },
});
