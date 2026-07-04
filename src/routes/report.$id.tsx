import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicReport } from "@/lib/reports.functions";
import { toggleVote, addComment } from "@/lib/reports-auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, ThumbsUp, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SlaBadge } from "@/components/SlaBadge";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Report detail — CivicPulse" },
      { name: "description", content: "View a civic issue report, its status timeline, and community discussion." },
    ],
  }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => getPublicReport({ data: { id } }),
  });

  const voteFn = useServerFn(toggleVote);
  const commentFn = useServerFn(addComment);

  async function handleVote() {
    if (!email) return navigate({ to: "/auth" });
    try {
      const res = await voteFn({ data: { reportId: id } });
      toast.success(res.voted ? "Upvoted" : "Vote removed");
      qc.invalidateQueries({ queryKey: ["report", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return navigate({ to: "/auth" });
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentFn({ data: { reportId: id, body: commentText } });
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["report", id] });
      toast.success("Comment posted");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!data?.report) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <h1 className="text-xl font-bold">Report not found</h1>
            <Link to="/map" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Back to map</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const r = data.report as any;

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
          <Link to="/map">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to map
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-2xl">{r.title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{r.issue_type}</Badge>
                <Badge variant={r.status === "resolved" ? "default" : "secondary"}>
                  {r.status}
                </Badge>
                {r.ward && <Badge variant="outline">{r.ward}</Badge>}
                {r.department && <Badge variant="outline">{r.department}</Badge>}
                <SlaBadge dueAt={r.sla_due_at} status={r.status} resolvedAt={r.resolved_at} />
              </div>
            </div>
            <Button onClick={handleVote} variant="outline" className="gap-2">
              <ThumbsUp className="h-4 w-4" /> {r.upvote_count ?? 0}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {r.photo_url && (
              <img
                src={r.photo_url}
                alt=""
                className="w-full max-h-96 rounded-md object-cover"
                loading="lazy"
              />
            )}
            {r.description && <p className="text-sm">{r.description}</p>}
            <p className="text-xs text-muted-foreground">
              📍 {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)} ·
              Reported {new Date(r.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Status timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {data.history.map((h: any) => (
                <li key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div>
                    <p>
                      {h.from_status ? `${h.from_status} → ` : "Reported as "}
                      <strong>{h.to_status}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.changed_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discussion ({data.comments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
            )}
            {data.comments.map((c: any) => (
              <div key={c.id} className="rounded-md border border-border/60 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {c.author_label ?? "citizen"} · {new Date(c.created_at).toLocaleString()}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}

            <form onSubmit={handleComment} className="space-y-2 pt-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={email ? "Add a comment…" : "Sign in to comment"}
                maxLength={1000}
                rows={3}
              />
              <Button type="submit" size="sm" disabled={submitting || !commentText.trim()}>
                {submitting ? "Posting…" : email ? "Post comment" : "Sign in to comment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
