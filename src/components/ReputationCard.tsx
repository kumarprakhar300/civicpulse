import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getUserStats } from "@/lib/civic.functions";
import { computeBadges, reputationScore } from "@/lib/badges";
import { GlassCard } from "@/components/PageShell";
import { Award, Loader2 } from "lucide-react";

type Stats = {
  reports_count: number;
  resolved_count: number;
  upvotes_received: number;
  comments_count: number;
};

export function ReputationCard() {
  const statsFn = useServerFn(getUserStats);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setLoading(false);
      try {
        const s = await statsFn({ data: { userId: data.user.id } });
        setStats(s as Stats);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <GlassCard className="p-6 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
        <span className="text-sm text-slate-400">Loading reputation…</span>
      </GlassCard>
    );
  }
  if (!stats) return null;

  const rep = reputationScore(stats);
  const badges = computeBadges(stats);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <Award className="h-4 w-4 text-amber-300" /> Reputation
        </h2>
        <div className="rounded-full bg-amber-400/10 border border-amber-400/30 px-3 py-1 text-sm font-bold text-amber-200">
          {rep} pts
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <Stat label="Reports" value={stats.reports_count} />
        <Stat label="Resolved" value={stats.resolved_count} />
        <Stat label="Upvotes" value={stats.upvotes_received} />
        <Stat label="Comments" value={stats.comments_count} />
      </div>

      <div className="space-y-3">
        {earned.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Earned</p>
            <div className="flex flex-wrap gap-2">
              {earned.map((b) => (
                <div
                  key={b.key}
                  title={b.description}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100"
                >
                  <span>{b.emoji}</span>
                  <span className="font-medium">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {locked.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Locked</p>
            <div className="flex flex-wrap gap-2">
              {locked.map((b) => (
                <div
                  key={b.key}
                  title={b.description}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400"
                >
                  <span className="grayscale opacity-60">{b.emoji}</span>
                  <span>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
