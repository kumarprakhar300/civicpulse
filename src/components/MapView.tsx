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

export default function MapView({
  reports,
  selectedId,
  userLocation,
  clickedPoint,
  onMapClick,
}: {
  reports: Report[];
  filter: string;
  selectedId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  clickedPoint?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
}) {

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const overlayLayer = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);


  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: [22.9734, 78.6569],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    // Dark techy tiles (CartoDB Dark Matter)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    leafletMap.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
    overlayLayer.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
      leafletMap.current = null;
      markersLayer.current = null;
      overlayLayer.current = null;
    };

  }, []);

  useEffect(() => {
    const layer = markersLayer.current;
    const map = leafletMap.current;
    if (!layer || !map) return;

    layer.clearLayers();

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
      marker.addTo(layer);
      bounds.extend([report.latitude, report.longitude]);
      hasBounds = true;
    });

    // Do NOT auto-fit — keep the India view stable. User pans/zooms.
  }, [reports]);

  // Pan to a selected report when the sidebar clicks one
  useEffect(() => {
    const map = leafletMap.current;
    if (!map || !selectedId) return;
    const r = reports.find((x) => x.id === selectedId);
    if (!r) return;
    map.flyTo([r.latitude, r.longitude], 14, { duration: 0.8 });
  }, [selectedId, reports]);

  // User location + clicked point overlays
  useEffect(() => {
    const layer = overlayLayer.current;
    const map = leafletMap.current;
    if (!layer || !map) return;
    layer.clearLayers();

    if (userLocation) {
      const youIcon = L.divIcon({
        className: "user-loc-marker",
        html: `<div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:#22d3ee;opacity:0.35;animation:pulse 2s infinite;"></div>
          <div style="position:absolute;inset:5px;border-radius:50%;background:#06b6d4;border:2px solid white;box-shadow:0 0 10px #22d3ee;"></div>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: youIcon })
        .bindPopup("<b>You are here</b>")
        .addTo(layer);
    }

    if (clickedPoint) {
      const pinIcon = L.divIcon({
        className: "clicked-marker",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 0 12px #f59e0b;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([clickedPoint.lat, clickedPoint.lng], { icon: pinIcon })
        .bindPopup("<b>Selected point</b><br/>Nearby reports shown in sidebar")
        .addTo(layer);
      L.circle([clickedPoint.lat, clickedPoint.lng], {
        radius: 2000,
        color: "#f59e0b",
        weight: 1,
        opacity: 0.6,
        fillColor: "#f59e0b",
        fillOpacity: 0.08,
      }).addTo(layer);
    }
  }, [userLocation, clickedPoint]);



  return (
    <div className="relative h-full w-full">
      {reports.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[500] mx-auto w-fit rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs text-slate-300 backdrop-blur">
          No reports match this filter.
        </div>
      )}
      <div ref={mapRef} style={{ height: "100%", width: "100%", background: "#0b1220" }} />
    </div>
  );
}


function escapeHtml(text: string | null): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
