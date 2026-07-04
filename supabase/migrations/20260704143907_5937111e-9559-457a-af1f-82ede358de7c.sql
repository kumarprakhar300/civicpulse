
create extension if not exists vector;

alter table public.reports
  add column if not exists severity smallint check (severity between 1 and 5),
  add column if not exists ai_summary text,
  add column if not exists ai_categorized boolean not null default false,
  add column if not exists priority_score double precision not null default 0,
  add column if not exists embedding vector(1536);

create index if not exists reports_embedding_idx
  on public.reports using hnsw (embedding vector_cosine_ops);

create index if not exists reports_priority_idx
  on public.reports (priority_score desc);

-- Find recent, similar, nearby reports (used at submit-time to prevent duplicates).
create or replace function public.match_nearby_reports(
  query_embedding vector(1536),
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
language sql stable security definer set search_path = public
as $$
  select
    r.id,
    r.title,
    r.issue_type,
    r.status,
    r.upvote_count,
    r.created_at,
    -- Approx meters via equirectangular projection (fine for <1km).
    111320 * sqrt(
      pow(r.latitude - query_lat, 2) +
      pow((r.longitude - query_lng) * cos(radians(query_lat)), 2)
    ) as distance_meters,
    case when r.embedding is null then 0::float
         else 1 - (r.embedding <=> query_embedding) end as similarity
  from public.reports r
  where r.created_at > now() - (max_days || ' days')::interval
    and r.status <> 'resolved'
    and 111320 * sqrt(
      pow(r.latitude - query_lat, 2) +
      pow((r.longitude - query_lng) * cos(radians(query_lat)), 2)
    ) <= radius_meters
  order by
    (case when r.embedding is null then 999
          else r.embedding <=> query_embedding end) asc,
    distance_meters asc
  limit match_count;
$$;

grant execute on function public.match_nearby_reports(vector, double precision, double precision, double precision, integer, integer)
  to authenticated, anon;
