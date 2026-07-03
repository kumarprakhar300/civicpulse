
-- 1. Extend reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0;

-- 2. Votes
CREATE TABLE IF NOT EXISTS public.report_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, user_id)
);
GRANT SELECT ON public.report_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.report_votes TO authenticated;
GRANT ALL ON public.report_votes TO service_role;
ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view votes" ON public.report_votes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can add their own vote" ON public.report_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own vote" ON public.report_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_upvote_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reports SET upvote_count = upvote_count + 1 WHERE id = NEW.report_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.reports SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.report_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_upvote_count ON public.report_votes;
CREATE TRIGGER trg_sync_upvote_count AFTER INSERT OR DELETE ON public.report_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_upvote_count();

-- 3. Comments
CREATE TABLE IF NOT EXISTS public.report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_label text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.report_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.report_comments TO authenticated;
GRANT ALL ON public.report_comments TO service_role;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.report_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users add their own comment" ON public.report_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comment or admin" ON public.report_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Status history
CREATE TABLE IF NOT EXISTS public.report_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.report_status_history TO anon;
GRANT SELECT ON public.report_status_history TO authenticated;
GRANT ALL ON public.report_status_history TO service_role;
ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view status history" ON public.report_status_history FOR SELECT TO anon, authenticated USING (true);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.report_status_history (report_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.user_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.report_status_history (report_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    INSERT INTO public.notifications (user_id, report_id, kind, message)
    VALUES (NEW.user_id, NEW.id, 'status_change',
      'Your report "' || NEW.title || '" is now ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_log_status_insert ON public.reports;
DROP TRIGGER IF EXISTS trg_log_status_update ON public.reports;
CREATE TRIGGER trg_log_status_insert AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();
CREATE TRIGGER trg_log_status_update AFTER UPDATE OF status ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

-- 6. Seed 30 demo reports
DO $$
DECLARE
  demo_user uuid;
  city_names text[] := ARRAY['New York','San Francisco','London','Berlin','Mumbai','Delhi','Bangalore','Sydney','Toronto','Tokyo'];
  city_lats float[] := ARRAY[40.7128,37.7749,51.5074,52.5200,19.0760,28.6139,12.9716,-33.8688,43.6532,35.6762];
  city_lngs float[] := ARRAY[-74.0060,-122.4194,-0.1278,13.4050,72.8777,77.2090,77.5946,151.2093,-79.3832,139.6503];
  issue_types text[] := ARRAY['pothole','garbage','streetlight','other'];
  statuses text[] := ARRAY['open','open','open','in_progress','resolved','resolved'];
  titles text[] := ARRAY[
    'Deep pothole near intersection','Overflowing trash bin','Streetlight out for a week',
    'Cracked pavement','Illegal dumping','Broken traffic signal',
    'Water leak from main','Fallen tree branch','Graffiti on public wall','Damaged bus stop'
  ];
  i int; ci int; it text; st text; ttl text; created timestamptz;
BEGIN
  SELECT user_id INTO demo_user FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF demo_user IS NULL THEN SELECT id INTO demo_user FROM auth.users LIMIT 1; END IF;
  IF demo_user IS NULL THEN RETURN; END IF;

  FOR i IN 1..30 LOOP
    ci := (i % 10) + 1;
    it := issue_types[(i % 4) + 1];
    st := statuses[(i % 6) + 1];
    ttl := titles[(i % 10) + 1];
    created := now() - ((i * 2 + (random() * 5)::int) || ' days')::interval;

    INSERT INTO public.reports (user_id, title, description, issue_type, latitude, longitude, status, ward, department, created_at, updated_at, resolved_at)
    VALUES (
      demo_user, ttl,
      'Demo report seeded to showcase CivicPulse analytics. Location approximate.',
      it,
      city_lats[ci] + (random() - 0.5) * 0.04,
      city_lngs[ci] + (random() - 0.5) * 0.04,
      st,
      'Ward ' || ((i % 8) + 1),
      CASE it WHEN 'pothole' THEN 'roads' WHEN 'garbage' THEN 'sanitation' WHEN 'streetlight' THEN 'electricity' ELSE 'general' END,
      created, created,
      CASE WHEN st = 'resolved' THEN created + ((3 + random()*10)::int || ' days')::interval ELSE NULL END
    );
  END LOOP;
END;
$$;
