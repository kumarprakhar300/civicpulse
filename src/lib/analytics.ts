/**
 * Lightweight analytics event bus.
 *
 * Events are forwarded to whatever analytics sink happens to be present at
 * runtime (GA4 gtag, PostHog, or a plain dataLayer) and always mirrored to a
 * local in-memory buffer so funnels can be inspected in the console during
 * development without any provider configured.
 */

export type AnalyticsEvent =
  | "checkout_opened"
  | "checkout_payment_method_changed"
  | "checkout_succeeded"
  | "checkout_failed"
  | "checkout_cancelled";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

type Sinked = { event: AnalyticsEvent; props: AnalyticsProps; at: string };

const buffer: Sinked[] = [];
const MAX_BUFFER = 100;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    posthog?: { capture?: (event: string, props?: AnalyticsProps) => void };
    __civicAnalytics?: Sinked[];
  }
}

export function trackEvent(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  const payload: AnalyticsProps = { ...props };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  const record: Sinked = { event, props: payload, at: new Date().toISOString() };
  buffer.push(record);
  if (buffer.length > MAX_BUFFER) buffer.shift();

  if (typeof window === "undefined") return;

  window.__civicAnalytics = buffer;

  try {
    window.gtag?.("event", event, payload);
    window.posthog?.capture?.(event, payload);
    if (!window.gtag && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...payload });
    }
  } catch (e) {
    console.warn("analytics sink error", e);
  }

  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${event}`, payload);
  }
}

/** Recent events, newest last — useful for debugging conversion drop-offs. */
export function getTrackedEvents(): ReadonlyArray<Sinked> {
  return buffer;
}
