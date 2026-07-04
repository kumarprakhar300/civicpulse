import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWardScorecards, getTopCitizens } from "@/lib/civic.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Trophy, TrendingDown, Clock, Users } from "lucide-react";

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
  const { data: wards = [] } = useQuery({
    queryKey: ["ward-scorecards"],
    queryFn: () => getWardScorecards(),
  });
  const { data: citizens = [] } = useQuery({
    queryKey: ["top-citizens"],
    queryFn: () => getTopCitizens(),
  });

  const sortedWards = [...wards].sort(
    (a, b) => (b.on_time_rate ?? 0) - (a.on_time_rate ?? 0),
  );
  const laggards = [...wards]
    .filter((w) => w.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 5);

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
          <div className="flex gap-2">
            <Link to="/map"><Button variant="ghost" size="sm">Map</Button></Link>
            <Link to="/feed"><Button variant="ghost" size="sm">Feed</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Public accountability</h1>
          <p className="text-muted-foreground mt-2">
            Ward-by-ward performance on citizen-reported issues. Shareable, updated in real time.
          </p>
        </div>

        {laggards.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Wards falling behind
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {laggards.map((w) => (
                  <div
                    key={w.ward}
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <p className="font-medium">{w.ward}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.overdue} overdue · {w.open_count} open
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Ward scorecards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedWards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4">Ward</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Resolved</th>
                      <th className="py-2 pr-4">Open</th>
                      <th className="py-2 pr-4">Overdue</th>
                      <th className="py-2 pr-4">On-time %</th>
                      <th className="py-2 pr-4">Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWards.map((w) => (
                      <tr key={w.ward} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{w.ward}</td>
                        <td className="py-3 pr-4">{w.total}</td>
                        <td className="py-3 pr-4">{w.resolved}</td>
                        <td className="py-3 pr-4">{w.open_count}</td>
                        <td className="py-3 pr-4">
                          {w.overdue > 0 ? (
                            <Badge variant="destructive">{w.overdue}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {w.on_time_rate !== null ? (
                            <Badge
                              variant={
                                (w.on_time_rate ?? 0) >= 80
                                  ? "default"
                                  : (w.on_time_rate ?? 0) >= 50
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {w.on_time_rate}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {w.avg_resolution_hours !== null ? (
                            <span className="flex items-center gap-1">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Top contributing citizens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {citizens.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contributors yet.</p>
            ) : (
              <ol className="space-y-2">
                {citizens.map((c, i) => (
                  <li
                    key={c.user_id}
                    className="flex items-center gap-3 rounded-md border border-border/60 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Citizen · {c.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.reports_count} reports · {c.upvotes_received} upvotes
                      </p>
                    </div>
                    <Badge>{c.reputation} rep</Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
