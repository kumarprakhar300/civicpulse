import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, BarChart3, Users, ArrowRight, Zap } from "lucide-react";

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
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100 antialiased">
      {/* Ambient gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-blue-600/25 blur-[140px]" />
        <div className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[40%] w-[50%] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
      </div>

      {/* Nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.35)] backdrop-blur-md">
              <MapPin className="h-4 w-4 text-cyan-300" />
            </span>
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              CivicPulse
            </span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl md:flex">
            <NavLink to="/map" label="Map" />
            
            <NavLink to="/leaderboard" label="Leaderboard" />
            <NavLink to="/dashboard" label="Dashboard" />
            <NavLink to="/pricing" label="Pricing" />
            <NavLink to="/about" label="About" />
          </nav>
          <div className="flex items-center gap-2">
            {email ? (
              <>
                <Link to="/report" className="hidden sm:block">
                  <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">Report</Button>
                </Link>
                <Link to="/my-reports" className="hidden sm:block">
                  <Button size="sm" variant="ghost" className="text-slate-300 hover:bg-white/10 hover:text-white">My reports</Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="rounded-full bg-white text-slate-950 hover:bg-white/90">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                Live civic intelligence
              </span>
            </div>
            <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
                See it.
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Report it.
              </span>
              <br />
              <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
                Fix it.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-slate-400 lg:mx-0 lg:text-lg">
              Snap a photo. We tag the location. Your city sees it. Everyone sees who's fixing what —
              and who isn't. Open data, real accountability.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {email ? (
                <Link to="/report">
                  <GradientCTA>Report an issue <ArrowRight className="h-4 w-4" /></GradientCTA>
                </Link>
              ) : (
                <Link to="/auth">
                  <GradientCTA>Get started free <ArrowRight className="h-4 w-4" /></GradientCTA>
                </Link>
              )}
              <Link to="/map">
                <button className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10">
                  View public map
                </button>
              </Link>
            </div>
          </div>

          {/* 3D Hero Artifact */}
          <Hero3D />
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
            Core capabilities
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <TiltCard
            icon={<Camera className="h-5 w-5" />}
            title="Photo + GPS"
            body="Point, shoot, submit. Auto-tagged with your exact coordinates."
            hue="from-cyan-500/30 to-blue-600/10"
            ring="border-cyan-400/25"
          />
          <TiltCard
            icon={<MapPin className="h-5 w-5" />}
            title="Live heatmap"
            body="Problem hotspots across every ward. Filter by type, status, date."
            hue="from-emerald-500/30 to-teal-600/10"
            ring="border-emerald-400/25"
          />
          <TiltCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Analytics"
            body="Median resolution time, trending types, ward-level scorecards."
            hue="from-indigo-500/30 to-purple-600/10"
            ring="border-indigo-400/25"
          />
          <TiltCard
            icon={<Users className="h-5 w-5" />}
            title="Role-based"
            body="Citizens report. Admins resolve. NGOs analyze. One dashboard."
            hue="from-amber-500/30 to-rose-600/10"
            ring="border-amber-400/25"
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Built as a civic tech portfolio project · CivicPulse
      </footer>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full px-4 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </Link>
  );
}

function GradientCTA({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl p-[1.5px]">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
      <div className="absolute inset-0 opacity-0 blur-xl transition group-hover:opacity-60 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
      <div className="relative flex items-center gap-2 rounded-[14px] bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition group-hover:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

function Hero3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 18, y: -14 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: 18 - py * 20, y: -14 + px * 24 });
  };

  const reset = () => setTilt({ x: 18, y: -14 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="relative mx-auto h-[420px] w-full max-w-md [perspective:1400px] sm:h-[480px]"
    >
      {/* Glow bed */}
      <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-cyan-500/30 via-blue-500/20 to-indigo-500/30 blur-3xl" />

      {/* Main glass slab */}
      <div
        className="relative h-full w-full rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/[0.09] to-white/[0.02] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Grid floor */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[2rem] opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.25) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "linear-gradient(180deg, transparent 0%, black 30%, black 100%)",
          }}
        />

        {/* Header row */}
        <div className="relative flex items-start justify-between p-6" style={{ transform: "translateZ(40px)" }}>
          <div className="space-y-2">
            <div className="h-2 w-16 rounded-full bg-white/25" />
            <div className="h-2 w-10 rounded-full bg-white/10" />
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
            <Zap className="h-4 w-4 text-cyan-300" />
          </div>
        </div>

        {/* Floating report pins */}
        <Pin className="left-[22%] top-[38%]" color="bg-cyan-400" delay="0s" z={90} />
        <Pin className="left-[58%] top-[30%]" color="bg-emerald-400" delay="0.6s" z={110} />
        <Pin className="left-[42%] top-[58%]" color="bg-amber-400" delay="1.2s" z={80} />
        <Pin className="left-[70%] top-[62%]" color="bg-indigo-400" delay="0.3s" z={100} />

        {/* Floating stat card */}
        <div
          className="absolute right-4 top-24 w-40 rounded-2xl border border-white/20 bg-slate-900/70 p-3 shadow-2xl backdrop-blur-2xl"
          style={{ transform: "translateZ(80px)" }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">Resolved</div>
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">1,284</div>
          <div className="mt-1 text-[10px] text-emerald-400">▲ 18.4% this week</div>
        </div>

        {/* Floating bar chart card */}
        <div
          className="absolute bottom-6 left-6 flex h-24 w-44 items-end gap-1.5 rounded-2xl border border-white/15 bg-slate-900/60 p-3 backdrop-blur-2xl"
          style={{ transform: "translateZ(60px)" }}
        >
          {[40, 65, 55, 80, 45, 90, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-blue-500/60 to-cyan-300/80"
              style={{ height: `${h}%`, animation: `barPulse 2.4s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>

        {/* Corner glow */}
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-cyan-500/30 blur-3xl" />
      </div>

      <style>{`
        @keyframes barPulse {
          0%, 100% { opacity: 0.7; transform: scaleY(1); transform-origin: bottom; }
          50% { opacity: 1; transform: scaleY(1.15); transform-origin: bottom; }
        }
        @keyframes pinFloat {
          0%, 100% { transform: translateY(0) translateZ(var(--z,80px)); }
          50% { transform: translateY(-8px) translateZ(var(--z,80px)); }
        }
      `}</style>
    </div>
  );
}

function Pin({
  className,
  color,
  delay,
  z,
}: {
  className?: string;
  color: string;
  delay: string;
  z: number;
}) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        // @ts-expect-error css var
        "--z": `${z}px`,
        transform: `translateZ(${z}px)`,
        animation: `pinFloat 3.2s ease-in-out ${delay} infinite`,
      }}
    >
      <div className="relative">
        <div className={`h-3 w-3 rounded-full ${color} shadow-[0_0_18px_currentColor]`} />
        <div className={`absolute inset-0 h-3 w-3 animate-ping rounded-full ${color} opacity-40`} />
      </div>
    </div>
  );
}

function TiltCard({
  icon,
  title,
  body,
  hue,
  ring,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  hue: string;
  ring: string;
}) {
  return (
    <div className="group relative [perspective:1000px]">
      <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${hue} opacity-40 blur-xl transition group-hover:opacity-70`} />
      <div className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-transform duration-500 ease-out will-change-transform group-hover:[transform:rotateX(6deg)_rotateY(-4deg)_translateY(-4px)]">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${ring} bg-gradient-to-br ${hue} text-white shadow-[inset_0_0_14px_rgba(255,255,255,0.15)]`}>
          {icon}
        </div>
        <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
      </div>
    </div>
  );
}
