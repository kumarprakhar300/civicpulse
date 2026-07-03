import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — CivicPulse" },
      { name: "description", content: "Manage civic issue reports and update their status." },
    ],
  }),
  component: AdminPage,
});

const statuses = ["open", "in_progress", "resolved"];

function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const admin = (roles || []).some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) await loadReports();
      setLoading(false);
    })();
  }, []);

  async function loadReports() {
    const { data, error } = await (supabase as any)
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setReports(data || []);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await (supabase as any)
      .from("reports")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    loadReports();
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return;
    const { error } = await (supabase as any).from("reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Report deleted");
    loadReports();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Admin access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account doesn't have the admin role. Contact the project owner to be granted
              access.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Back home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse Admin
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold">Report management</h1>
        <div className="grid gap-4">
          {reports.length === 0 && (
            <p className="text-muted-foreground">No reports yet.</p>
          )}
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">{r.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{r.issue_type}</Badge>
                    <Badge
                      variant={
                        r.status === "resolved"
                          ? "default"
                          : r.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" size="sm" onClick={() => deleteReport(r.id)}>
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-[160px_1fr]">
                {r.photo_url && (
                  <img
                    src={r.photo_url}
                    alt=""
                    className="h-32 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                )}
                <div className="text-sm">
                  {r.description && <p className="mb-2">{r.description}</p>}
                  <p className="text-xs text-muted-foreground">
                    📍 {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
