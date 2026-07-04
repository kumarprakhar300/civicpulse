
-- 1) Move vector extension out of public
create schema if not exists extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
alter extension vector set schema extensions;

-- 2) Recreate the match function as SECURITY INVOKER (RLS on reports applies to caller)
drop function if exists public.match_nearby_reports(extensions.vector, double precision, double precision, double precision, integer, integer);
drop function if exists public.match_nearby_reports(vector, double precision, double precision, double precision, integer, integer);

create or replace function public.match_nearby_reports(
  query_embedding extensions.vector(1536),
  query_lat double precision,
  query_lng double precision,
  radius_meters double precision default 150,
  max_days integer default 30,
  match_count integer default 5
)
returns table (
  id uuid,
  title text,
  issue_type text,
  status text,
  upvote_count integer,
  created_at timestamptz,
  distance_meters double precision,
  similarity double precision
)
language sql stable security invoker set search_path = public, extensions
as $$
  select
    r.id,
    r.title,
    r.issue_type,
    r.status,
    r.upvote_count,
    r.created_at,
    111320 * sqrt(
      pow(r.latitude - query_lat, 2) +
      pow((r.longitude - query_lng) * cos(radians(query_lat)), 2)
    ) as distance_meters,
    case when r.embedding is null then 0::float
         else 1 - (r.embedding operator(extensions.<=>) query_embedding) end as similarity
  from public.reports r
  where r.created_at > now() - (max_days || ' days')::interval
    and r.status <> 'resolved'
    and 111320 * sqrt(
      pow(r.latitude - query_lat, 2) +
      pow((r.longitude - query_lng) * cos(radians(query_lat)), 2)
    ) <= radius_meters
  order by
    (case when r.embedding is null then 999
          else r.embedding operator(extensions.<=>) query_embedding end) asc,
    distance_meters asc
  limit match_count;
$$;

grant execute on function public.match_nearby_reports(extensions.vector, double precision, double precision, double precision, integer, integer)
  to authenticated, anon;
