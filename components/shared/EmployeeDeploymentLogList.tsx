"use client";

import { Badge } from "@/components/ui/badge";
import { DeploymentLogEditor } from "@/components/shared/DeploymentLogEditor";
import { YesterdayDeploymentBackfill } from "@/components/shared/YesterdayDeploymentBackfill";
import { statusRequiresDeploymentLocation, statusRequiresDeploymentRemarks } from "@/lib/deployment";
import { isDeploymentLogOnDateKey } from "@/lib/deployment-yesterday";
import { getYesterdayDateKey } from "@/lib/report/date-bounds";
import { DEPLOYMENT_DAILY_RESET_NOTICE } from "@/lib/deployment-daily";
import { formatDate } from "@/lib/utils";
import type { EmployeeDeploymentLog, EmployeeWithRelations, LibraryStatus } from "@/lib/types";
import { MapPin, MessageSquare } from "lucide-react";

interface EmployeeDeploymentLogListProps {
  employee?: EmployeeWithRelations;
  logs: EmployeeDeploymentLog[];
  statuses?: LibraryStatus[];
  emptyMessage?: string;
  tabError?: string;
  editableActualTask?: boolean;
  onDeploymentLogsSaved?: (logs: EmployeeDeploymentLog[]) => void;
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
  editableActualTask = false,
  onDeploymentLogsSaved,
}: EmployeeDeploymentLogListProps) {
  const yesterdayKey = getYesterdayDateKey();

  return (
    <div className="space-y-4">
      {employee && (
        <div className="rounded-lg border border-dswd-border bg-dswd-light p-4 space-y-2">
          <p className="text-xs font-semibold text-dswd-navy uppercase tracking-wide">
            Today&apos;s Deployment Assignment
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {employee.deploymentPending ? (
              <span className="text-sm text-amber-800 font-medium">Not set for today</span>
            ) : employee.status ? (
              <Badge color={employee.status.color}>{employee.status.name}</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">No status assigned</span>
            )}
            {employee.deployment_set_at && !employee.deploymentPending && (
              <span className="text-xs text-muted-foreground">
                Set today: {formatDate(employee.deployment_set_at)}
              </span>
            )}
          </div>
          {employee.deploymentPending && (
            <p className="text-xs text-amber-800">{DEPLOYMENT_DAILY_RESET_NOTICE}</p>
          )}
          {!employee.deploymentPending &&
          statusRequiresDeploymentLocation(employee.status?.name) &&
          employee.actual_task ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Actual Task:</span>{" "}
              {employee.actual_task}
            </p>
          ) : null}
          {!employee.deploymentPending && employee.deployment_location ? (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{employee.deployment_location}</span>
            </p>
          ) : !employee.deploymentPending ? (
            <p className="text-xs text-muted-foreground">No deployment location on file</p>
          ) : null}
          {!employee.deploymentPending && employee.deployment_remarks ? (
            <p className="text-sm text-muted-foreground flex items-start gap-1">
              <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <span className="font-medium text-foreground">Remarks:</span>{" "}
                {employee.deployment_remarks}
              </span>
            </p>
          ) : null}
        </div>
      )}

      {tabError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm">
          {tabError}
        </div>
      )}

      {editableActualTask && statuses.length > 0 && (
        <YesterdayDeploymentBackfill
          logs={logs}
          statuses={statuses}
          onSaved={onDeploymentLogsSaved}
        />
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
              const isYesterdayLog = isDeploymentLogOnDateKey(log, yesterdayKey);
              const canEditLog = editableActualTask && !isYesterdayLog;

              return (
                <div key={log.id} className="border border-dswd-border rounded-lg p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Badge color={color}>{log.status_name}</Badge>
                    <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                  </div>
                  {canEditLog ? (
                    <DeploymentLogEditor
                      log={log}
                      statuses={statuses}
                      onSaved={onDeploymentLogsSaved}
                    />
                  ) : (
                    <>
                      {log.actual_task ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Actual Task:</span>{" "}
                          {log.actual_task}
                        </p>
                      ) : null}
                      {log.deployment_location ? (
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{log.deployment_location}</span>
                        </p>
                      ) : statusRequiresDeploymentLocation(log.status_name) ? (
                        <p className="text-xs text-muted-foreground">No deployment location recorded</p>
                      ) : null}
                      {log.deployment_remarks ? (
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-medium text-foreground">Remarks:</span>{" "}
                            {log.deployment_remarks}
                          </span>
                        </p>
                      ) : statusRequiresDeploymentRemarks(log.status_name) ? (
                        <p className="text-xs text-muted-foreground">No remarks recorded</p>
                      ) : null}
                    </>
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
