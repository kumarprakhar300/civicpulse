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

  if (!userId || isLoading || !subRow) return null;

  const isYearly = subRow.price_id === "city_ngo_yearly";
  const targetPriceId = isYearly ? "city_ngo_monthly" : "city_ngo_yearly";
  const canceling = subRow.cancel_at_period_end || subRow.status === "canceled";
  const periodEnd = subRow.current_period_end
    ? new Date(subRow.current_period_end).toLocaleDateString()
    : null;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Your subscription</h2>
          <p className="mt-1 text-sm text-slate-400">
            City / NGO · {isYearly ? "Yearly" : "Monthly"} · Status:{" "}
            <span className="text-cyan-300">{subRow.status}</span>
          </p>
          {canceling && periodEnd && (
            <p className="mt-1 text-xs text-amber-300">
              Access ends {periodEnd}. Re-subscribe anytime.
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
