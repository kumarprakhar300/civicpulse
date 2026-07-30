import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { initializePaddle, getPaddlePriceId, onCheckoutEvent } from "@/lib/paddle";

export type CheckoutState = "idle" | "opening" | "open" | "completed" | "cancelled" | "failed";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CheckoutState>("idle");
  const openRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onCheckoutEvent((outcome) => {
      if (!openRef.current) return;
      if (outcome === "completed") {
        openRef.current = false;
        setState("completed");
        toast.success("Payment successful — activating your subscription…");
      } else if (outcome === "closed") {
        openRef.current = false;
        setState("cancelled");
        toast.info("Checkout cancelled — you have not been charged.");
      } else if (outcome === "payment_failed" || outcome === "error") {
        setState("failed");
        toast.error(
          outcome === "payment_failed"
            ? "Payment failed. Try another method (UPI, RuPay, card, net banking or wallet)."
            : "Something went wrong with checkout. Please try again.",
        );
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const openCheckout = async (options: {
    priceId: string;
    quantity?: number;
    customerEmail?: string;
    customData?: Record<string, string>;
    successUrl?: string;
  }) => {
    setLoading(true);
    setState("opening");
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);
      openRef.current = true;
      setState("open");
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.customData,
        settings: {
          displayMode: "overlay",
          successUrl:
            options.successUrl || `${window.location.origin}/dashboard?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      openRef.current = false;
      setState("failed");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading, state };
}
