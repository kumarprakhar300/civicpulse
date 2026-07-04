import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function pub() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// Mint short-lived signed URLs for private report-photos paths.
// Accepts full URLs (legacy) untouched.
async function signPhotoUrls<T extends { photo_url?: string | null }>(
  rows: T[],
): Promise<T[]> {
  const paths = Array.from(
    new Set(
      rows
        .map((r) => r.photo_url)
        .filter((v): v is string => !!v && !/^https?:\/\//i.test(v)),
    ),
  );
  if (paths.length === 0) return rows;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("report-photos")
    .createSignedUrls(paths, 3600);
  if (error || !data) return rows.map((r) => ({ ...r, photo_url: null }));
  const map = new Map<string, string | null>();
  for (const item of data) map.set(item.path ?? "", item.signedUrl ?? null);
  return rows.map((r) =>
    r.photo_url && !/^https?:\/\//i.test(r.photo_url)
      ? { ...r, photo_url: map.get(r.photo_url) ?? null }
      : r,
  );
}

export const getPublicReports = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await pub()
    .from("reports")
    .select(
      "id, title, issue_type, latitude, longitude, photo_url, status, created_at, description, resolved_at, ward, department, upvote_count, sla_due_at, sla_hours, severity, priority_score",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return await signPhotoUrls(data ?? []);
});

// Sign a bucket path (returns null if not a bucket path).
async function signPath(path: string | null | undefined): Promise<string | null> {
  if (!path || /^https?:\/\//i.test(path)) return path ?? null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("report-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export const getPublicReport = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = pub();
    const [report, comments, history] = await Promise.all([
      supabase
        .from("reports")
        .select(
          "id, title, description, issue_type, latitude, longitude, photo_url, status, ward, department, upvote_count, created_at, resolved_at, sla_due_at, sla_hours, severity, resolution_photo_url",
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
    const [signed] = report.data ? await signPhotoUrls([report.data]) : [null];
    const resolutionSigned = report.data
      ? await signPath((report.data as any).resolution_photo_url)
      : null;
    return {
      report: signed
        ? { ...(signed as any), resolution_photo_url: resolutionSigned }
        : null,
      comments: comments.data ?? [],
      history: history.data ?? [],
    };
  });
