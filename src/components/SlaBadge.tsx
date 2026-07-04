import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export function SlaBadge({
  dueAt,
  status,
  resolvedAt,
}: {
  dueAt: string | null | undefined;
  status: string;
  resolvedAt?: string | null;
}) {
  if (!dueAt) return null;

  if (status === "resolved") {
    const onTime = resolvedAt ? new Date(resolvedAt) <= new Date(dueAt) : true;
    return (
      <Badge variant={onTime ? "default" : "destructive"} className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {onTime ? "On time" : "Late"}
      </Badge>
    );
  }

  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diffMs = due - now;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const mins = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const label =
    hours >= 24
      ? `${Math.floor(hours / 24)}d ${hours % 24}h`
      : hours >= 1
        ? `${hours}h ${mins}m`
        : `${mins}m`;

  if (overdue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Overdue {label}
      </Badge>
    );
  }
  const warning = diffMs < 1000 * 60 * 60 * 12;
  return (
    <Badge variant={warning ? "secondary" : "outline"} className="gap-1">
      <Clock className="h-3 w-3" />
      SLA {label} left
    </Badge>
  );
}
