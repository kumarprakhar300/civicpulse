import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaddleClient, gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

const EnvSchema = z.object({ environment: z.enum(["sandbox", "live"]) });

// Load current user's latest subscription row.
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => EnvSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row;
  });

// Switch between monthly and yearly with immediate proration.
export const switchPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { newPriceId: string; environment: PaddleEnv; prorate: boolean }) =>
    z
      .object({
        newPriceId: z.string().min(1),
        environment: z.enum(["sandbox", "live"]),
        prorate: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Verify caller owns the sub
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_subscription_id, environment")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_subscription_id) throw new Error("No active subscription");

    // Resolve human-readable price id → Paddle internal id
    const res = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.newPriceId)}`,
    );
    const json = await res.json();
    const paddlePriceId = json.data?.[0]?.id;
    if (!paddlePriceId) throw new Error("Price not found in Paddle");

    const paddle = getPaddleClient(data.environment);
    await paddle.subscriptions.update(sub.paddle_subscription_id, {
      items: [{ priceId: paddlePriceId, quantity: 1 }],
      prorationBillingMode: data.prorate ? "prorated_immediately" : "do_not_bill",
    } as any);
    return { ok: true };
  });

// Cancel at period end (keeps access until current_period_end).
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => EnvSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_subscription_id) throw new Error("No active subscription");

    const paddle = getPaddleClient(data.environment);
    await paddle.subscriptions.cancel(sub.paddle_subscription_id, {
      effectiveFrom: "next_billing_period",
    } as any);
    return { ok: true };
  });

// Open Paddle-hosted customer portal (manage payment methods, invoices).
export const getCustomerPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => EnvSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_customer_id) throw new Error("No customer record");

    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(sub.paddle_customer_id, [
      sub.paddle_subscription_id,
    ]);
    return { url: session.urls.general.overview };
  });
