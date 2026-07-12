import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { BarChart3, MapPin, Shield, Sparkles, Trophy, Zap } from "lucide-react";

interface RotatingCubeProps {
  active: boolean;
}

export function RotatingCube({ active }: RotatingCubeProps) {
  const faces = [
    { label: "Potholes", value: "3,142", color: "from-rose-500/60 to-red-600/30", accent: "text-rose-200", icon: <MapPin className="h-6 w-6" /> },
    { label: "Garbage", value: "2,408", color: "from-emerald-500/60 to-teal-600/30", accent: "text-emerald-200", icon: <Trophy className="h-6 w-6" /> },
    { label: "Streetlights", value: "1,876", color: "from-amber-500/60 to-orange-600/30", accent: "text-amber-200", icon: <Zap className="h-6 w-6" /> },
    { label: "Water leaks", value: "1,205", color: "from-cyan-500/60 to-blue-600/30", accent: "text-cyan-200", icon: <Sparkles className="h-6 w-6" /> },
    { label: "Traffic", value: "984", color: "from-indigo-500/60 to-violet-600/30", accent: "text-indigo-200", icon: <BarChart3 className="h-6 w-6" /> },
    { label: "Safety", value: "612", color: "from-fuchsia-500/60 to-pink-600/30", accent: "text-fuchsia-200", icon: <Shield className="h-6 w-6" /> },
  ];
  // faces: front, back, right, left, top, bottom
  const transforms = [
    "translateZ(140px)",
    "rotateY(180deg) translateZ(140px)",
    "rotateY(90deg) translateZ(140px)",
    "rotateY(-90deg) translateZ(140px)",
    "rotateX(90deg) translateZ(140px)",
    "rotateX(-90deg) translateZ(140px)",
  ];

  const prefersReducedMotion = usePrefersReducedMotion();
  const playState = active && !prefersReducedMotion ? "running" : "paused";
  const enterStyle: React.CSSProperties = prefersReducedMotion
    ? { opacity: active ? 1 : 0 }
    : {
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0) scale(1)" : "translateY(40px) scale(0.92)",
        transition: "opacity 1000ms ease-out, transform 1000ms cubic-bezier(0.22, 1, 0.36, 1)",
      };

  return (
    <div
      className="relative mx-auto flex h-[440px] w-full items-center justify-center [perspective:1600px]"
      style={enterStyle}
    >
      {/* Ambient glow bed */}
      <div className="absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 bg-gradient-to-r from-fuchsia-500/10 via-cyan-500/10 to-indigo-500/10 blur-3xl" />
      {/* Floor reflection */}
      <div
        className="absolute bottom-8 h-24 w-[320px] rounded-[50%] bg-cyan-400/20 blur-2xl"
        style={{ transform: "rotateX(70deg)" }}
      />

      <div
        className="relative h-[280px] w-[280px]"
        style={{
          transformStyle: "preserve-3d",
          animation: "cubeSpin 24s linear infinite",
          animationPlayState: playState,
        }}
      >
        {faces.map((f, i) => (
          <div
            key={f.label}
            className={`absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br ${f.color} p-6 text-center backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.25)]`}
            style={{ transform: transforms[i], backfaceVisibility: "hidden" }}
          >
            <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/10 ${f.accent} shadow-[inset_0_0_16px_rgba(255,255,255,0.25)]`}>
              {f.icon}
            </div>
            <div className={`mt-4 text-4xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]`}>
              {f.value}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/80">
              {f.label}
            </div>
          </div>
        ))}
      </div>

      {/* Orbiting particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_currentColor]"
          style={{
            animation: `orbitParticle ${10 + i * 1.5}s linear infinite`,
            animationDelay: `${i * -1.5}s`,
            animationPlayState: playState,
            opacity: active ? 1 : 0,
            transition: "opacity 900ms ease-out",
          }}
        />
      ))}

      <style>{`
        @keyframes cubeSpin {
          0%   { transform: rotateX(-15deg) rotateY(0deg); }
          100% { transform: rotateX(-15deg) rotateY(360deg); }
        }
        @keyframes orbitParticle {
          0%   { transform: translate(-50%, -50%) rotate(0deg) translateX(200px) rotate(0deg); opacity: 0.9; }
          50%  { opacity: 0.3; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(200px) rotate(-360deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
