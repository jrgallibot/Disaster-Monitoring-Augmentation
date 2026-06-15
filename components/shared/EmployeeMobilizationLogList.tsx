import { MobilizationStatusBadge } from "@/components/shared/MobilizationStatusBadge";
import { formatMobilizationDate } from "@/lib/mobilization";
import { formatDate } from "@/lib/utils";
import type { EmployeeMobilizationLog, EmployeeWithRelations } from "@/lib/types";
import { CalendarDays } from "lucide-react";

interface EmployeeMobilizationLogListProps {
  employee?: EmployeeWithRelations;
  logs: EmployeeMobilizationLog[];
  emptyMessage?: string;
  tabError?: string;
}

export function EmployeeMobilizationLogList({
  employee,
  logs,
  emptyMessage = "No augmentation status changes logged yet.",
  tabError,
}: EmployeeMobilizationLogListProps) {
  return (
    <div className="space-y-4">
      {employee && (
        <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-2">
          <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
            Current Augmentation Status
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <MobilizationStatusBadge status={employee.mobilization_status ?? "mobilized"} />
            {employee.mobilization_updated_at && (
              <span className="text-xs text-muted-foreground">
                Last updated: {formatDate(employee.mobilization_updated_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-4 w-4 shrink-0" />
            Mobilized: {formatMobilizationDate(employee.mobilized_at)}
          </p>
          {employee.demobilized_at && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-4 w-4 shrink-0" />
              Demobilized: {formatMobilizationDate(employee.demobilized_at)}
            </p>
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
          Augmentation Change History ({logs.length})
        </p>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-dswd-border rounded-lg p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <MobilizationStatusBadge status={log.mobilization_status} />
                  <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  Mobilized: {formatMobilizationDate(log.mobilized_at)}
                </p>
                {log.demobilized_at ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    Demobilized: {formatMobilizationDate(log.demobilized_at)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No demobilization date recorded</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
