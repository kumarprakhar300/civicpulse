import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicReports } from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { MapPin, Filter, Loader2 } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Public Map — CivicPulse" },
      {
        name: "description",
        content: "View civic issue reports on an interactive map.",
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
    filter === "all"
      ? reports
      : reports.filter((r) => r.issue_type === filter);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {issueFilters.map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {MapView ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <MapView reports={filteredReports} filter={filter} />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading map...
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="border-t border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Showing {filteredReports.length} of {reports.length} reports
      </div>
    </div>
  );
}
