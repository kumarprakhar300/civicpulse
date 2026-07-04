
-- 1) reports: revoke sensitive columns from anon/authenticated; grant safe columns only
REVOKE SELECT ON public.reports FROM anon, authenticated;
GRANT SELECT (id, title, description, issue_type, latitude, longitude, photo_url, status, ward, department, upvote_count, created_at, resolved_at) ON public.reports TO anon;
GRANT SELECT (id, title, description, issue_type, latitude, longitude, photo_url, status, ward, department, upvote_count, created_at, resolved_at, user_id) ON public.reports TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reports TO authenticated;
-- Admins need full column visibility (including internal_notes, user_id) — handled via has_role checks in app + service_role
GRANT ALL ON public.reports TO service_role;

-- 2) report_status_history: restrict SELECT to report owner and admins
DROP POLICY IF EXISTS "Anyone can view status history" ON public.report_status_history;
CREATE POLICY "Owners and admins can view status history"
  ON public.report_status_history
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_status_history.report_id
        AND r.user_id = auth.uid()
    )
  );

-- 3) storage.objects: replace folder-name check with reports-table ownership verification
DROP POLICY IF EXISTS "Owners and admins can read report-photos" ON storage.objects;
CREATE POLICY "Owners and admins can read report-photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.user_id = auth.uid()
          AND r.photo_url = storage.objects.name
      )
    )
  );
