
-- 1. Restrict anon column access on reports (hide user_id and internal_notes)
REVOKE SELECT ON public.reports FROM anon;
GRANT SELECT (id, title, description, issue_type, latitude, longitude, photo_url, status, ward, department, upvote_count, created_at, resolved_at) ON public.reports TO anon;

-- 2. Drop the broad "Users can view all roles" policy on user_roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- 3. Restrict authenticated reads on report-photos to owner (path prefix = uid)
DROP POLICY IF EXISTS "Allow authenticated reads from report-photos" ON storage.objects;
CREATE POLICY "Owners can read own report-photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Restrict uploads to allowed image MIME types and enforce owner path
DROP POLICY IF EXISTS "Allow authenticated uploads to report-photos" ON storage.objects;
CREATE POLICY "Authenticated users upload own images to report-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/jpeg','image/png','image/webp','image/gif')
);
