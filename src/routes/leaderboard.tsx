import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWardScorecards, getTopCitizens } from "@/lib/civic.functions";
import { PageShell, GlassCard } from "@/components/PageShell";
import {
  Trophy,
  TrendingDown,
  Clock,
  Users,
  Activity,
  CheckCircle2,
  Radio,
  ShieldAlert,
  AlertTriangle,
  Inbox,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — CivicPulse" },
      {
        name: "description",
        content:
          "Public ward accountability scorecards: resolution rates, on-time SLA percentages, and top-contributing citizens.",
      },
      { property: "og:title", content: "Public accountability leaderboard — CivicPulse" },
      {
        property: "og:description",
        content: "See how each ward is performing on citizen-reported civic issues.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const {
    data: wards = [],
    isLoading: wardsLoading,
    isError: wardsError,
    error: wardsErrorObj,
    refetch: refetchWards,
    isFetching: wardsFetching,
  } = useQuery({
    queryKey: ["ward-scorecards"],
    queryFn: () => getWardScorecards(),
    retry: 1,
  });
  const {
    data: citizens = [],
    isLoading: citizensLoading,
    isError: citizensError,
    error: citizensErrorObj,
    refetch: refetchCitizens,
    isFetching: citizensFetching,
  } = useQuery({
    queryKey: ["top-citizens"],
    queryFn: () => getTopCitizens(),
    retry: 1,
  });

  const sortedWards = useMemo(
    () => [...wards].sort((a, b) => (b.on_time_rate ?? 0) - (a.on_time_rate ?? 0)),
    [wards],
  );
  const laggards = useMemo(
    () =>
      [...wards]
        .filter((w) => w.overdue > 0)
        .sort((a, b) => b.overdue - a.overdue)
        .slice(0, 5),
    [wards],
  );

  const totals = useMemo(() => {
    const total = wards.reduce((s, w) => s + (w.total ?? 0), 0);
    const resolved = wards.reduce((s, w) => s + (w.resolved ?? 0), 0);
    const open = wards.reduce((s, w) => s + (w.open_count ?? 0), 0);
    const overdue = wards.reduce((s, w) => s + (w.overdue ?? 0), 0);
    return { total, resolved, open, overdue };
  }, [wards]);

  return (
    <PageShell contained={false}>
      {/* Toolbar */}
      <div className="relative z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
              Live · accountability grid
            </span>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <StatPod icon={<Activity className="h-3 w-3" />} label="Total" value={totals.total} hue="text-cyan-300 border-cyan-400/40" />
            <StatPod icon={<Radio className="h-3 w-3" />} label="Open" value={totals.open} hue="text-rose-300 border-rose-400/40" />
            <StatPod icon={<CheckCircle2 className="h-3 w-3" />} label="Resolved" value={totals.resolved} hue="text-emerald-300 border-emerald-400/40" />
            <StatPod icon={<ShieldAlert className="h-3 w-3" />} label="Overdue" value={totals.overdue} hue="text-amber-300 border-amber-400/40" />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
            Public accountability
          </p>
          <h1 className="mt-1 bg-gradient-to-b from-white to-white/60 bg-clip-text text-3xl font-bold text-transparent">
            Ward performance grid
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Ward-by-ward performance on citizen-reported issues. Shareable, updated in real time.
          </p>
        </div>

        {laggards.length > 0 && (
          <GlassCard className="border-rose-400/30 p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">
                Wards falling behind
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {laggards.map((w) => (
                <div
                  key={w.ward}
                  className="rounded-xl border border-rose-400/30 bg-rose-500/[0.06] p-3"
                >
                  <p className="text-sm font-semibold text-white">{w.ward}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-rose-300/80">
                    {w.overdue} overdue · {w.open_count} open
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-cyan-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Ward scorecards
              </p>
            </div>
            {wardsLoading ? (
              <p className="text-sm text-slate-500">Loading grid…</p>
            ) : wardsError ? (
              <StateMessage
                tone="error"
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Couldn't load ward scorecards"
                description={errorMessage(wardsErrorObj) ?? "The scorecard service is temporarily unavailable. Please try again in a moment."}
                onRetry={() => refetchWards()}
                retrying={wardsFetching}
              />
            ) : sortedWards.length === 0 ? (
              <StateMessage
                tone="empty"
                icon={<Inbox className="h-4 w-4" />}
                title="No ward data yet"
                description="Once residents file their first reports, ward-by-ward performance will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="py-2 pr-4">Ward</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Resolved</th>
                      <th className="py-2 pr-4">Open</th>
                      <th className="py-2 pr-4">Overdue</th>
                      <th className="py-2 pr-4">On-time</th>
                      <th className="py-2 pr-4">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWards.map((w) => (
                      <tr key={w.ward} className="border-b border-white/5 last:border-0 text-slate-200">
                        <td className="py-3 pr-4 font-medium text-white">{w.ward}</td>
                        <td className="py-3 pr-4">{w.total}</td>
                        <td className="py-3 pr-4 text-emerald-300">{w.resolved}</td>
                        <td className="py-3 pr-4 text-rose-300">{w.open_count}</td>
                        <td className="py-3 pr-4">
                          {w.overdue > 0 ? (
                            <span className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                              {w.overdue}
                            </span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {w.on_time_rate !== null ? (
                            <OnTimePill rate={w.on_time_rate ?? 0} />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {w.avg_resolution_hours !== null ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {w.avg_resolution_hours}h
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                Top citizens
              </p>
            </div>
            {citizensLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : citizensError ? (
              <StateMessage
                tone="error"
                icon={<AlertTriangle className="h-4 w-4" />}
                title="Couldn't load top citizens"
                description={errorMessage(citizensErrorObj) ?? "The leaderboard service is temporarily unavailable. Please try again in a moment."}
                onRetry={() => refetchCitizens()}
                retrying={citizensFetching}
              />
            ) : citizens.length === 0 ? (
              <StateMessage
                tone="empty"
                icon={<Inbox className="h-4 w-4" />}
                title="No contributors yet"
                description="Be the first to file a report and you'll show up here."
              />
            ) : (
              <ol className="space-y-2">
                {citizens.map((c, i) => (
                  <li
                    key={c.rank}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                        i === 0
                          ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                          : i === 1
                            ? "bg-slate-300/15 text-slate-100 ring-1 ring-slate-300/30"
                            : i === 2
                              ? "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30"
                              : "bg-white/5 text-slate-300"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {c.citizen_label}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">
                        {c.reports_count} reports · {c.upvotes_received} upvotes
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                      {c.reputation} rep
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </GlassCard>
        </div>
      </main>
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
      className={`inline-flex items-center gap-1.5 rounded-full border bg-slate-950/70 px-2.5 py-1 backdrop-blur ${hue}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      <span className="text-xs font-semibold text-white">{value}</span>
    </div>
  );
}

function OnTimePill({ rate }: { rate: number }) {
  const tone =
    rate >= 80
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : rate >= 50
        ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
        : "border-rose-400/40 bg-rose-500/10 text-rose-200";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {rate}%
    </span>
  );
}

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  return null;
}

function StateMessage({
  tone,
  icon,
  title,
  description,
  onRetry,
  retrying,
}: {
  tone: "error" | "empty";
  icon: React.ReactNode;
  title: string;
  description: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-400/30 bg-rose-500/[0.06] text-rose-100"
      : "border-white/10 bg-white/[0.02] text-slate-200";
  const iconTone = tone === "error" ? "text-rose-300" : "text-slate-400";
  return (
    <div className={`flex flex-col items-start gap-3 rounded-xl border p-4 ${toneClasses}`} role={tone === "error" ? "alert" : undefined}>
      <div className="flex items-center gap-2">
        <span className={iconTone}>{icon}</span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}

