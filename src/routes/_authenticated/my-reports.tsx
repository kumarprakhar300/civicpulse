import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyReports, getMyNotifications, markAllNotifRead } from "@/lib/reports-auth.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Bell, ThumbsUp } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <Link to="/report">
            <Button size="sm">New report</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">My reports</h1>
          <p className="mt-1 text-muted-foreground">
            Everything you've submitted, plus alerts when the status changes.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
              {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
            </CardTitle>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await markReadFn();
                  qc.invalidateQueries({ queryKey: ["my-notifs"] });
                }}
              >
                Mark all read
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {notifs.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
            {!notifs.isLoading && (notifs.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {(notifs.data ?? []).map((n: any) => (
              <div
                key={n.id}
                className={`rounded-md border p-3 text-sm ${
                  n.read_at ? "border-border/60" : "border-primary/50 bg-primary/5"
                }`}
              >
                {n.report_id ? (
                  <Link to="/report/$id" params={{ id: n.report_id }} className="hover:underline">
                    {n.message}
                  </Link>
                ) : (
                  n.message
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Your submissions</h2>
          {reports.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (reports.data ?? []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                You haven't submitted any reports yet.{" "}
                <Link to="/report" className="text-primary underline">
                  Report your first issue
                </Link>
                .
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {(reports.data ?? []).map((r: any) => (
                <Link
                  key={r.id}
                  to="/report/$id"
                  params={{ id: r.id }}
                  className="block rounded-lg border border-border/60 bg-card p-4 hover:border-primary/60 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="outline">{r.issue_type}</Badge>
                        <Badge variant={r.status === "resolved" ? "default" : "secondary"}>
                          {r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ThumbsUp className="h-4 w-4" /> {r.upvote_count ?? 0}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
