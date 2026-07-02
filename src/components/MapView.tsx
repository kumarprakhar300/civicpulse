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
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <p>Map area ({reports.length} reports)</p>
      {reports.length === 0 && <p>No reports to display yet.</p>}
    </div>
  );
}
