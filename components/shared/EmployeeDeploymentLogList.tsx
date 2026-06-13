import { Badge } from "@/components/ui/badge";
import { statusRequiresDeploymentLocation } from "@/lib/deployment";
import { formatDate } from "@/lib/utils";
import type { EmployeeDeploymentLog, EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { MapPin } from "lucide-react";

interface EmployeeDeploymentLogListProps {
  employee?: EmployeeWithRelations;
  logs: EmployeeDeploymentLog[];
  statuses?: LibraryStatus[];
  emptyMessage?: string;
  tabError?: string;
}

function getStatusColor(statusId: string | null, statuses: LibraryStatus[]): string | undefined {
  if (!statusId) return undefined;
  return statuses.find((s) => s.id === statusId)?.color;
}

export function EmployeeDeploymentLogList({
  employee,
  logs,
  statuses = [],
  emptyMessage = "No deployment status changes logged yet.",
  tabError,
}: EmployeeDeploymentLogListProps) {
  return (
    <div className="space-y-4">
      {employee && (
        <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-2">
          <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
            Current Deployment Assignment
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {employee.status ? (
              <Badge color={employee.status.color}>{employee.status.name}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">No status assigned</span>
            )}
            <span className="text-xs text-muted-foreground">
              Last record update: {formatDate(employee.updated_at)}
            </span>
          </div>
          {statusRequiresDeploymentLocation(employee.status?.name) && employee.deployment_location ? (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{employee.deployment_location}</span>
            </p>
          ) : employee.deployment_location ? (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{employee.deployment_location}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No deployment location on file</p>
          )}
        </div>
      )}

      {tabError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
          {tabError}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide mb-3">
          Deployment Change History ({logs.length})
        </p>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const color = getStatusColor(log.status_id, statuses) ?? employee?.status?.color;
              return (
                <div key={log.id} className="border border-dswd-border rounded-lg p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Badge color={color}>{log.status_name}</Badge>
                    <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                  </div>
                  {log.deployment_location ? (
                    <p className="text-sm text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{log.deployment_location}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No deployment location recorded</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
