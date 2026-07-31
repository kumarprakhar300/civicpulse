import { resolvePaddlePrice } from "@/lib/payments.functions";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

export type CheckoutOutcome =
  | "completed"
  | "closed"
  | "error"
  | "payment_failed"
  | "payment_selected";
type Listener = (outcome: CheckoutOutcome, data?: any) => void;
const listeners = new Set<Listener>();

/** Subscribe to checkout lifecycle events (success / cancel / failure). */
export function onCheckoutEvent(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(outcome: CheckoutOutcome, data?: any) {
  listeners.forEach((l) => {
    try {
      l(outcome, data);
    } catch (e) {
      console.error("checkout listener error", e);
    }
  });
}

function paddleEventCallback(event: { name?: string; data?: any }) {
  switch (event?.name) {
    case "checkout.completed":
      emit("completed", event.data);
      break;
    case "checkout.closed":
      emit("closed", event.data);
      break;
    case "checkout.payment.failed":
      emit("payment_failed", event.data);
      break;
    case "checkout.payment.selected":
    case "checkout.payment.initiated":
      emit("payment_selected", event.data);
      break;
    case "checkout.error":
      emit("error", event.data);
      break;
    default:
      break;
  }
}

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");

  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.Paddle) {
      const envName = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(envName);
      window.Paddle.Initialize({ token: clientToken, eventCallback: paddleEventCallback });
      paddleInitialized = true;
      return resolve();
    }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      const envName = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
      window.Paddle.Environment.set(envName);
      window.Paddle.Initialize({ token: clientToken, eventCallback: paddleEventCallback });
      paddleInitialized = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  return resolvePaddlePrice({ data: { priceId, environment } });
}
