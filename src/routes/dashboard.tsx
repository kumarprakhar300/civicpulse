import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPublicReports } from "@/lib/reports.functions";
import { Loader2, TrendingUp, Clock, Activity, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import { PageShell, GlassCard } from "@/components/PageShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Analytics Dashboard — CivicPulse India" },
      {
        name: "description",
        content:
          "Public accountability dashboard for India: resolution times, hotspot heatmap, and issue trends.",
      },
    ],
  }),
  component: DashboardPage,
});

const COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"];

function DashboardPage() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["public-reports"],
    queryFn: () => getPublicReports(),
  });

  const [HeatmapView, setHeatmapView] = useState<React.ComponentType<{ points: any[] }> | null>(null);

  useEffect(() => {
    import("@/components/HeatmapView").then((mod) => setHeatmapView(() => mod.default));
  }, []);

  const stats = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((r: any) => r.status === "resolved").length;
    const open = reports.filter((r: any) => r.status === "open").length;
    const inProgress = reports.filter((r: any) => r.status === "in_progress").length;
    const resolvedWithTimes = reports.filter(
      (r: any) => r.status === "resolved" && r.resolved_at,
    );
    const avgHours =
      resolvedWithTimes.length > 0
        ? resolvedWithTimes.reduce((sum: number, r: any) => {
            const diff =
              new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
            return sum + diff / (1000 * 60 * 60);
          }, 0) / resolvedWithTimes.length
        : 0;
    return { total, resolved, open, inProgress, avgHours };
  }, [reports]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach((r: any) => map.set(r.issue_type, (map.get(r.issue_type) || 0) + 1));
    return Array.from(map, ([type, count]) => ({ type, count }));
  }, [reports]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach((r: any) => map.set(r.status, (map.get(r.status) || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [reports]);

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach((r: any) => {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map, ([date, count]) => ({ date, count })).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [reports]);

  return (
    <PageShell contained={false}>
      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6 py-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Live analytics · India
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Accountability Dashboard
            </span>
          </h1>
          <p className="mt-2 text-slate-400">
            How fast issues get resolved, where the hotspots are, and what breaks most.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={<Activity />} label="Total reports" value={stats.total.toString()} hue="from-cyan-500/30 to-blue-600/10" />
              <KpiCard
                icon={<CheckCircle2 />}
                label="Resolved"
                value={`${stats.resolved} (${
                  stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0
                }%)`}
                hue="from-emerald-500/30 to-teal-600/10"
              />
              <KpiCard icon={<TrendingUp />} label="Open" value={stats.open.toString()} hue="from-amber-500/30 to-rose-600/10" />
              <KpiCard
                icon={<Clock />}
                label="Avg resolution"
                value={stats.avgHours ? `${stats.avgHours.toFixed(1)}h` : "—"}
                hue="from-indigo-500/30 to-purple-600/10"
              />
            </div>

            <GlassCard className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Hotspot heatmap · India</h2>
              <div className="h-[420px] overflow-hidden rounded-xl border border-white/10">
                {HeatmapView ? (
                  <Suspense fallback={<div className="p-6 text-slate-400">Loading…</div>}>
                    <HeatmapView points={reports} />
                  </Suspense>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    Loading heatmap…
                  </div>
                )}
              </div>
            </GlassCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <GlassCard className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Issues by type</h2>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="type" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15,23,42,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                      <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Status breakdown</h2>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byStatus}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                        stroke="rgba(15,23,42,0.9)"
                      >
                        {byStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15,23,42,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                      <Legend wrapperStyle={{ color: "rgba(255,255,255,0.7)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-6 lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-white">Reports over time</h2>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.5)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(15,23,42,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#22d3ee"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </main>
    </PageShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hue: string;
}) {
  return (
    <div className="group relative">
      <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${hue} opacity-40 blur-xl transition group-hover:opacity-70`} />
      <div className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br ${hue} text-cyan-200`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
