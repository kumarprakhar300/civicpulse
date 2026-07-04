import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyReports, getMyNotifications, markAllNotifRead } from "@/lib/reports-auth.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, ThumbsUp } from "lucide-react";
import { PageShell, GlassCard } from "@/components/PageShell";
import { ReputationCard } from "@/components/ReputationCard";

export const Route = createFileRoute("/_authenticated/my-reports")({
  head: () => ({
    meta: [
      { title: "My reports — CivicPulse" },
      { name: "description", content: "Track your submitted civic issue reports and their status." },
    ],
  }),
  component: MyReportsPage,
});

function MyReportsPage() {
  const qc = useQueryClient();
  const myReportsFn = useServerFn(getMyReports);
  const notifsFn = useServerFn(getMyNotifications);
  const markReadFn = useServerFn(markAllNotifRead);

  const reports = useQuery({ queryKey: ["my-reports"], queryFn: () => myReportsFn() });
  const notifs = useQuery({ queryKey: ["my-notifs"], queryFn: () => notifsFn() });

  const unreadCount = (notifs.data ?? []).filter((n: any) => !n.read_at).length;

  return (
    <PageShell>
      <main className="relative z-10 mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                Your activity
              </span>
            </div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                My reports
              </span>
            </h1>
            <p className="mt-1 text-slate-400">
              Everything you've submitted, plus alerts when the status changes.
            </p>
          </div>
          <Link to="/report">
            <Button size="sm" className="bg-white text-slate-950 hover:bg-white/90">New report</Button>
          </Link>
        </div>

        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Bell className="h-4 w-4 text-cyan-300" /> Notifications
              {unreadCount > 0 && <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30">{unreadCount}</Badge>}
            </h2>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={async () => {
                  await markReadFn();
                  qc.invalidateQueries({ queryKey: ["my-notifs"] });
                }}
              >
                Mark all read
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {notifs.isLoading && <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />}
            {!notifs.isLoading && (notifs.data ?? []).length === 0 && (
              <p className="text-sm text-slate-400">No notifications yet.</p>
            )}
            {(notifs.data ?? []).map((n: any) => (
              <div
                key={n.id}
                className={`rounded-lg border p-3 text-sm ${
                  n.read_at
                    ? "border-white/10 bg-white/[0.02] text-slate-300"
                    : "border-cyan-400/40 bg-cyan-500/10 text-white"
                }`}
              >
                {n.report_id ? (
                  <Link to="/report/$id" params={{ id: n.report_id }} className="hover:underline">
                    {n.message}
                  </Link>
                ) : (
                  n.message
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-white">Your submissions</h2>
          {reports.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          ) : (reports.data ?? []).length === 0 ? (
            <GlassCard className="p-8 text-center text-sm text-slate-400">
              You haven't submitted any reports yet.{" "}
              <Link to="/report" className="text-cyan-300 underline">
                Report your first issue
              </Link>
              .
            </GlassCard>
          ) : (
            <div className="grid gap-3">
              {(reports.data ?? []).map((r: any) => (
                <Link
                  key={r.id}
                  to="/report/$id"
                  params={{ id: r.id }}
                  className="group relative block"
                >
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 opacity-0 blur-xl transition group-hover:opacity-70" />
                  <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl transition group-hover:border-cyan-400/40">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{r.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-white/20 text-slate-300">{r.issue_type}</Badge>
                          <Badge
                            className={
                              r.status === "resolved"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                : "bg-white/10 text-slate-200 border-white/20"
                            }
                          >
                            {r.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <ThumbsUp className="h-4 w-4" /> {r.upvote_count ?? 0}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
