import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { adminUpdateReport, adminBulkStatus, adminExportCsv, adminListReports } from "@/lib/reports-auth.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2, ShieldAlert, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — CivicPulse" },
      { name: "description", content: "Manage civic issue reports, assign departments, add notes." },
    ],
  }),
  component: AdminPage,
});

const STATUSES = ["open", "in_progress", "resolved"];
const DEPARTMENTS = ["roads", "sanitation", "electricity", "general"];

function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const updateFn = useServerFn(adminUpdateReport);
  const bulkFn = useServerFn(adminBulkStatus);
  const exportFn = useServerFn(adminExportCsv);
  const listFn = useServerFn(adminListReports);

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
    try {
      const data = await listFn();
      setReports(data || []);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    }
  }

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.issue_type !== typeFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reports, statusFilter, typeFilter, search]);

  async function updateOne(id: string, patch: Record<string, unknown>) {
    try {
      await updateFn({ data: { id, ...patch } });
      toast.success("Saved");
      loadReports();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function bulkResolve() {
    if (selected.size === 0) return toast.error("Select reports first");
    try {
      const res = await bulkFn({ data: { ids: Array.from(selected), status: "resolved" } });
      toast.success(`Resolved ${res.count} reports`);
      setSelected(new Set());
      loadReports();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function downloadCsv() {
    try {
      const { csv } = await exportFn();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `civicpulse-reports-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
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
              Your account doesn't have the admin role.
            </p>
            <Link to="/" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Back home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

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
          <div className="flex gap-2">
            <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            <Button size="sm" variant="outline" onClick={downloadCsv} className="gap-1">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <h1 className="text-3xl font-bold">Report management</h1>

        {/* Filters + bulk actions */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Input
              placeholder="Search title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {["pothole", "garbage", "streetlight", "other"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <Button size="sm" onClick={bulkResolve} disabled={selected.size === 0}>
                Bulk resolve
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => {
              if (v) setSelected(new Set(filtered.map((r) => r.id)));
              else setSelected(new Set());
            }}
          />
          <span className="text-xs text-muted-foreground">Select all ({filtered.length})</span>
        </div>

        <div className="grid gap-4">
          {filtered.length === 0 && (
            <p className="text-muted-foreground">No reports match.</p>
          )}
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={(v) => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(r.id);
                      else next.delete(r.id);
                      return next;
                    });
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <CardTitle className="text-base">
                    <Link to="/report/$id" params={{ id: r.id }} className="hover:underline">
                      {r.title}
                    </Link>
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{r.issue_type}</Badge>
                    <Badge variant={r.status === "resolved" ? "default" : "secondary"}>
                      {r.status}
                    </Badge>
                    {r.ward && <Badge variant="outline">{r.ward}</Badge>}
                    {r.department && <Badge variant="outline">{r.department}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Status</label>
                  <Select
                    value={r.status}
                    onValueChange={(v) => updateOne(r.id, { status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Department</label>
                  <Select
                    value={r.department ?? "general"}
                    onValueChange={(v) => updateOne(r.id, { department: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-medium">Internal notes (admin-only)</label>
                  <Textarea
                    defaultValue={r.internal_notes ?? ""}
                    placeholder="Notes for the ops team…"
                    rows={2}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val !== (r.internal_notes ?? "")) {
                        updateOne(r.id, { internal_notes: val });
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
