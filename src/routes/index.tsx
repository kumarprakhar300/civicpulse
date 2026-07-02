import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, BarChart3, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicPulse — Report civic issues, see change happen" },
      {
        name: "description",
        content:
          "Snap a photo of a pothole, garbage pile, or broken streetlight. Track resolution in real-time. Public dashboards hold cities accountable.",
      },
      { property: "og:title", content: "CivicPulse — Hyperlocal civic issue reporter" },
      {
        property: "og:description",
        content:
          "Citizens report issues with photos + GPS. Municipalities and NGOs see analytics that drive faster fixes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <nav className="flex items-center gap-3">
            {email ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
                <Link to="/report">
                  <Button variant="ghost" size="sm">Report</Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Civic tech for cleaner, safer neighborhoods
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
          See a problem?<br />
          <span className="text-primary">Report it in 10 seconds.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Snap a photo. We tag the location. Your city sees it. Everyone sees who's fixing what — and
          who isn't. Open data, real accountability.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {email ? (
            <Link to="/report">
              <Button size="lg" className="gap-2">
                Report an issue <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link to="/map">
            <Button size="lg" variant="outline">
              View public map
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Camera className="h-5 w-5" />}
            title="Photo + GPS reports"
            body="Point, shoot, submit. Auto-tagged with your exact location and issue type."
          />
          <FeatureCard
            icon={<MapPin className="h-5 w-5" />}
            title="Live heatmap"
            body="See problem hotspots across every ward. Filter by type, status, and date."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Accountability analytics"
            body="Median resolution times, trending issue types, ward-level scorecards."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Role-based access"
            body="Citizens report. Admins resolve. NGOs analyze. All in one dashboard."
          />
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Built as a civic tech portfolio project · Day 1 of 5
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-6">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
