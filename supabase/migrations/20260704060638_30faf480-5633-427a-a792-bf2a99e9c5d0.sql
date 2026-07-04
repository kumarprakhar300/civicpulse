
-- 1. Hide internal_notes and user_id from anonymous readers of reports via column-level grants
REVOKE SELECT ON public.reports FROM anon;
GRANT SELECT (id, title, description, issue_type, latitude, longitude, photo_url, status, ward, department, upvote_count, created_at, updated_at, resolved_at) ON public.reports TO anon;

-- 2. Restrict user_roles SELECT to the requesting user's own row only.
-- Admins retain full access via the existing "Admins can manage roles" ALL policy.
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. report-photos storage: remove broad public read; require ownership or admin.
-- Public map continues to display photos via short-lived signed URLs minted server-side.
DROP POLICY IF EXISTS "Allow public reads from report-photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read own report-photos" ON storage.objects;

CREATE POLICY "Owners and admins can read report-photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'report-photos'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- 4. Normalize existing photo_url values to storage object paths so signed URLs can be minted.
UPDATE public.reports
SET photo_url = substring(photo_url FROM '/report-photos/(.*)$')
WHERE photo_url LIKE '%/report-photos/%';
