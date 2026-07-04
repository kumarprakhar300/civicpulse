import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicReports } from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  MapPin,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  Crosshair,
  Navigation,
  LocateFixed,

} from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live India Map — CivicPulse" },
      {
        name: "description",
        content: "Real-time civic issue command center across India.",
      },
    ],
  }),
  component: MapPage,
});

const issueFilters = [
  { value: "all", label: "All", dot: "bg-white" },
  { value: "pothole", label: "Potholes", dot: "bg-rose-400" },
  { value: "garbage", label: "Garbage", dot: "bg-emerald-400" },
  { value: "streetlight", label: "Streetlights", dot: "bg-amber-400" },
  { value: "other", label: "Other", dot: "bg-slate-400" },
];

const statusFilters = [
  { value: "all", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

function MapPage() {
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clickedPoint, setClickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [MapView, setMapView] = useState<React.ComponentType<{
    reports: any[];
    filter: string;
    selectedId?: string | null;
    userLocation?: { lat: number; lng: number } | null;
    clickedPoint?: { lat: number; lng: number } | null;
    onMapClick?: (lat: number, lng: number) => void;
  }> | null>(null);


  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["public-reports"],
    queryFn: () => getPublicReports(),
  });

  useEffect(() => {
    import("@/components/MapView").then((mod) => setMapView(() => mod.default));
  }, []);

  const locateMe = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setClickedPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => setGeoError(err.message || "Unable to fetch location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // haversine distance in km
  const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const filtered = useMemo(() => {
    return (reports as any[]).filter((r) => {
      if (filter !== "all" && r.issue_type !== filter) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [reports, filter, status, q]);

  const anchor = clickedPoint ?? userLocation;
  const nearby = useMemo(() => {
    if (!anchor) return [];
    return (filtered as any[])
      .map((r) => ({ ...r, _dist: distanceKm(anchor, { lat: r.latitude, lng: r.longitude }) }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 20);
  }, [filtered, anchor]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const resolved = filtered.filter((r: any) => r.status === "resolved").length;
    const open = filtered.filter((r: any) => r.status === "open").length;
    const inProgress = filtered.filter((r: any) => r.status === "in_progress").length;
    return { total, resolved, open, inProgress };
  }, [filtered]);


  return (
    <PageShell fullHeight contained={false}>
      {/* Toolbar */}
      <div className="relative z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
              Live · India feed
            </span>
          </div>

          <div className="relative ml-auto flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports…"
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
            {issueFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
                  filter === f.value
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
            {statusFilters.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  status === s.value
                    ? "bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          <button
            onClick={locateMe}
            title="Use my live location"
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            My location
          </button>

        </div>
      </div>

      {/* Command center layout */}
      <div className="relative z-10 flex flex-1 gap-3 overflow-hidden p-3">
        {/* Map */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
          {/* Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-[400] opacity-[0.08] mix-blend-screen"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(56,189,248,0.6) 0 1px, transparent 1px 4px)",
            }}
          />
          {/* Corner brackets */}
          <Corner className="left-3 top-3 border-l border-t" />
          <Corner className="right-3 top-3 border-r border-t" />
          <Corner className="bottom-3 left-3 border-b border-l" />
          <Corner className="bottom-3 right-3 border-b border-r" />

          {/* Floating stat pod */}
          <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
            <StatPod icon={<Activity className="h-3 w-3" />} label="Total" value={stats.total} hue="text-cyan-300 border-cyan-400/40" />
            <StatPod icon={<Radio className="h-3 w-3" />} label="Open" value={stats.open} hue="text-rose-300 border-rose-400/40" />
            <StatPod icon={<Clock className="h-3 w-3" />} label="In progress" value={stats.inProgress} hue="text-amber-300 border-amber-400/40" />
            <StatPod icon={<CheckCircle2 className="h-3 w-3" />} label="Resolved" value={stats.resolved} hue="text-emerald-300 border-emerald-400/40" />
          </div>

          {/* Crosshair badge */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-[500] inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 backdrop-blur">
            <Crosshair className="h-3 w-3 text-cyan-300" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              22.97°N · 78.66°E · IND
            </span>
          </div>

          {isLoading && (
            <div className="absolute inset-0 z-[600] flex items-center justify-center bg-slate-950/60 backdrop-blur">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            </div>
          )}
          {MapView ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
                </div>
              }
            >
              <MapView reports={filtered} filter={filter} selectedId={selectedId} />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Booting map engine…
            </div>
          )}
        </div>

        {/* Sidebar: live reports feed */}
        <aside className="hidden w-[340px] flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-xl lg:flex">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Report feed
              </p>
              <p className="text-sm font-semibold text-white">
                {filtered.length} {filtered.length === 1 ? "report" : "reports"}
              </p>
            </div>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-300">
              <Radio className="h-4 w-4" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 && !isLoading && (
              <div className="p-6 text-center text-xs text-slate-500">
                No reports match these filters.
              </div>
            )}
            {filtered.map((r: any) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`mb-2 block w-full rounded-xl border p-3 text-left transition ${
                  selectedId === r.id
                    ? "border-cyan-400/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      r.issue_type === "pothole"
                        ? "bg-rose-400"
                        : r.issue_type === "garbage"
                          ? "bg-emerald-400"
                          : r.issue_type === "streetlight"
                            ? "bg-amber-400"
                            : "bg-slate-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{r.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          r.status === "resolved"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : r.status === "in_progress"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                        <MapPin className="h-2.5 w-2.5" />
                        {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(r.created_at).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 p-3">
            <Button
              onClick={() => {
                setFilter("all");
                setStatus("all");
                setQ("");
                setSelectedId(null);
              }}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              Reset filters
            </Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function StatPod({
  icon,
  label,
  value,
  hue,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hue: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border bg-slate-950/70 px-3 py-1 backdrop-blur ${hue}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-sm font-extrabold text-white">{value}</span>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <div
      className={`pointer-events-none absolute z-[500] h-4 w-4 border-cyan-400/60 ${className}`}
    />
  );
}
