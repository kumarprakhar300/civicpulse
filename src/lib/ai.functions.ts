import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// AI analyze: photo (data URL) -> classified title/description/type/severity.
export const analyzeReportPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { photoDataUrl: string; userNote?: string }) =>
    z
      .object({
        photoDataUrl: z
          .string()
          .startsWith("data:image/", { message: "photoDataUrl must be a data URL" })
          .max(8 * 1024 * 1024), // ~8MB base64 cap
        userNote: z.string().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { analyzePhoto } = await import("./ai.server");
    return analyzePhoto(data);
  });

// Find nearby recent duplicates using text embedding + geo radius.
export const findNearbyDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    text: string;
    lat: number;
    lng: number;
    radiusMeters?: number;
  }) =>
    z
      .object({
        text: z.string().min(3).max(2000),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusMeters: z.number().min(20).max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { embedText } = await import("./ai.server");
    const vec = await embedText(data.text);
    const { data: matches, error } = await context.supabase.rpc(
      "match_nearby_reports" as any,
      {
        query_embedding: vec as any,
        query_lat: data.lat,
        query_lng: data.lng,
        radius_meters: data.radiusMeters ?? 150,
        max_days: 30,
        match_count: 5,
      },
    );
    if (error) throw new Error(error.message);
    // Only surface plausible matches
    return (matches ?? []).filter((m: any) => m.similarity >= 0.55 || m.distance_meters <= 50);
  });

// Finalize + insert report: embeds text, computes priority, stores AI fields.
export const submitAiReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    title: string;
    description: string | null;
    issue_type: string;
    latitude: number;
    longitude: number;
    photo_url: string | null;
    severity: number | null;
    ai_summary: string | null;
    ai_categorized: boolean;
  }) =>
    z
      .object({
        title: z.string().min(3).max(200),
        description: z.string().max(2000).nullable(),
        issue_type: z.enum(["pothole", "garbage", "streetlight", "other"]),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        photo_url: z.string().max(500).nullable(),
        severity: z.number().int().min(1).max(5).nullable(),
        ai_summary: z.string().max(500).nullable(),
        ai_categorized: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { embedText, computePriority } = await import("./ai.server");

    const text = [data.title, data.description, data.issue_type]
      .filter(Boolean)
      .join(" — ");
    const embedding = await embedText(text);

    // Duplicate signal for priority scoring
    const { data: matches } = await context.supabase.rpc(
      "match_nearby_reports" as any,
      {
        query_embedding: embedding as any,
        query_lat: data.latitude,
        query_lng: data.longitude,
        radius_meters: 150,
        max_days: 30,
        match_count: 10,
      },
    );
    const dupCount = matches?.length ?? 0;
    const dupSignal = (matches ?? []).reduce((s: number, m: any) => s + (m.upvote_count ?? 0), 0);
    const priority = computePriority({
      severity: data.severity ?? 3,
      duplicateSignal: dupSignal,
      duplicateCount: dupCount,
    });

    const { data: inserted, error } = await context.supabase
      .from("reports")
      .insert({
        user_id: context.userId,
        title: data.title,
        description: data.description,
        issue_type: data.issue_type,
        latitude: data.latitude,
        longitude: data.longitude,
        photo_url: data.photo_url,
        severity: data.severity,
        ai_summary: data.ai_summary,
        ai_categorized: data.ai_categorized,
        priority_score: priority,
        embedding: embedding as any,
      } as any)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: (inserted as any).id, priority_score: priority, duplicate_count: dupCount };
  });
