import { Suspense, lazy, useEffect, useRef, useState } from "react";

const RotatingCube = lazy(() => import("./RotatingCube").then((m) => ({ default: m.RotatingCube })));

export function LazyRotatingCube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setActive(e.isIntersecting);
          if (e.isIntersecting) setVisible(true);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[440px] w-full"
      aria-label="3D issue cube showcase"
    >
      {visible ? (
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-64 w-full bg-gradient-to-r from-fuchsia-500/5 via-cyan-500/5 to-indigo-500/5 blur-3xl" />
            </div>
          }
        >
          <RotatingCube active={active} />
        </Suspense>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-64 w-full bg-gradient-to-r from-fuchsia-500/5 via-cyan-500/5 to-indigo-500/5 blur-3xl" />
        </div>
      )}
    </div>
  );
}
