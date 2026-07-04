
-- Add paid role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'city_ngo_admin';

-- Internal alerts (visible only to service role / admins) for team notifications
CREATE TABLE public.internal_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  user_id uuid,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.internal_alerts TO authenticated;
GRANT ALL ON public.internal_alerts TO service_role;

ALTER TABLE public.internal_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view internal alerts"
  ON public.internal_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
