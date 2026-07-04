CREATE OR REPLACE FUNCTION public.log_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_upvote_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;