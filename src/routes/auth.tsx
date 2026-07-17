import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, Loader2, Shield, Zap, Radio } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : "",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CivicPulse" },
      { name: "description", content: "Sign in or create a CivicPulse account to report civic issues across India." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    if (next) {
      window.location.href = next;
    } else {
      navigate({ to: "/" });
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    goNext();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const emailRedirectTo = next
      ? `${window.location.origin}${next}`
      : window.location.origin;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Check your email if confirmation is required.");
    goNext();
  }

  async function handleGoogle() {
    setLoading(true);
    const redirect_uri = next
      ? `${window.location.origin}${next}`
      : window.location.origin;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri });
    if (result.error) {
      setLoading(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    goNext();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712] text-slate-100 antialiased">
      {/* Ambient mesh */}
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

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-2">
        {/* Left: brand storytelling */}
        <aside className="hidden lg:block">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.35)] backdrop-blur-md">
              <MapPin className="h-4 w-4 text-cyan-300" />
            </span>
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              CivicPulse
            </span>
          </Link>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
              Live civic intelligence · India
            </span>
          </div>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Your city,
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              on the record.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-400">
            Sign in to report issues, upvote what matters near you, and watch resolution unfold in
            real time on the India live map.
          </p>

          <ul className="mt-8 space-y-3">
            <Perk icon={<Radio className="h-3.5 w-3.5" />} text="Real-time reports · India-only feed" />
            <Perk icon={<Zap className="h-3.5 w-3.5" />} text="Auto-tagged with GPS in one tap" />
            <Perk icon={<Shield className="h-3.5 w-3.5" />} text="RLS-protected, own only your reports" />
          </ul>

          <Hologram />
        </aside>

        {/* Right: auth panel */}
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 font-bold text-lg lg:hidden"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
              <MapPin className="h-4 w-4 text-cyan-300" />
            </span>
            <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              CivicPulse
            </span>
          </Link>

          <div className="group relative">
            {/* Gradient border glow */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-cyan-500/40 via-blue-600/30 to-indigo-600/40 opacity-70 blur-lg transition group-hover:opacity-100" />

            <div className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-7 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
              {/* Corner brackets */}
              <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-cyan-400/60" />
              <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-cyan-400/60" />
              <span className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-cyan-400/60" />
              <span className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-cyan-400/60" />

              <div className="mb-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">
                  Secure access
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
                  Enter the network
                </h2>
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1">
                  <TabsTrigger
                    value="signin"
                    className="rounded-full text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-full text-slate-300 data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    Create account
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="mt-5 space-y-4">
                    <Field id="email-in" label="Email" type="email" value={email} onChange={setEmail} />
                    <Field
                      id="pw-in"
                      label="Password"
                      type="password"
                      value={password}
                      onChange={setPassword}
                    />
                    <GradientButton disabled={loading} type="submit">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                    </GradientButton>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="mt-5 space-y-4">
                    <Field id="email-up" label="Email" type="email" value={email} onChange={setEmail} />
                    <Field
                      id="pw-up"
                      label="Password (min 6 chars)"
                      type="password"
                      value={password}
                      onChange={setPassword}
                    />
                    <GradientButton disabled={loading} type="submit">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                    </GradientButton>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <div className="h-px flex-1 bg-white/10" /> or continue with{" "}
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon /> Continue with Google
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            By continuing you agree to help make your neighborhood better ✨
          </p>
        </div>
      </div>
    </div>
  );
}

function Perk({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-slate-300">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
        {icon}
      </span>
      {text}
    </li>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-slate-400">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={type === "password" ? "current-password" : "email"}
        className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
      />
    </div>
  );
}

function GradientButton({
  children,
  disabled,
  type,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="group relative w-full overflow-hidden rounded-xl p-[1.5px] transition disabled:opacity-60"
    >
      <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
      <span className="absolute inset-0 opacity-0 blur-xl transition group-hover:opacity-60 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
      <span className="relative flex items-center justify-center gap-2 rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-slate-900">
        {children}
      </span>
    </button>
  );
}

function Hologram() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 14, y: -10 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: 14 - py * 14, y: -10 + px * 18 });
  };
  const reset = () => setTilt({ x: 14, y: -10 });

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="relative mt-10 h-40 w-full max-w-md [perspective:1200px]"
    >
      <div
        className="relative h-full w-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 backdrop-blur-2xl transition-transform duration-300"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="absolute inset-0 rounded-2xl opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.25) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(180deg, transparent, black 40%, black 100%)",
          }}
        />
        <div className="relative flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
            Session · India
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            secure link
          </div>
        </div>
        <div className="relative mt-3 grid grid-cols-3 gap-2">
          {["Auth", "RLS", "GPS"].map((l, i) => (
            <div
              key={l}
              className="rounded-lg border border-white/10 bg-slate-950/60 p-2 text-center"
              style={{ transform: `translateZ(${20 + i * 10}px)` }}
            >
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {l}
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-white">OK</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
