# CivicPulse

Hyperlocal civic issue reporter with a public accountability dashboard.
Citizens report potholes, garbage piles, and broken streetlights with photo + GPS.
Municipal admins triage and resolve. Anyone can watch resolution times and
hotspots on the public dashboard.

Portfolio B2G SaaS demo — the analytics layer is the pitch to municipal
corporations and NGOs.

## Features

- Email + Google auth
- Photo + GPS issue submission (`navigator.geolocation`, Supabase Storage)
- Public interactive map (Leaflet + OpenStreetMap) with issue-type filters
- Public analytics dashboard: KPI cards, hotspot heatmap (leaflet.heat),
  status pie, type bar chart, daily trend line (Recharts)
- Role-based admin panel (citizen / admin / ngo_viewer via `app_role` enum
  and a separate `user_roles` table — never on the profile row, to avoid
  privilege-escalation)
- Row Level Security on every table + a `SECURITY DEFINER has_role()` helper
  for non-recursive policy checks

## Tech stack

- **TanStack Start v1** — file-based routing, server functions, SSR
- **React 19** + **TypeScript** (strict)
- **Vite 7** + **Tailwind CSS v4**
- **shadcn/ui** components
- **Lovable Cloud** (Supabase under the hood — Auth, Postgres, Storage)
- **Leaflet** + **leaflet.heat** for maps & hotspots
- **Recharts** for analytics
- **TanStack Query** for data fetching

## Granting yourself admin

Roles live in `public.user_roles`. After signing up, run this SQL in the
database (Lovable Cloud → Database → SQL editor), replacing the email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'you@example.com';
```

Then reload `/admin`.

## Routes

- `/` — landing page
- `/auth` — sign in / sign up
- `/map` — public issue map with filters
- `/dashboard` — public accountability analytics
- `/report` — submit a report (auth required)
- `/admin` — status management (admin role required)
