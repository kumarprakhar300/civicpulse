import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageShell, GlassCard } from "@/components/PageShell";
import { StateMessage } from "@/components/StateMessage";
import {
  listMyNotificationsPaged,
  markNotifRead,
  markAllNotifRead,
} from "@/lib/reports-auth.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CivicPulse" },
      { name: "description", content: "All updates on your reports and civic activity." },
    ],
  }),
  component: NotificationsPage,
});

const PAGE_SIZE = 20;

function NotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotificationsPaged);
  const markOneFn = useServerFn(markNotifRead);
  const markAllFn = useServerFn(markAllNotifRead);

  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ["notifications", { unreadOnly }],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listFn({ data: { limit: PAGE_SIZE, cursor: pageParam, unreadOnly } }),
    getNextPageParam: (last) => last?.page?.next_cursor ?? undefined,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markOneFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Infinite scroll sentinel
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const items = query.data?.pages.flatMap((p) => p.notifications) ?? [];
  const total = query.data?.pages[0]?.page?.total ?? 0;

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
              <Bell className="h-6 w-6" /> Notifications
            </h1>
            <p className="text-sm text-slate-400">
              {total} total {unreadOnly ? "unread" : ""} update{total === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? "Show all" : "Unread only"}
            </Button>
            <Button
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || items.every((n: any) => n.read_at)}
            >
              <Check className="mr-1 h-4 w-4" /> Mark all read
            </Button>
          </div>
        </div>

        <GlassCard>
          {query.isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading notifications…
            </div>
          ) : query.isError ? (
            <StateMessage
              variant="error"
              title="Could not load notifications"
              description={(query.error as Error)?.message ?? "Please try again."}
              onRetry={() => query.refetch()}
            />
          ) : items.length === 0 ? (
            <StateMessage
              variant="empty"
              icon={<BellOff className="h-8 w-8" />}
              title={unreadOnly ? "No unread notifications" : "No notifications yet"}
              description={
                unreadOnly
                  ? "You're all caught up."
                  : "Updates on your reports and civic activity will appear here."
              }
            />
          ) : (
            <ul className="divide-y divide-white/10">
              {items.map((n: any) => (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-4 py-3 ${
                    n.read_at ? "opacity-70" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={n.read_at ? "outline" : "default"} className="text-[10px]">
                        {n.kind ?? "update"}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-100">{n.message}</p>
                    {n.report_id && (
                      <Link
                        to="/report/$id"
                        params={{ id: n.report_id }}
                        className="mt-1 inline-block text-xs text-sky-400 hover:underline"
                      >
                        View report →
                      </Link>
                    )}
                  </div>
                  {!n.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markOne.mutate(n.id)}
                      disabled={markOne.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div ref={sentinel} className="h-8" />
          {query.isFetchingNextPage && (
            <div className="flex items-center justify-center py-4 text-xs text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more…
            </div>
          )}
          {!query.hasNextPage && items.length > 0 && (
            <div className="py-4 text-center text-xs text-slate-500">You've reached the end.</div>
          )}
        </GlassCard>
      </div>
    </PageShell>
  );
}
