import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const getPublicReports = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabasePublic = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabasePublic
      .from("reports")
      .select(
        "id, title, issue_type, latitude, longitude, photo_url, status, created_at, description"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
);
