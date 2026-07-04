import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function grantPaidRole(userId: string) {
  const sb = getSupabase();
  await sb
    .from("user_roles")
    .upsert({ user_id: userId, role: "city_ngo_admin" }, { onConflict: "user_id,role" });
}

async function revokePaidRole(userId: string) {
  await getSupabase()
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "city_ngo_admin");
}

async function notifyUserWelcome(userId: string, priceId: string) {
  await getSupabase().from("notifications").insert({
    user_id: userId,
    kind: "subscription_active",
    message: `Welcome to CivicPulse City / NGO (${priceId.includes("yearly") ? "Yearly" : "Monthly"}). Analytics, CSV export & admin tools are unlocked.`,
  });
}

async function notifyTeam(kind: string, userId: string | null, message: string, meta: Record<string, unknown>) {
  await getSupabase().from("internal_alerts").insert({ kind, user_id: userId, message, meta });
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) return console.error("No userId in customData");
  const item = items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId");
    return;
  }
  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productId,
      price_id: priceId,
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );

  if (status === "active" || status === "trialing") {
    await grantPaidRole(userId);
    await notifyUserWelcome(userId, priceId);
    await notifyTeam("subscription_created", userId, `New paid subscriber on ${priceId}`, {
      env,
      paddle_subscription_id: id,
      price_id: priceId,
    });
  }
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, items, currentBillingPeriod, scheduledChange, customData } = data;
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;

  const patch: Record<string, unknown> = {
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === "cancel",
    updated_at: new Date().toISOString(),
  };
  if (priceId) patch.price_id = priceId;
  if (productId) patch.product_id = productId;

  await getSupabase()
    .from("subscriptions")
    .update(patch)
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  const userId = customData?.userId;
  if (userId) {
    if (status === "active" || status === "trialing") {
      await grantPaidRole(userId);
    }
    await notifyTeam("subscription_updated", userId, `Subscription ${id} → ${status}${priceId ? ` (${priceId})` : ""}`, {
      env,
      status,
      scheduledChange: scheduledChange ?? null,
    });
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const { id, currentBillingPeriod, customData } = data;
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      current_period_end: currentBillingPeriod?.endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  const userId = customData?.userId;
  if (userId) {
    const endsAt = currentBillingPeriod?.endsAt;
    // Grace period: only revoke role once the paid period has actually ended.
    if (!endsAt || new Date(endsAt) <= new Date()) {
      await revokePaidRole(userId);
    }
    await getSupabase().from("notifications").insert({
      user_id: userId,
      kind: "subscription_canceled",
      message: endsAt
        ? `Your subscription was canceled. You keep access until ${new Date(endsAt).toLocaleDateString()}.`
        : `Your subscription was canceled.`,
    });
    await notifyTeam("subscription_canceled", userId, `Subscription ${id} canceled`, { env, endsAt });
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    default:
      console.log("Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
