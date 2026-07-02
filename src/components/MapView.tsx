import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify:center;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
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
}: {
  reports: Report[];
  filter: string;
}) {
  const defaultCenter: [number, number] = reports.length
    ? [reports[0].latitude, reports[0].longitude]
    : [20, 0];
  const defaultZoom = reports.length ? 12 : 2;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createIcon(report.issue_type)}
        >
          <Popup>
            <Card className="w-64 border-0 shadow-none">
              <CardContent className="p-0">
                <h3 className="font-semibold text-sm">{report.title}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {report.issue_type}
                  </Badge>
                  <Badge
                    variant={
                      report.status === "resolved"
                        ? "default"
                        : report.status === "open"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-[10px]"
                  >
                    {report.status}
                  </Badge>
                </div>
                {report.photo_url && (
                  <img
                    src={report.photo_url}
                    alt={report.title}
                    className="mt-2 h-32 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                {report.description && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                    {report.description}
                  </p>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
