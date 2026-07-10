import { useMemo, useRef, useState } from "react";

type Report = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  issue_type: string;
  status: string;
};

// India bbox
const BBOX = { minLat: 6.5, maxLat: 35.7, minLng: 68, maxLng: 97.5 };

const dotColor = (t: string) =>
  t === "pothole"
    ? "bg-rose-400"
    : t === "garbage"
      ? "bg-emerald-400"
      : t === "streetlight"
        ? "bg-amber-400"
        : "bg-slate-300";

export default function Map3DView({
  reports,
  selectedId,
  userLocation,
  onSelect,
}: {
  reports: Report[];
  selectedId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 55, y: 0, z: -8 });
  const [autoRotate, setAutoRotate] = useState(true);

  const project = (lat: number, lng: number) => {
    const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * 100;
    const y = 100 - ((lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat)) * 100;
    return { x, y };
  };

  const markers = useMemo(
    () =>
      reports
        .filter(
          (r) =>
            r.latitude >= BBOX.minLat &&
            r.latitude <= BBOX.maxLat &&
            r.longitude >= BBOX.minLng &&
            r.longitude <= BBOX.maxLng,
        )
        .map((r) => ({ ...r, ...project(r.latitude, r.longitude) })),
    [reports],
  );

  const handleMove = (e: React.MouseEvent) => {
    if (autoRotate) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: 55 - py * 25, y: 0, z: -8 + px * 30 });
  };

  const userPos = userLocation ? project(userLocation.lat, userLocation.lng) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#02040d] via-[#050b1f] to-[#020617]">
      {/* Starfield */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 0.5}px`,
              height: `${Math.random() * 2 + 0.5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              opacity: Math.random() * 0.7 + 0.2,
              animation: `starTwinkle ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-3 z-30 flex gap-2">
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur ${
            autoRotate
              ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
              : "border-white/15 bg-slate-950/60 text-slate-300 hover:bg-white/10"
          }`}
        >
          {autoRotate ? "Auto-orbit on" : "Auto-orbit off"}
        </button>
      </div>

      {/* 3D stage */}
      <div
        ref={ref}
        onMouseMove={handleMove}
        className="relative h-full w-full [perspective:1400px]"
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div
            className="relative h-[70%] w-[85%]"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${tilt.x}deg) rotateZ(${tilt.z}deg)`,
              animation: autoRotate ? "orbit 24s linear infinite" : undefined,
            }}
          >
            {/* Grid floor */}
            <div
              className="absolute inset-0 rounded-2xl border border-cyan-400/20"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(34,211,238,0.15), rgba(2,6,23,0.9) 70%)",
                backgroundImage:
                  "linear-gradient(rgba(56,189,248,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.25) 1px, transparent 1px)",
                backgroundSize: "40px 40px, 40px 40px",
                boxShadow:
                  "0 0 80px rgba(34,211,238,0.35), inset 0 0 60px rgba(34,211,238,0.15)",
              }}
            />

            {/* India silhouette (SVG) as an elevated glass slab */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              style={{ transform: "translateZ(20px)" }}
            >
              <defs>
                <linearGradient id="indiaFill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
                  <stop offset="100%" stopColor="rgba(99,102,241,0.25)" />
                </linearGradient>
              </defs>
              {/* rough India polygon (normalized to bbox) */}
              <polygon
                points="35,5 50,4 60,10 72,14 82,22 78,32 70,38 68,48 76,58 66,70 58,84 50,96 44,88 40,74 30,66 22,58 18,46 22,36 26,24 30,14"
                fill="url(#indiaFill)"
                stroke="rgba(125,211,252,0.85)"
                strokeWidth="0.35"
              />
            </svg>

            {/* Markers */}
            {markers.map((m) => {
              const isSel = m.id === selectedId;
              const height = isSel ? 90 : m.status === "resolved" ? 30 : m.status === "in_progress" ? 55 : 70;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelect?.(m.id)}
                  className="group absolute"
                  style={{
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    transform: `translate(-50%, -100%) translateZ(${height}px)`,
                    transformStyle: "preserve-3d",
                  }}
                  title={m.title}
                >
                  {/* Vertical beam */}
                  <div
                    className={`w-[3px] rounded-full ${dotColor(m.issue_type)} shadow-[0_0_12px_currentColor] opacity-80`}
                    style={{ height: `${height}px` }}
                  />
                  {/* Top pin */}
                  <div
                    className={`absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${dotColor(m.issue_type)} shadow-[0_0_16px_currentColor] ${isSel ? "ring-2 ring-white/80" : ""}`}
                  />
                  <div
                    className={`absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 animate-ping rounded-full ${dotColor(m.issue_type)} opacity-40`}
                  />
                </button>
              );
            })}

            {/* User location beacon */}
            {userPos && (
              <div
                className="absolute"
                style={{
                  left: `${userPos.x}%`,
                  top: `${userPos.y}%`,
                  transform: "translate(-50%, -100%) translateZ(120px)",
                }}
              >
                <div className="h-[3px] w-[3px] rounded-full bg-white" style={{ height: "120px", width: "3px" }} />
                <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.9)]" />
                <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 animate-ping rounded-full bg-white opacity-60" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] backdrop-blur">
        <div className="mb-1 font-bold uppercase tracking-widest text-cyan-300">Elevation</div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-rose-400" /> Open (tall)
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> In progress
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Resolved (short)
        </div>
      </div>

      <style>{`
        @keyframes orbit {
          0% { transform: rotateX(55deg) rotateZ(-18deg); }
          50% { transform: rotateX(55deg) rotateZ(18deg); }
          100% { transform: rotateX(55deg) rotateZ(-18deg); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
