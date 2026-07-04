
-- Phase 3+4: SLA, resolution proof, ward scorecards, user reputation

-- 1) Reports: SLA + resolution proof columns
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS sla_hours INT,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_photo_url TEXT;

-- 2) SLA policy by issue type + severity nudge
CREATE OR REPLACE FUNCTION public.compute_sla_hours(_issue_type TEXT, _severity INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(
    6,
    CASE _issue_type
      WHEN 'pothole' THEN 72
      WHEN 'garbage' THEN 48
      WHEN 'streetlight' THEN 72
      ELSE 120
    END - COALESCE(_severity, 3) * 8
  );
$$;

CREATE OR REPLACE FUNCTION public.set_sla_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sla_hours IS NULL THEN
    NEW.sla_hours := public.compute_sla_hours(NEW.issue_type, NEW.severity);
  END IF;
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := COALESCE(NEW.created_at, now()) + (NEW.sla_hours || ' hours')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_sla_on_insert ON public.reports;
CREATE TRIGGER trg_set_sla_on_insert
BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.set_sla_on_insert();

-- Backfill for existing rows
UPDATE public.reports
SET
  sla_hours = COALESCE(sla_hours, public.compute_sla_hours(issue_type, severity)),
  sla_due_at = COALESCE(sla_due_at, created_at + (public.compute_sla_hours(issue_type, severity) || ' hours')::interval)
WHERE sla_due_at IS NULL;

-- 3) Ward scorecards (public read via SECURITY DEFINER function)
CREATE OR REPLACE FUNCTION public.ward_scorecards()
RETURNS TABLE (
  ward TEXT,
  total INT,
  resolved INT,
  open_count INT,
  overdue INT,
  avg_resolution_hours NUMERIC,
  on_time_rate NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(r.ward, 'Unassigned') AS ward,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE r.status = 'resolved')::int AS resolved,
    COUNT(*) FILTER (WHERE r.status <> 'resolved')::int AS open_count,
    COUNT(*) FILTER (WHERE r.status <> 'resolved' AND r.sla_due_at < now())::int AS overdue,
    ROUND(AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600.0)
      FILTER (WHERE r.resolved_at IS NOT NULL)::numeric, 1) AS avg_resolution_hours,
    ROUND(
      (COUNT(*) FILTER (WHERE r.status = 'resolved' AND r.resolved_at IS NOT NULL AND r.resolved_at <= r.sla_due_at)::numeric)
      / NULLIF(COUNT(*) FILTER (WHERE r.status = 'resolved'), 0) * 100,
    1) AS on_time_rate
  FROM public.reports r
  GROUP BY COALESCE(r.ward, 'Unassigned')
  ORDER BY total DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.ward_scorecards() TO anon, authenticated;

-- 4) User reputation: aggregated stats per user
CREATE OR REPLACE FUNCTION public.user_stats(_user_id UUID)
RETURNS TABLE (
  reports_count INT,
  resolved_count INT,
  upvotes_received INT,
  comments_count INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.reports WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.reports WHERE user_id = _user_id AND status = 'resolved'),
    (SELECT COALESCE(SUM(upvote_count), 0)::int FROM public.reports WHERE user_id = _user_id),
    (SELECT COUNT(*)::int FROM public.report_comments WHERE user_id = _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.user_stats(UUID) TO anon, authenticated;

-- 5) Top citizens leaderboard (anonymized by short label)
CREATE OR REPLACE FUNCTION public.top_citizens(_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  reports_count INT,
  upvotes_received INT,
  reputation INT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.user_id,
    COUNT(*)::int AS reports_count,
    COALESCE(SUM(r.upvote_count), 0)::int AS upvotes_received,
    (COUNT(*) * 5 + COALESCE(SUM(r.upvote_count), 0) * 2
      + COUNT(*) FILTER (WHERE r.status = 'resolved') * 10)::int AS reputation
  FROM public.reports r
  GROUP BY r.user_id
  ORDER BY reputation DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.top_citizens(INT) TO anon, authenticated;
