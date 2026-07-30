import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { initializePaddle, getPaddlePriceId, onCheckoutEvent } from "@/lib/paddle";

export type CheckoutState =
  | "idle"
  | "opening"
  | "open"
  | "completed"
  | "cancelled"
  | "failed";

export type CheckoutOptions = {
  priceId: string;
  planLabel?: string;
  quantity?: number;
  customerEmail?: string;
  customData?: Record<string, string>;
  successUrl?: string;
};

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CheckoutState>("idle");
  const [lastAttempt, setLastAttempt] = useState<CheckoutOptions | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const openRef = useRef(false);

  const openCheckout = useCallback(async (options: CheckoutOptions) => {
    setLoading(true);
    setState("opening");
    setFailureReason(null);
    // Remember the selected plan so a retry never loses it.
    setLastAttempt(options);
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
      setFailureReason("We couldn't open checkout. Please try again.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Re-open checkout with the exact same plan so the buyer can pick another method. */
  const retryCheckout = useCallback(async () => {
    if (!lastAttempt) return;
    try {
      await openCheckout(lastAttempt);
    } catch (e) {
      console.error(e);
      toast.error("Could not reopen checkout. Please try again.");
    }
  }, [lastAttempt, openCheckout]);

  const dismissFailure = useCallback(() => {
    setState("idle");
    setFailureReason(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onCheckoutEvent((outcome) => {
      if (!openRef.current) return;
      if (outcome === "completed") {
        openRef.current = false;
        setState("completed");
        setFailureReason(null);
        toast.success("Payment successful — activating your subscription…");
      } else if (outcome === "closed") {
        openRef.current = false;
        // Keep an existing failure visible so the retry panel survives closing the overlay.
        setState((prev) => (prev === "failed" ? prev : "cancelled"));
        if (openRef.current === false) {
          toast.info("Checkout closed — you have not been charged.", {
            action: { label: "Reopen", onClick: () => void retryCheckout() },
          });
        }
      } else if (outcome === "payment_failed" || outcome === "error") {
        setState("failed");
        setFailureReason(
          outcome === "payment_failed"
            ? "That payment method was declined. Pick another one — UPI, RuPay, card, net banking or a wallet."
            : "Something went wrong during checkout.",
        );
        toast.error("Payment didn't go through", {
          description: "Try a different payment method — your plan is saved.",
          action: { label: "Try again", onClick: () => void retryCheckout() },
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [retryCheckout]);

  return {
    openCheckout,
    retryCheckout,
    dismissFailure,
    loading,
    state,
    lastAttempt,
    failureReason,
  };
}
