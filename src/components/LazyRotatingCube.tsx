import { Suspense, lazy, useEffect, useRef, useState } from "react";

const RotatingCube = lazy(() => import("./RotatingCube").then((m) => ({ default: m.RotatingCube })));

let prefetched = false;

function prefetchRotatingCube() {
  if (prefetched) return;
  prefetched = true;
  // Pre-warm the chunk without rendering it. This fires the same dynamic
  // import used by React.lazy so the module is already in cache when visible.
  import("./RotatingCube").catch(() => {
    // If prefetch fails (e.g. network), React.lazy will retry on visibility.
    prefetched = false;
  });
}

export function LazyRotatingCube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  // Idle prefetch: load the chunk when the browser has spare time.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const idleId = "requestIdleCallback" in window
      ? (window as typeof window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback(
          prefetchRotatingCube,
          { timeout: 2000 },
        )
      : setTimeout(prefetchRotatingCube, 500);
    return () => {
      if (typeof idleId === "number" && "cancelIdleCallback" in window) {
        (window as typeof window & { cancelIdleCallback: typeof cancelIdleCallback }).cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
    };
  }, []);

  // Near-viewport prefetch + visibility activation.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Larger rootMargin triggers the prefetch well before the section is visible.
    const prefetchIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) prefetchRotatingCube();
        }
      },
      { threshold: 0, rootMargin: "300px 0px 300px 0px" },
    );

    const visibleIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setActive(e.isIntersecting);
          if (e.isIntersecting) setVisible(true);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
    );

    prefetchIo.observe(el);
    visibleIo.observe(el);
    return () => {
      prefetchIo.disconnect();
      visibleIo.disconnect();
    };
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
