
-- 1. Column-level restrict anon SELECT on reports (hide user_id, internal_notes, ai_summary, embedding)
REVOKE SELECT ON public.reports FROM anon;
GRANT SELECT (
  id, title, description, issue_type, latitude, longitude, photo_url,
  status, ward, created_at, updated_at, resolved_at, department,
  upvote_count, severity, ai_categorized, priority_score,
  sla_hours, sla_due_at, resolution_photo_url
) ON public.reports TO anon;

-- 2. Restrict EXECUTE on SECURITY DEFINER analytics functions.
--    Server code will call them via the service_role client instead.
REVOKE EXECUTE ON FUNCTION public.ward_scorecards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.top_citizens(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ward_scorecards() TO service_role;
GRANT EXECUTE ON FUNCTION public.top_citizens(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_stats(uuid) TO service_role;
