import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicReports } from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "India Map — CivicPulse" },
      {
        name: "description",
        content: "Live civic issue reports across India on an interactive map.",
      },
    ],
  }),
  component: MapPage,
});

const issueFilters = [
  { value: "all", label: "All" },
  { value: "pothole", label: "Potholes" },
  { value: "garbage", label: "Garbage" },
  { value: "streetlight", label: "Streetlights" },
  { value: "other", label: "Other" },
];

function MapPage() {
  const [filter, setFilter] = useState("all");
  const [MapView, setMapView] = useState<React.ComponentType<{
    reports: any[];
    filter: string;
  }> | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["public-reports"],
    queryFn: () => getPublicReports(),
  });

  useEffect(() => {
    import("@/components/MapView").then((mod) => {
      setMapView(() => mod.default);
    });
  }, []);

  const filteredReports =
    filter === "all" ? reports : reports.filter((r) => r.issue_type === filter);

  return (
    <PageShell fullHeight contained={false}>
      <div className="relative z-10 border-b border-white/5 bg-slate-950/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">India · Civic map</h1>
            <p className="text-xs text-slate-400">Live reports restricted to India</p>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 backdrop-blur-xl">
            <Filter className="mx-1 h-3.5 w-3.5 text-slate-400" />
            {issueFilters.map((f) => (
              <Button
                key={f.value}
                variant="ghost"
                size="sm"
                onClick={() => setFilter(f.value)}
                className={`h-7 rounded-full px-3 text-xs ${
                  filter === f.value
                    ? "bg-white text-slate-950 hover:bg-white/90"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 p-4">
        <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            </div>
          )}
          {MapView ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
                </div>
              }
            >
              <MapView reports={filteredReports} filter={filter} />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Loading map...
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 border-t border-white/5 bg-slate-950/40 px-6 py-2 text-xs text-slate-400">
        Showing {filteredReports.length} of {reports.length} reports · India only
      </div>
    </PageShell>
  );
}
