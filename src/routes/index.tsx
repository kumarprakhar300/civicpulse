import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, BarChart3, Users, ArrowRight, Zap, Shield, Bell, Trophy, Sparkles, Clock, CheckCircle2 } from "lucide-react";


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
                Citizen-powered accountability
              </span>
            </div>
            <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
                Your street.
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Your voice.
              </span>
              <br />
              <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
                Your fix.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-slate-400 lg:mx-0 lg:text-lg">
              Snap a photo of any civic issue — potholes, garbage, broken lights — and pin it to a
              live public map. Track every fix from report to resolution. When the data is open,
              accountability follows.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {email ? (
                <Link to="/report">
                  <GradientCTA>Report an issue now <ArrowRight className="h-4 w-4" /></GradientCTA>
                </Link>
              ) : (
                <Link to="/auth">
                  <GradientCTA>Start reporting free <ArrowRight className="h-4 w-4" /></GradientCTA>
                </Link>
              )}
              <Link to="/map">
                <button className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10">
                  Explore the map
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
            Built to drive results
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <TiltCard
            icon={<Camera className="h-5 w-5" />}
            title="Snap & pin"
            body="Point, shoot, submit. Every report lands on the exact spot — no guesswork, no forms."
            hue="from-cyan-500/30 to-blue-600/10"
            ring="border-cyan-400/25"
          />
          <TiltCard
            icon={<MapPin className="h-5 w-5" />}
            title="Spot the hotspots"
            body="See where your city needs attention most. Filter by issue type, status, and date."
            hue="from-emerald-500/30 to-teal-600/10"
            ring="border-emerald-400/25"
          />
          <TiltCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Hold them accountable"
            body="Public resolution times, ward scorecards, and trend data that cannot be ignored."
            hue="from-indigo-500/30 to-purple-600/10"
            ring="border-indigo-400/25"
          />
          <TiltCard
            icon={<Users className="h-5 w-5" />}
            title="Built for everyone"
            body="Citizens report, officials respond, NGOs analyze — all on one transparent platform."
            hue="from-amber-500/30 to-rose-600/10"
            ring="border-amber-400/25"
          />
        </div>
      </section>

      {/* 3D Rotating Cube Showcase */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-fuchsia-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Every angle covered</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">Six faces. One mission.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
            A spinning window into the issues your city faces every day.
          </p>
        </div>
        <RotatingCube />
      </section>

      {/* 3D How-it-works pipeline */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-cyan-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">How it works</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">Three taps to a real fix</span>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3 [perspective:1600px]">
          <StepCube step="01" title="Capture" body="Snap a photo — we auto-tag GPS, ward, and category using AI." icon={<Camera className="h-5 w-5" />} tone="from-cyan-500/40 to-blue-600/10" />
          <StepCube step="02" title="Route" body="Report lands in the right department's queue with SLA timers running." icon={<Zap className="h-5 w-5" />} tone="from-violet-500/40 to-indigo-600/10" />
          <StepCube step="03" title="Resolve" body="You get push updates. Public timeline shows every action taken." icon={<CheckCircle2 className="h-5 w-5" />} tone="from-emerald-500/40 to-teal-600/10" />
        </div>
      </section>

      {/* 3D Stats slab */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="relative [perspective:1400px]">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-indigo-500/20 blur-3xl" />
          <div
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-10 backdrop-blur-2xl"
            style={{ transform: "rotateX(4deg)", transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(125,211,252,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.18) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
              }}
            />
            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4" style={{ transform: "translateZ(40px)" }}>
              <StatBlock value="12,847" label="Issues reported" trend="+24% MoM" color="text-cyan-300" />
              <StatBlock value="8,921" label="Fixes verified" trend="69% resolve rate" color="text-emerald-300" />
              <StatBlock value="4.2 days" label="Avg resolution" trend="↓ 1.8 days YoY" color="text-amber-300" />
              <StatBlock value="142" label="Active wards" trend="Nationwide coverage" color="text-indigo-300" />
            </div>
          </div>
        </div>
      </section>

      {/* More features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">More power under the hood</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <TiltCard icon={<Bell className="h-5 w-5" />} title="Live notifications" body="Push + email updates the moment your report changes status." hue="from-pink-500/30 to-rose-600/10" ring="border-pink-400/25" />
          <TiltCard icon={<Shield className="h-5 w-5" />} title="Verified officials" body="Only authenticated municipal staff can mark issues resolved." hue="from-sky-500/30 to-blue-600/10" ring="border-sky-400/25" />
          <TiltCard icon={<Trophy className="h-5 w-5" />} title="Reporter reputation" body="Earn badges and climb the civic leaderboard for verified reports." hue="from-yellow-500/30 to-orange-600/10" ring="border-yellow-400/25" />
          <TiltCard icon={<Sparkles className="h-5 w-5" />} title="AI triage" body="Smart categorization routes reports to the right department instantly." hue="from-fuchsia-500/30 to-purple-600/10" ring="border-fuchsia-400/25" />
          <TiltCard icon={<Clock className="h-5 w-5" />} title="SLA tracking" body="Every issue gets a resolution deadline. Miss it, everyone sees." hue="from-red-500/30 to-orange-600/10" ring="border-red-400/25" />
          <TiltCard icon={<Zap className="h-5 w-5" />} title="One-tap SOS" body="Urgent hazards? Fire the SOS button for priority escalation." hue="from-cyan-500/30 to-emerald-600/10" ring="border-cyan-400/25" />
        </div>
      </section>

      {/* 3D CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="relative [perspective:1200px]">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-indigo-500/30 blur-3xl" />
          <div
            className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-12 text-center backdrop-blur-2xl"
            style={{ transform: "rotateX(-3deg)", transformStyle: "preserve-3d" }}
          >
            <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[120%] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
            <h3 className="relative text-3xl font-extrabold sm:text-4xl">
              <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">Your city won't fix itself.</span>
            </h3>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-slate-400">Join thousands of citizens turning complaints into results.</p>
            <div className="relative mt-6 flex justify-center">
              <Link to={email ? "/report" : "/auth"}>
                <GradientCTA>Start reporting free <ArrowRight className="h-4 w-4" /></GradientCTA>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Built as a civic tech portfolio project · CivicPulse
      </footer>
    </div>
  );
}

function StepCube({ step, title, body, icon, tone }: { step: string; title: string; body: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="group relative h-full [perspective:1000px]">
      <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${tone} opacity-40 blur-xl transition group-hover:opacity-80`} />
      <div className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-transform duration-500 group-hover:[transform:rotateY(-8deg)_rotateX(4deg)_translateZ(10px)]">
        <div className="flex items-center justify-between">
          <span className="text-4xl font-black text-white/10">{step}</span>
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-gradient-to-br ${tone} text-white shadow-[inset_0_0_14px_rgba(255,255,255,0.2)]`}>
            {icon}
          </div>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
      </div>
    </div>
  );
}

function StatBlock({ value, label, trend, color }: { value: string; label: string; trend: string; color: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className={`text-4xl font-extrabold tracking-tight ${color} drop-shadow-[0_0_20px_currentColor]`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-white/80">{label}</div>
      <div className="mt-0.5 text-xs text-slate-400">{trend}</div>
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
