import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CivicPulse" },
      {
        name: "description",
        content:
          "CivicPulse is civic tech built to close the loop between citizens and city government.",
      },
      { property: "og:title", content: "About CivicPulse" },
      { property: "og:description", content: "Civic tech for accountability." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <nav className="flex gap-2">
            <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
            <Link to="/contact"><Button variant="ghost" size="sm">Contact</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
        <h1 className="text-4xl font-bold">About CivicPulse</h1>
        <p className="text-lg text-muted-foreground">
          Every city has broken streetlights, potholes, and overflowing bins. Most of them get fixed
          eventually — but with no visibility, no accountability, and no data. CivicPulse changes
          that.
        </p>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">The mission</h2>
          <p>
            Give citizens a 10-second way to report issues, and give city governments the analytics
            they need to actually close the loop. Every report is public. Every resolution time is
            measured. Every ward gets a scorecard.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>A citizen snaps a photo of a problem. GPS is captured automatically.</li>
            <li>The report lands on a public map and dashboard immediately.</li>
            <li>City admins assign it to a department and update the status.</li>
            <li>The reporter (and the whole city) sees when it's resolved.</li>
            <li>Analytics track which wards fix issues fastest — and which don't.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Built with</h2>
          <p className="text-sm text-muted-foreground">
            TanStack Start · React 19 · TypeScript · Tailwind · Leaflet · Recharts · Supabase
            (Postgres + RLS + Storage + Auth).
          </p>
        </section>
      </main>
    </div>
  );
}
