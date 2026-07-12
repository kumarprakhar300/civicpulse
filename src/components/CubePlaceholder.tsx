interface CubePlaceholderProps {
  reducedMotion?: boolean;
}

export function CubePlaceholder({ reducedMotion }: CubePlaceholderProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Soft ambient glow behind the loader */}
        <div className="absolute inset-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full bg-gradient-to-r from-fuchsia-500/20 via-cyan-500/20 to-indigo-500/20 blur-2xl" />
        {/* CSS-only spinning ring — static when reduced motion is preferred */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-xl border-2 border-white/10" />
          <div
            className={
              "absolute inset-0 rounded-xl border-2 border-transparent border-t-cyan-300/80 border-r-fuchsia-300/80" +
              (reducedMotion ? "" : " animate-spin")
            }
            style={{ animationDuration: reducedMotion ? undefined : "1.2s" }}
          />
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
        Loading 3D showcase
      </p>
    </div>
  );
}
