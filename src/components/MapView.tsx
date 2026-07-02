import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";

const issueColors: Record<string, string> = {
  pothole: "#ef4444",
  garbage: "#22c55e",
  streetlight: "#eab308",
  other: "#6b7280",
};

function createIcon(issueType: string) {
  const color = issueColors[issueType] || "#6b7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function statusBadgeVariant(status: string) {
  if (status === "resolved") return "default";
  if (status === "open") return "secondary";
  return "outline";
}

interface Report {
  id: string;
  title: string;
  issue_type: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  status: string;
  created_at: string;
  description: string | null;
}

export default function MapView({ reports }: { reports: Report[]; filter: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: reports.length ? [reports[0].latitude, reports[0].longitude] : [20, 0],
      zoom: reports.length ? 12 : 2,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    leafletMap.current = map;
    markersLayer.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMap.current = null;
      markersLayer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersLayer.current || !leafletMap.current) return;

    markersLayer.current.clearLayers();

    if (reports.length === 0) return;

    const bounds = L.latLngBounds([]);
    let hasBounds = false;

    reports.forEach((report) => {
      const marker = L.marker([report.latitude, report.longitude], {
        icon: createIcon(report.issue_type),
      });

      const popupHtml = `
        <div style="min-width:220px;font-family:sans-serif;">
          <h3 style="font-weight:600;font-size:14px;margin:0 0 6px 0;">${escapeHtml(report.title)}</h3>
          <div style="display:flex;gap:6px;margin-bottom:8px;">
            <span style="font-size:10px;padding:2px 8px;border:1px solid #e2e8f0;border-radius:999px;">${report.issue_type}</span>
            <span style="font-size:10px;padding:2px 8px;border:1px solid #e2e8f0;border-radius:999px;background:${report.status === "resolved" ? "#22c55e" : report.status === "open" ? "#f1f5f9" : "#fff"};color:${report.status === "resolved" ? "#fff" : "#000"};">${report.status}</span>
          </div>
          ${report.photo_url ? `<img src="${escapeHtml(report.photo_url)}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" loading="lazy" />` : ""}
          ${report.description ? `<p style="font-size:12px;color:#64748b;margin:0 0 6px 0;line-height:1.4;">${escapeHtml(report.description)}</p>` : ""}
          <p style="font-size:10px;color:#94a3b8;margin:0;">${new Date(report.created_at).toLocaleDateString()}</p>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.addTo(markersLayer.current);
      bounds.extend([report.latitude, report.longitude]);
      hasBounds = true;
    });

    if (hasBounds && reports.length > 1) {
      leafletMap.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (hasBounds) {
      leafletMap.current.setView([reports[0].latitude, reports[0].longitude], 14);
    }
  }, [reports]);

  return (
    <div className="relative h-full w-full">
      {reports.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/90">
          <p className="text-muted-foreground">No reports match this filter.</p>
          <p className="text-xs text-muted-foreground">Submit the first report to see it here.</p>
        </div>
      )}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

function escapeHtml(text: string | null): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
