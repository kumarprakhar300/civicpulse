import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { initializePaddle, getPaddlePriceId, onCheckoutEvent } from "@/lib/paddle";
import { trackEvent } from "@/lib/analytics";

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

const STORAGE_KEY = "civicpulse.checkout.session";

type PersistedCheckout = {
  lastAttempt: CheckoutOptions | null;
  state: CheckoutState;
  failureReason: string | null;
  lastMethod: string | null;
};

function readPersisted(): PersistedCheckout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCheckout;
    if (!parsed || typeof parsed !== "object" || !parsed.lastAttempt?.priceId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted(value: PersistedCheckout | null) {
  if (typeof window === "undefined") return;
  try {
    if (!value || !value.lastAttempt) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — persistence is best-effort */
  }
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CheckoutState>("idle");
  const [lastAttempt, setLastAttempt] = useState<CheckoutOptions | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const openRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  const lastMethodRef = useRef<string | null>(null);

  // Restore the selected plan + retry state after a refresh so the buyer can
  // change payment method without re-picking a plan.
  useEffect(() => {
    const saved = readPersisted();
    if (saved) {
      setLastAttempt(saved.lastAttempt);
      // The overlay never survives a reload, so an in-flight checkout becomes
      // a resumable "cancelled" state rather than a stuck "open" one.
      setState(
        saved.state === "open" || saved.state === "opening" ? "cancelled" : saved.state,
      );
      setFailureReason(saved.failureReason ?? null);
      lastMethodRef.current = saved.lastMethod ?? null;
    }
    setHydrated(true);
  }, []);

  // Persist whenever the meaningful bits change.
  useEffect(() => {
    if (!hydrated) return;
    if (!lastAttempt || state === "completed") {
      writePersisted(null);
      return;
    }
    writePersisted({
      lastAttempt,
      state,
      failureReason,
      lastMethod: lastMethodRef.current,
    });
  }, [hydrated, lastAttempt, state, failureReason]);

  const openCheckout = useCallback(async (options: CheckoutOptions, isRetry = false) => {
    setLoading(true);
    setState("opening");
    setFailureReason(null);
    // Remember the selected plan so a retry never loses it.
    setLastAttempt(options);
    lastMethodRef.current = null;
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);
      openRef.current = true;
      setState("open");
      trackEvent("checkout_opened", {
        price_id: options.priceId,
        plan: options.planLabel,
        quantity: options.quantity ?? 1,
        is_retry: isRetry,
      });
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
      trackEvent("checkout_failed", {
        price_id: options.priceId,
        plan: options.planLabel,
        reason: "open_error",
      });
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Re-open checkout with the exact same plan so the buyer can pick another method. */
  const retryCheckout = useCallback(async () => {
    if (!lastAttempt) return;
    trackEvent("checkout_payment_method_changed", {
      price_id: lastAttempt.priceId,
      plan: lastAttempt.planLabel,
      source: "retry_reopen",
      previous_method: lastMethodRef.current ?? undefined,
    });
    try {
      await openCheckout(lastAttempt, true);
    } catch (e) {
      console.error(e);
      toast.error("Could not reopen checkout. Please try again.");
    }
  }, [lastAttempt, openCheckout]);

  const dismissFailure = useCallback(() => {
    setState("idle");
    setFailureReason(null);
    setLastAttempt(null);
    writePersisted(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onCheckoutEvent((outcome, data) => {
      if (!openRef.current) return;
      const base = {
        price_id: lastAttempt?.priceId,
        plan: lastAttempt?.planLabel,
        payment_method: lastMethodRef.current ?? undefined,
      };
      if (outcome === "payment_selected") {
        const method =
          data?.payment?.method_details?.type ?? data?.payment_method_type ?? "unknown";
        if (lastMethodRef.current && lastMethodRef.current !== method) {
          trackEvent("checkout_payment_method_changed", {
            ...base,
            source: "in_checkout",
            previous_method: lastMethodRef.current,
            payment_method: method,
          });
        }
        lastMethodRef.current = method;
        return;
      }
      if (outcome === "completed") {
        openRef.current = false;
        setState("completed");
        setFailureReason(null);
        trackEvent("checkout_succeeded", {
          ...base,
          transaction_id: data?.transaction_id ?? data?.id,
        });
        toast.success("Payment successful — activating your subscription…");
      } else if (outcome === "closed") {
        openRef.current = false;
        // Keep an existing failure visible so the retry panel survives closing the overlay.
        setState((prev) => {
          if (prev === "failed") return prev;
          trackEvent("checkout_cancelled", base);
          return "cancelled";
        });
        toast.info("Checkout closed — you have not been charged.", {
          action: { label: "Reopen", onClick: () => void retryCheckout() },
        });
      } else if (outcome === "payment_failed" || outcome === "error") {
        setState("failed");
        setFailureReason(
          outcome === "payment_failed"
            ? "That payment method was declined. Pick another one — UPI, RuPay, card, net banking or a wallet."
            : "Something went wrong during checkout.",
        );
        trackEvent("checkout_failed", { ...base, reason: outcome });
        toast.error("Payment didn't go through", {
          description: "Try a different payment method — your plan is saved.",
          action: { label: "Try again", onClick: () => void retryCheckout() },
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [retryCheckout, lastAttempt]);


  return {
    openCheckout,
    retryCheckout,
    dismissFailure,
    loading,
    state,
    lastAttempt,
    failureReason,
    hydrated,
    /** True when a plan was selected before a refresh and checkout can be resumed. */
    canResume: !!lastAttempt && state !== "completed",
  };
}
