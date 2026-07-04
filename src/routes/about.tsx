import { createFileRoute } from "@tanstack/react-router";
import { PageShell, GlassCard } from "@/components/PageShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CivicPulse" },
      {
        name: "description",
        content:
          "CivicPulse is civic tech built to close the loop between citizens and city government across India.",
      },
      { property: "og:title", content: "About CivicPulse" },
      { property: "og:description", content: "Civic tech for accountability." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell>
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16 space-y-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              About the project
            </span>
          </div>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Civic tech for
            </span>{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              real accountability
            </span>
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Every Indian city has broken streetlights, potholes, and overflowing bins. Most get
            fixed eventually — but with no visibility, no accountability, and no data. CivicPulse
            changes that.
          </p>
        </div>

        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-white">The mission</h2>
          <p className="mt-3 text-slate-400">
            Give citizens a 10-second way to report issues, and give city governments the analytics
            they need to actually close the loop. Every report is public. Every resolution time is
            measured. Every ward gets a scorecard.
          </p>
        </GlassCard>

        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-white">How it works</h2>
          <ol className="mt-4 space-y-3">
            {[
              "A citizen snaps a photo of a problem. GPS is captured automatically.",
              "The report lands on a public India map and dashboard immediately.",
              "City admins assign it to a department and update the status.",
              "The reporter (and the whole city) sees when it's resolved.",
              "Analytics track which wards fix issues fastest — and which don't.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-slate-300">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 text-xs font-bold text-cyan-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </GlassCard>

        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold text-white">Built with</h2>
          <p className="mt-3 text-sm text-slate-400">
            TanStack Start · React 19 · TypeScript · Tailwind · Leaflet · Recharts · Lovable Cloud
            (Postgres + RLS + Storage + Auth).
          </p>
        </GlassCard>
      </main>
    </PageShell>
  );
}
