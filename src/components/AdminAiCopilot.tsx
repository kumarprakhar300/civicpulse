import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  getPriorityQueue,
  getHotspotSummary,
  draftReportUpdate,
  sendReportUpdate,
  adminResolveWithProof,
} from "@/lib/admin-ai.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SlaBadge } from "@/components/SlaBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Flame, Loader2, Send, Wand2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type QueueItem = {
  id: string;
  title: string;
  issue_type: string;
  status: string;
  ward: string | null;
  department: string | null;
  severity: number | null;
  priority_score: number | null;
  upvote_count: number;
  ai_summary: string | null;
  created_at: string;
};

type Summary = {
  headline: string;
  key_findings: string[];
  hotspots: Array<{ area: string; issue_type: string; count: number; note: string }>;
  recommended_actions: string[];
  report_count: number;
};

export function AdminAiCopilot() {
  const queueFn = useServerFn(getPriorityQueue);
  const summaryFn = useServerFn(getHotspotSummary);
  const draftFn = useServerFn(draftReportUpdate);
  const sendFn = useServerFn(sendReportUpdate);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [draftOpen, setDraftOpen] = useState(false);
  const [draftFor, setDraftFor] = useState<QueueItem | null>(null);
  const [draftTone, setDraftTone] =
    useState<"acknowledge" | "in_progress" | "resolved">("acknowledge");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await queueFn();
        setQueue(data as QueueItem[]);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load priority queue");
      } finally {
        setLoadingQueue(false);
      }
    })();
  }, []);

  async function runSummary() {
    setLoadingSummary(true);
    try {
      const s = await summaryFn();
      setSummary(s as Summary);
    } catch (e: any) {
      toast.error(e.message ?? "Summary failed");
    } finally {
      setLoadingSummary(false);
    }
  }

  function openDraft(item: QueueItem) {
    setDraftFor(item);
    setDraftTone(item.status === "in_progress" ? "in_progress" : "acknowledge");
    setDraftSubject("");
    setDraftMessage("");
    setDraftOpen(true);
  }

  async function generateDraft() {
    if (!draftFor) return;
    setDraftLoading(true);
    try {
      const d = await draftFn({ data: { reportId: draftFor.id, tone: draftTone } });
      setDraftSubject(d.subject);
      setDraftMessage(d.message);
    } catch (e: any) {
      toast.error(e.message ?? "Draft failed");
    } finally {
      setDraftLoading(false);
    }
  }

  async function sendDraft() {
    if (!draftFor || !draftMessage.trim()) return;
    setSending(true);
    try {
      await sendFn({ data: { reportId: draftFor.id, message: draftMessage.trim() } });
      toast.success("Update sent to citizen");
      setDraftOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  function sevColor(sev: number | null) {
    if (!sev) return "outline";
    if (sev >= 4) return "destructive" as const;
    if (sev >= 3) return "default" as const;
    return "secondary" as const;
  }

  return (
    <div className="space-y-6">
      {/* Weekly summary */}
      <Card className="border-primary/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            AI weekly ops brief
          </CardTitle>
          <Button size="sm" onClick={runSummary} disabled={loadingSummary} className="gap-1">
            {loadingSummary ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {summary ? "Regenerate" : "Generate"}
          </Button>
        </CardHeader>
        <CardContent>
          {!summary && !loadingSummary && (
            <p className="text-sm text-muted-foreground">
              Get an AI-written summary of the last 7 days: hotspots, trends, and recommended
              actions.
            </p>
          )}
          {summary && (
            <div className="space-y-4 text-sm">
              <p className="font-medium">{summary.headline}</p>
              <p className="text-xs text-muted-foreground">
                Based on {summary.report_count} reports in the last 7 days.
              </p>

              {summary.key_findings.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Key findings
                  </h4>
                  <ul className="list-disc space-y-1 pl-5">
                    {summary.key_findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.hotspots.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Hotspots
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {summary.hotspots.map((h, i) => (
                      <div key={i} className="rounded-md border border-border/60 p-3">
                        <div className="flex items-center gap-2">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          <span className="font-medium">{h.area}</span>
                          <Badge variant="outline">{h.issue_type}</Badge>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {h.count}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary.recommended_actions.length > 0 && (
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Recommended actions
                  </h4>
                  <ul className="list-disc space-y-1 pl-5">
                    {summary.recommended_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI priority queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingQueue ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open reports right now. 🎉</p>
          ) : (
            <div className="space-y-2">
              {queue.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 p-3"
                >
                  <div className="flex h-10 w-14 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                    <span className="text-sm font-bold leading-none">
                      {Math.round(r.priority_score ?? 0)}
                    </span>
                    <span className="text-[9px] uppercase leading-none">score</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/report/$id"
                      params={{ id: r.id }}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {r.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{r.issue_type}</Badge>
                      <Badge variant={sevColor(r.severity)}>
                        sev {r.severity ?? "?"}
                      </Badge>
                      <Badge variant="secondary">{r.status}</Badge>
                      {r.ward && <Badge variant="outline">{r.ward}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        ▲ {r.upvote_count}
                      </span>
                    </div>
                    {r.ai_summary && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {r.ai_summary}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDraft(r)}
                    className="gap-1"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Draft update
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft dialog */}
      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AI-drafted citizen update</DialogTitle>
          </DialogHeader>
          {draftFor && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{draftFor.title}</p>
                <p className="text-xs text-muted-foreground">
                  {draftFor.issue_type} · {draftFor.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium">Tone</label>
                <Select value={draftTone} onValueChange={(v) => setDraftTone(v as any)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acknowledge">Acknowledge</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={generateDraft}
                  disabled={draftLoading}
                  className="ml-auto gap-1"
                >
                  {draftLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {draftSubject ? "Regenerate" : "Generate"}
                </Button>
              </div>
              {draftSubject && (
                <div>
                  <label className="text-xs font-medium">Subject</label>
                  <p className="text-sm">{draftSubject}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium">Message</label>
                <Textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={6}
                  placeholder="Click Generate to draft with AI, or write your own."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraftOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendDraft}
              disabled={sending || !draftMessage.trim()}
              className="gap-1"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to citizen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
