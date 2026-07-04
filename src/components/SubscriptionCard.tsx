import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import {
  cancelSubscription,
  getCustomerPortalUrl,
  getMySubscription,
  switchPlan,
} from "@/lib/subscription.functions";
import { GlassCard } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubscriptionCard() {
  const [userId, setUserId] = useState<string | null>(null);
  const environment = getPaddleEnvironment();
  const qc = useQueryClient();

  const fetchSub = useServerFn(getMySubscription);
  const doSwitch = useServerFn(switchPlan);
  const doCancel = useServerFn(cancelSubscription);
  const doPortal = useServerFn(getCustomerPortalUrl);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: subRow, isLoading } = useQuery({
    queryKey: ["my-subscription", userId, environment],
    queryFn: () => fetchSub({ data: { environment } }),
    enabled: !!userId,
  });

  const switchMut = useMutation({
    mutationFn: (newPriceId: string) =>
      doSwitch({ data: { newPriceId, environment, prorate: true } }),
    onSuccess: () => {
      toast.success("Plan updated. Charges are prorated.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not switch plan"),
  });

  const cancelMut = useMutation({
    mutationFn: () => doCancel({ data: { environment } }),
    onSuccess: () => {
      toast.success("Cancellation scheduled. You keep access until the period ends.");
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not cancel"),
  });

  const portalMut = useMutation({
    mutationFn: () => doPortal({ data: { environment } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (e: any) => toast.error(e?.message ?? "Could not open portal"),
  });

  // Free / Citizen state — signed-in but no subscription row
  if (userId && !isLoading && !subRow) {
    return (
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge tone="slate" dot label="Citizen · Free" />
            <p className="text-sm text-slate-400">
              You're on the free plan. Upgrade for ward-level analytics & admin tools.
            </p>
          </div>
          <a
            href="/pricing"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-white/90"
          >
            See plans
          </a>
        </div>
      </GlassCard>
    );
  }

  if (!userId || isLoading || !subRow) return null;

  const isYearly = subRow.price_id === "city_ngo_yearly";
  const targetPriceId = isYearly ? "city_ngo_monthly" : "city_ngo_yearly";
  const canceling = subRow.cancel_at_period_end || subRow.status === "canceled";
  const periodEnd = subRow.current_period_end
    ? new Date(subRow.current_period_end).toLocaleDateString()
    : null;

  // Resolve the primary status badge
  let badge: { tone: BadgeTone; label: string; pulse?: boolean };
  if (subRow.status === "trialing") {
    badge = { tone: "sky", label: "In trial", pulse: true };
  } else if (canceling) {
    badge = { tone: "amber", label: "Set to cancel" };
  } else if (subRow.status === "active") {
    badge = { tone: "emerald", label: "Active", pulse: true };
  } else if (subRow.status === "past_due") {
    badge = { tone: "rose", label: "Payment past due" };
  } else if (subRow.status === "paused") {
    badge = { tone: "slate", label: "Paused" };
  } else {
    badge = { tone: "slate", label: subRow.status };
  }

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Your subscription</h2>
            <StatusBadge tone={badge.tone} dot pulse={badge.pulse} label={badge.label} />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            City / NGO · {isYearly ? "Yearly" : "Monthly"}
            {periodEnd && !canceling && (
              <>
                {" · "}
                <span className="text-slate-300">Renews {periodEnd}</span>
              </>
            )}
          </p>
          {canceling && periodEnd && (
            <p className="mt-2 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Cancellation scheduled — you keep full access until <b>{periodEnd}</b>, then drop to Citizen. Re-subscribe anytime.
            </p>
          )}
          {subRow.status === "trialing" && periodEnd && (
            <p className="mt-2 rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
              Trial active — first charge on <b>{periodEnd}</b>.
            </p>
          )}
          {subRow.status === "past_due" && (
            <p className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              Payment failed. Update your card in <b>Manage billing</b> to keep access.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!canceling && (
            <Button
              onClick={() => switchMut.mutate(targetPriceId)}
              disabled={switchMut.isPending}
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              {switchMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isYearly ? (
                "Switch to Monthly"
              ) : (
                "Switch to Yearly (save 20%)"
              )}
            </Button>
          )}
          <Button
            onClick={() => portalMut.mutate()}
            disabled={portalMut.isPending}
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            {portalMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}
          </Button>
          {!canceling && (
            <Button
              onClick={() => {
                if (confirm("Cancel at end of the current period?")) cancelMut.mutate();
              }}
              disabled={cancelMut.isPending}
              variant="outline"
              className="border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
            >
              {cancelMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

type BadgeTone = "emerald" | "sky" | "amber" | "rose" | "slate";

function StatusBadge({
  tone,
  label,
  dot,
  pulse,
}: {
  tone: BadgeTone;
  label: string;
  dot?: boolean;
  pulse?: boolean;
}) {
  const styles: Record<BadgeTone, string> = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    slate: "border-white/15 bg-white/5 text-slate-200",
  };
  const dotColor: Record<BadgeTone, string> = {
    emerald: "bg-emerald-400",
    sky: "bg-sky-400",
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    slate: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${styles[tone]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColor[tone]} ${pulse ? "animate-pulse" : ""}`}
        />
      )}
      {label}
    </span>
  );
}

