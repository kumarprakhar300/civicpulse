import { RefreshCw } from "lucide-react";

export function StateMessage({
  tone,
  icon,
  title,
  description,
  onRetry,
  retrying,
}: {
  tone: "error" | "empty";
  icon: React.ReactNode;
  title: string;
  description: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-400/30 bg-rose-500/[0.06] text-rose-100"
      : "border-white/10 bg-white/[0.02] text-slate-200";
  const iconTone = tone === "error" ? "text-rose-300" : "text-slate-400";
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-xl border p-4 ${toneClasses}`}
      role={tone === "error" ? "alert" : undefined}
    >
      <div className="flex items-center gap-2">
        <span className={iconTone}>{icon}</span>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  );
}
