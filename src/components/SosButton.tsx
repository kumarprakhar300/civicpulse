import { useRouterState } from "@tanstack/react-router";
import { Siren } from "lucide-react";

/**
 * Floating SOS action button — one-tap shortcut to file an urgent report.
 * Hidden on the report page itself and on auth screens.
 */
export function SosButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/report") || pathname.startsWith("/auth")) return null;

  return (
    <a
      href="/report?sos=1"
      aria-label="Report an urgent civic issue"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-red-400/40 bg-gradient-to-br from-red-500 to-rose-600 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-5px_rgba(244,63,94,0.6)] backdrop-blur-md transition hover:scale-105 hover:shadow-[0_14px_40px_-5px_rgba(244,63,94,0.8)] active:scale-95 sm:bottom-6 sm:right-6"
    >

      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-70" />
        <Siren className="relative h-5 w-5" />
      </span>
      <span className="tracking-wider">SOS</span>
    </Link>
  );
}
