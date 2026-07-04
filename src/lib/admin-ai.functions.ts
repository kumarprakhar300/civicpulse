import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden");
}

// AI-ranked priority queue: open reports ordered by priority_score desc.
export const getPriorityQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("reports")
      .select(
        "id, title, issue_type, status, ward, department, severity, priority_score, upvote_count, ai_summary, created_at, latitude, longitude, sla_due_at",
      )
      .neq("status", "resolved")
      .order("priority_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Weekly hotspot + trends summary via Lovable AI.
export const getHotspotSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("reports")
      .select(
        "id, title, issue_type, status, ward, department, severity, priority_score, upvote_count, latitude, longitude, created_at",
      )
      .gte("created_at", sinceIso)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) {
      return {
        headline: "No new reports in the last 7 days.",
        key_findings: [],
        hotspots: [],
        recommended_actions: [],
        report_count: 0,
      };
    }
    const { generateHotspotSummary } = await import("./ai.server");
    const summary = await generateHotspotSummary(rows);
    return { ...summary, report_count: rows.length };
  });

// Draft a citizen-facing update for a specific report.
export const draftReportUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reportId: string; tone: "acknowledge" | "in_progress" | "resolved" }) =>
    z
      .object({
        reportId: z.string().uuid(),
        tone: z.enum(["acknowledge", "in_progress", "resolved"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id, user_id, title, issue_type, status, ward, department, internal_notes")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Report not found");
    const { draftCitizenUpdate } = await import("./ai.server");
    const draft = await draftCitizenUpdate({
      title: (report as any).title,
      issue_type: (report as any).issue_type,
      status: (report as any).status,
      department: (report as any).department,
      ward: (report as any).ward,
      internal_notes: (report as any).internal_notes,
      tone: data.tone,
    });
    return draft;
  });

// Send the drafted update to the citizen as an in-app notification.
export const sendReportUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reportId: string; message: string }) =>
    z
      .object({
        reportId: z.string().uuid(),
        message: z.string().min(3).max(1200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id, user_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Report not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin.from("notifications").insert({
      user_id: (report as any).user_id,
      report_id: data.reportId,
      kind: "admin_update",
      message: data.message,
    } as any);
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

// Resolve a report with a "before/after" proof photo (base64 data URL).
export const adminResolveWithProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reportId: string; photoDataUrl: string }) =>
    z
      .object({
        reportId: z.string().uuid(),
        photoDataUrl: z
          .string()
          .startsWith("data:image/", { message: "photoDataUrl must be a data URL" })
          .max(8 * 1024 * 1024),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Decode data URL -> bytes
    const match = data.photoDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data URL");
    const mime = match[1];
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const bytes = Buffer.from(match[2], "base64");
    const path = `resolutions/${data.reportId}-${Date.now()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("report-photos")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { error: updErr } = await context.supabase
      .from("reports")
      .update({ status: "resolved", resolution_photo_url: path } as never)
      .eq("id", data.reportId);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });
