import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function pub() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getPublicReports = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await pub()
    .from("reports")
    .select(
      "id, title, issue_type, latitude, longitude, photo_url, status, created_at, description, resolved_at, ward, department, upvote_count",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getPublicReport = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = pub();
    const [report, comments, history] = await Promise.all([
      supabase
        .from("reports")
        .select(
          "id, title, description, issue_type, latitude, longitude, photo_url, status, ward, department, upvote_count, created_at, resolved_at",
        )
        .eq("id", data.id)
        .maybeSingle(),
      supabase
        .from("report_comments")
        .select("id, author_label, body, created_at")
        .eq("report_id", data.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("report_status_history")
        .select("id, from_status, to_status, changed_at")
        .eq("report_id", data.id)
        .order("changed_at", { ascending: true }),
    ]);
    if (report.error) throw report.error;
    return {
      report: report.data,
      comments: comments.data ?? [],
      history: history.data ?? [],
    };
  });
