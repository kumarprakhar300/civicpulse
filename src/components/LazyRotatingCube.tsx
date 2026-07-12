import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { CubePlaceholder } from "./CubePlaceholder";
import type { RotatingCubeProps } from "./RotatingCube";

let prefetched = false;

function prefetchRotatingCube() {
  if (prefetched) return;
  prefetched = true;
  // Pre-warm the chunk without rendering it. This fires the same dynamic
  // import used below so the module is already in cache when visible.
  import("./RotatingCube").catch(() => {
    // If prefetch fails (e.g. network), the visible import will retry.
    prefetched = false;
  });
}

export function LazyRotatingCube() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [CubeComponent, setCubeComponent] = useState<React.ComponentType<RotatingCubeProps> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const importingRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();


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

  // Load the heavy component as soon as the container becomes visible.
  useEffect(() => {
    if (!visible || CubeComponent || importingRef.current) return;
    importingRef.current = true;
    import("./RotatingCube")
      .then((m) => {
        setCubeComponent(() => m.RotatingCube);
      })
      .catch(() => {
        importingRef.current = false;
      });
  }, [visible, CubeComponent]);

  // Start the fade-in only after the component has been mounted in the DOM
  // so the opacity transition is visible. Skip the fade entirely for users
  // who prefer reduced motion.
  useEffect(() => {
    if (!CubeComponent) return;
    if (reducedMotion) {
      setLoaded(true);
      return;
    }
    const timer = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timer);
  }, [CubeComponent, reducedMotion]);

  // Unmount the placeholder once the fade-out finishes so it stops rendering.
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => setShowPlaceholder(false), 550);
    return () => clearTimeout(timer);
  }, [loaded]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[440px] w-full"
      aria-label="3D issue cube showcase"
    >
      {showPlaceholder && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500 ease-out",
            loaded ? "pointer-events-none opacity-0" : "opacity-100"
          )}
          aria-hidden={loaded}
        >
          <CubePlaceholder />
        </div>
      )}
      {CubeComponent && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500 ease-out",
            loaded ? "opacity-100" : "opacity-0"
          )}
        >
          <CubeComponent active={active} />
        </div>
      )}
    </div>
  );
}
