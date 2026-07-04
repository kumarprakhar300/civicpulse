import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export function PageShell({
  children,
  fullHeight = false,
  contained = true,
}: {
  children: React.ReactNode;
  fullHeight?: boolean;
  contained?: boolean;
}) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div
      className={`relative ${fullHeight ? "flex h-screen flex-col" : "min-h-screen"} overflow-hidden bg-[#030712] text-slate-100 antialiased`}
    >
      <PaymentTestModeBanner />
      {/* Ambient gradient mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-blue-600/25 blur-[140px]" />
        <div className="absolute -right-[10%] top-[20%] h-[50%] w-[50%] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[40%] w-[50%] rounded-full bg-indigo-600/20 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
      </div>

      <header className="relative z-20 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
        <div className={`mx-auto flex ${contained ? "max-w-6xl" : "max-w-7xl"} items-center justify-between px-6 py-4`}>
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.35)] backdrop-blur-md">
              <MapPin className="h-4 w-4 text-cyan-300" />
            </span>
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              CivicPulse
            </span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl md:flex">
            <ShellNavLink to="/map" label="Map" />
            
            <ShellNavLink to="/leaderboard" label="Leaderboard" />
            <ShellNavLink to="/dashboard" label="Dashboard" />
            <ShellNavLink to="/pricing" label="Pricing" />
            <ShellNavLink to="/about" label="About" />
            {email && <ShellNavLink to="/report" label="Report" />}
            {email && <ShellNavLink to="/my-reports" label="My reports" />}
          </nav>
          <div className="flex items-center gap-2">
            {email ? (
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

      {children}
    </div>
  );
}

function ShellNavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full px-4 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
      activeProps={{ className: "rounded-full px-4 py-1.5 text-sm text-white bg-white/10" }}
    >
      {label}
    </Link>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}
