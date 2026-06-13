import { formatCoordinates, getMapUrl, hasValidCoordinates } from "@/lib/geo";
import { formatDate } from "@/lib/utils";
import type { EmployeeUpdateLog } from "@/lib/types";
import { MapPin } from "lucide-react";

interface EmployeeUpdateLogListProps {
  logs: EmployeeUpdateLog[];
  emptyMessage?: string;
  tabError?: string;
}

export function EmployeeUpdateLogList({
  logs,
  emptyMessage = "No profile update history recorded yet.",
  tabError,
}: EmployeeUpdateLogListProps) {
  return (
    <div className="space-y-4">
      {tabError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
          {tabError}
        </div>
      )}

      <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
        Profile Update History ({logs.length})
      </p>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="border border-dswd-border rounded-lg p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-medium text-dswd-navy text-sm">{log.summary}</p>
                <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
              </div>

              {log.changes && Object.keys(log.changes).length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(log.changes).map(([field, change]) => (
                    <li key={field}>
                      <span className="font-medium capitalize">{field.replace(/_/g, " ")}</span>:{" "}
                      {change.from ?? "—"} → {change.to ?? "—"}
                    </li>
                  ))}
                </ul>
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
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
