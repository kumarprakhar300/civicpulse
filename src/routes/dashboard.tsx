import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicReports } from "@/lib/reports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, TrendingUp, Clock, Activity, CheckCircle2 } from "lucide-react";
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

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Analytics Dashboard — CivicPulse" },
      {
        name: "description",
        content:
          "Public accountability dashboard: resolution times, hotspot heatmap, and issue trends across wards.",
      },
    ],
  }),
  component: DashboardPage,
});

const COLORS = ["#ef4444", "#22c55e", "#eab308", "#6b7280", "#3b82f6"];

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
      (r: any) => r.status === "resolved" && r.resolved_at
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
      a.date.localeCompare(b.date)
    );
  }, [reports]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/map">
              <Button variant="ghost" size="sm">Map</Button>
            </Link>
            <Link to="/report">
              <Button size="sm">Report an issue</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accountability Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Public analytics — how fast issues get resolved, where the hotspots are, and what breaks
            most.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={<Activity />} label="Total reports" value={stats.total.toString()} />
              <KpiCard
                icon={<CheckCircle2 />}
                label="Resolved"
                value={`${stats.resolved} (${
                  stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0
                }%)`}
              />
              <KpiCard icon={<TrendingUp />} label="Open" value={stats.open.toString()} />
              <KpiCard
                icon={<Clock />}
                label="Avg resolution"
                value={stats.avgHours ? `${stats.avgHours.toFixed(1)}h` : "—"}
              />
            </div>

            {/* Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Hotspot heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[420px] overflow-hidden rounded-md border border-border/60">
                  {HeatmapView ? (
                    <Suspense fallback={<div className="p-6">Loading…</div>}>
                      <HeatmapView points={reports} />
                    </Suspense>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Loading heatmap…
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Issues by type</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byType}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="type" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byStatus}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {byStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Reports over time</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
