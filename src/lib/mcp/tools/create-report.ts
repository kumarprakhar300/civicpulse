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
  name: "create_report",
  title: "Create civic report",
  description:
    "Submit a new civic issue report (pothole, garbage, streetlight, other) at a given lat/lng on behalf of the signed-in user.",
  inputSchema: {
    title: z.string().min(3).max(200).describe("Short issue title."),
    description: z.string().max(2000).optional().describe("Optional detailed description."),
    issue_type: z
      .enum(["pothole", "garbage", "streetlight", "other"])
      .describe("Issue category."),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    severity: z.number().int().min(1).max(5).optional().describe("Severity 1-5 (default 3)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("reports")
      .insert({
        user_id: ctx.getUserId(),
        title: input.title,
        description: input.description ?? null,
        issue_type: input.issue_type,
        latitude: input.latitude,
        longitude: input.longitude,
        severity: input.severity ?? 3,
      })
      .select("id, title, status, sla_due_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created report ${data.id}` }],
      structuredContent: { report: data },
    };
  },
});
