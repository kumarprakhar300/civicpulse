import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

/** Completed payments (receipts / GST invoices) for the signed-in customer. */
export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.paddle_customer_id) return [];

    const res = await gatewayFetch(
      data.environment,
      `/transactions?customer_id=${encodeURIComponent(sub.paddle_customer_id)}&status=completed&order_by=created_at[DESC]&per_page=20`,
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Could not load invoices [${res.status}]: ${body}`);
    }
    const json = await res.json();

    return (json.data ?? []).map((t: any) => ({
      id: t.id as string,
      invoiceNumber: (t.invoice_number ?? null) as string | null,
      billedAt: (t.billed_at ?? t.created_at ?? null) as string | null,
      currency: (t.currency_code ?? "INR") as string,
      total: (t.details?.totals?.grand_total ?? "0") as string,
      tax: (t.details?.totals?.tax ?? "0") as string,
      taxRate: (t.details?.line_items?.[0]?.tax_rate ?? null) as string | null,
      countryCode: (t.details?.line_items?.[0]?.proration ? null : null) as string | null,
    }));
  });

/** Signed, short-lived PDF link for a single transaction the caller owns. */
export const getInvoicePdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { transactionId: string; environment: PaddleEnv; download?: boolean }) =>
    z
      .object({
        transactionId: z.string().min(3),
        environment: z.enum(["sandbox", "live"]),
        download: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.paddle_customer_id) throw new Error("No billing record for this account");

    // Re-check ownership: the transaction must belong to this customer.
    const txRes = await gatewayFetch(
      data.environment,
      `/transactions/${encodeURIComponent(data.transactionId)}`,
    );
    if (!txRes.ok) throw new Error("Invoice not found");
    const tx = await txRes.json();
    if (tx.data?.customer_id !== sub.paddle_customer_id) {
      throw new Error("Invoice not found");
    }

    const disposition = data.download ? "attachment" : "inline";
    const res = await gatewayFetch(
      data.environment,
      `/transactions/${encodeURIComponent(data.transactionId)}/invoice?disposition=${disposition}`,
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Could not generate invoice [${res.status}]: ${body}`);
    }
    const json = await res.json();
    const url = json.data?.url as string | undefined;
    if (!url) throw new Error("Invoice PDF is not ready yet — try again in a moment");
    return { url };
  });
