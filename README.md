# CivicPulse

Hyperlocal civic issue reporter with a public accountability dashboard.
Citizens report potholes, garbage piles, and broken streetlights with photo + GPS.
Municipal admins triage and resolve. Anyone can watch resolution times and
hotspots on the public dashboard.

Portfolio B2G SaaS demo — the analytics layer is the pitch to municipal
corporations and NGOs.

> **Live demo:** https://civicproblem.lovable.app

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

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and [Bun](https://bun.sh/)
- A [Lovable Cloud](https://lovable.dev/) project with Supabase connected (provides the database, auth, and storage backend)

## Environment variables

Create a `.env` file in the project root with the following variables. On Lovable Cloud these are injected automatically; locally you need to supply them.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | **Yes** | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Supabase anon / publishable key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service-role key (never expose to client) |
| `VITE_PAYMENTS_CLIENT_TOKEN` | No | Paddle client token for payments |
| `LOVABLE_API_KEY` | No | Lovable AI Gateway key for AI features |

Example `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Security:** Never commit `.env` to Git. It is already ignored via `.gitignore`.

## Setup

1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd civicpulse
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   - Copy the example above into a `.env` file in the project root.
   - Get your Supabase URL and keys from your Lovable Cloud project settings.

4. **Run database migrations**
   - Migrations live in `supabase/migrations/`.
   - Apply them via the Lovable Cloud SQL editor or Supabase CLI.

## Running the app

### Development server

```bash
bun run dev
```

The dev server starts on `http://localhost:8080` by default.

### Production build

```bash
bun run build
```

### Preview production build locally

```bash
bun run preview
```

### Lint & format

```bash
bun run lint       # ESLint
bun run format     # Prettier
```

## Project structure

```text
src/
  routes/          # TanStack Start file-based routes
  components/      # React components (shadcn/ui + custom)
  lib/             # Utilities, server functions, and helpers
  integrations/    # Supabase client, auth middleware, types
  hooks/           # Custom React hooks
  styles.css       # Tailwind CSS entry + theme variables
supabase/migrations/  # Postgres schema & RLS migrations
```

## Routes

- `/` — landing page
- `/auth` — sign in / sign up
- `/map` — public issue map with filters
- `/dashboard` — public accountability analytics
- `/report` — submit a report (auth required)
- `/admin` — status management (admin role required)

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
