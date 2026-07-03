import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";

interface Point {
  latitude: number;
  longitude: number;
}

export default function HeatmapView({ points }: { points: Point[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const heatLayer = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: points.length ? [points[0].latitude, points[0].longitude] : [20, 0],
      zoom: points.length ? 11 : 2,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      heatLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    if (heatLayer.current) {
      map.removeLayer(heatLayer.current);
      heatLayer.current = null;
    }
    if (points.length === 0) return;

    const latlngs = points.map((p) => [p.latitude, p.longitude, 0.6] as [number, number, number]);
    // @ts-ignore leaflet.heat augments L
    heatLayer.current = L.heatLayer(latlngs, {
      radius: 25,
      blur: 20,
      maxZoom: 15,
    }).addTo(map);

    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    if (points.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    else map.setView([points[0].latitude, points[0].longitude], 13);
  }, [points]);

  return (
    <div className="relative h-full w-full">
      {points.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 text-sm text-muted-foreground">
          No reports yet — the heatmap will populate as citizens submit issues.
        </div>
      )}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
