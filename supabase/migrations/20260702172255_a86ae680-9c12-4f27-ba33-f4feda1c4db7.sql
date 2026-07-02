create type public.app_role as enum ('citizen', 'admin', 'ngo_viewer');

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

create table public.reports (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    issue_type text not null check (issue_type in ('pothole', 'garbage', 'streetlight', 'other')),
    latitude double precision not null,
    longitude double precision not null,
    photo_url text,
    status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'rejected')),
    ward text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant select, insert, update, delete on public.reports to authenticated;
grant select on public.reports to anon;
grant all on public.reports to service_role;

alter table public.user_roles enable row level security;
alter table public.reports enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create policy "Users can view all roles"
on public.user_roles for select
to authenticated
using (true);

create policy "Admins can manage roles"
on public.user_roles for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Users can create their own reports"
on public.reports for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can view their own reports"
on public.reports for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own reports"
on public.reports for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Public can view all reports"
on public.reports for select
to anon
using (true);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger update_reports_updated_at
before update on public.reports
for each row execute function public.update_updated_at_column();