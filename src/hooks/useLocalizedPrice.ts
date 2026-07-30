import { useEffect, useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

/**
 * Resolves the price a visitor will actually be charged, in their own currency.
 * Indian visitors see INR (UPI / RuPay / net banking are offered at checkout),
 * everyone else sees their local converted amount.
 * Falls back to the passed-in label if the preview cannot be fetched.
 */
export function useLocalizedPrice(priceId: string, fallbackLabel: string) {
  const [label, setLabel] = useState(fallbackLabel);
  const [currency, setCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLabel(fallbackLabel);
    setLoading(true);

    (async () => {
      try {
        await initializePaddle();
        const paddlePriceId = await getPaddlePriceId(priceId);
        const result = await window.Paddle.PricePreview({
          items: [{ priceId: paddlePriceId, quantity: 1 }],
        });
        const item = result?.data?.details?.lineItems?.[0];
        const formatted = item?.formattedTotals?.subtotal;
        if (!cancelled && formatted) {
          setLabel(formatted);
          setCurrency(result?.data?.currencyCode ?? null);
        }
      } catch {
        // keep the fallback label
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [priceId, fallbackLabel]);

  return { label, currency, loading };
}
