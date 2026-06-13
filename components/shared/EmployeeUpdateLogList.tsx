import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { formatDate } from "@/lib/utils";
import type { EmployeeUpdateLog } from "@/lib/types";
import { MapPin } from "lucide-react";

interface EmployeeUpdateLogListProps {
  logs: EmployeeUpdateLog[];
  emptyMessage?: string;
}

export function EmployeeUpdateLogList({
  logs,
  emptyMessage = "No update history recorded yet.",
}: EmployeeUpdateLogListProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="border border-dswd-border rounded-lg p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="font-medium text-dswd-navy text-sm">{log.summary}</p>
            <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
          </div>

          {log.status_name && (
            <p className="text-xs text-muted-foreground">
              Status: <span className="text-foreground font-medium">{log.status_name}</span>
            </p>
          )}

          {log.deployment_location && (
            <p className="text-xs text-muted-foreground">
              Deployment: <span className="text-foreground">{log.deployment_location}</span>
            </p>
          )}

          {hasValidCoordinates(log.latitude, log.longitude) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              <MapPin className="h-3 w-3 shrink-0" />
              <a
                href={getMapUrl(log.latitude, log.longitude)!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dswd-blue hover:underline font-medium"
                title="Open location in Google Maps"
              >
                {formatCoordinates(log.latitude, log.longitude)}
              </a>
              <span className="text-muted-foreground">· View on map</span>
            </p>
          )}

          {log.changes && Object.keys(log.changes).length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-dswd-border">
              {Object.entries(log.changes).map(([field, change]) => (
                <li key={field}>
                  <span className="font-medium capitalize">{field.replace(/_/g, " ")}</span>:{" "}
                  {change.from ?? "—"} → {change.to ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
