import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicReports } from "@/lib/reports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlaBadge } from "@/components/SlaBadge";
import { MapPin, ThumbsUp, Filter } from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Neighborhood feed — CivicPulse" },
      {
        name: "description",
        content: "Live feed of civic issues reported in your neighborhood.",
      },
      { property: "og:title", content: "Neighborhood civic feed — CivicPulse" },
      {
        property: "og:description",
        content: "See what your neighbors are reporting and upvote what matters most.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

const TYPES = ["all", "pothole", "garbage", "streetlight", "other"];
const STATUSES = ["all", "open", "in_progress", "resolved"];

function FeedPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["public-reports"],
    queryFn: () => getPublicReports(),
  });
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return (data as any[]).filter((r) => {
      if (type !== "all" && r.issue_type !== type) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !r.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, type, status, q]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <div className="flex gap-2">
            <Link to="/map"><Button variant="ghost" size="sm">Map</Button></Link>
            <Link to="/leaderboard"><Button variant="ghost" size="sm">Leaderboard</Button></Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Neighborhood feed</h1>
          <p className="text-muted-foreground mt-2">
            Fresh civic reports from citizens near you. Upvote what needs attention.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-48"
            />
            <div className="flex flex-wrap gap-1">
              {TYPES.map((t) => (
                <Button
                  key={t}
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reports match your filters.</p>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => (
              <Card key={r.id} className="hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  {r.photo_url && (
                    <img
                      src={r.photo_url}
                      alt=""
                      className="h-16 w-16 rounded-md object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">
                      <Link to="/report/$id" params={{ id: r.id }} className="hover:underline">
                        {r.title}
                      </Link>
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{r.issue_type}</Badge>
                      <Badge variant={r.status === "resolved" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                      {r.ward && <Badge variant="outline">{r.ward}</Badge>}
                      <SlaBadge
                        dueAt={r.sla_due_at}
                        status={r.status}
                        resolvedAt={r.resolved_at}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()} · ▲ {r.upvote_count ?? 0}
                    </p>
                  </div>
                  <Link to="/report/$id" params={{ id: r.id }}>
                    <Button variant="outline" size="sm" className="gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" /> View
                    </Button>
                  </Link>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
