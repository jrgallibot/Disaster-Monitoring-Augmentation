import { isDeploymentPendingToday } from "@/lib/deployment-daily";
import { createServiceClient } from "@/lib/supabase/service";
import {
  addDaysToDateKey,
  getManilaDateKeyFromTimestamp,
  getReportDateBounds,
} from "@/lib/report/date-bounds";
import type { EmployeeDeploymentLog, EmployeeWithRelations, LibraryStatus } from "@/lib/types";

/** Same calendar-day matching used by deployment history / yesterday backfill UI. */
export function isDeploymentLogForDateKey(
  log: Pick<EmployeeDeploymentLog, "created_at">,
  dateKey: string
): boolean {
  return getManilaDateKeyFromTimestamp(log.created_at) === dateKey;
}

export async function fetchLatestDeploymentLogsForDateKey(
  employeeIds: string[],
  dateKey: string
): Promise<Map<string, EmployeeDeploymentLog>> {
  if (employeeIds.length === 0) {
    return new Map();
  }

  const windowStart = getReportDateBounds(addDaysToDateKey(dateKey, -2)).start;
  const windowEnd = getReportDateBounds(addDaysToDateKey(dateKey, 2)).end;
  const service = createServiceClient();
  const { data, error } = await service
    .from("employee_deployment_logs")
    .select("*")
    .in("employee_id", employeeIds)
    .gte("created_at", windowStart)
    .lt("created_at", windowEnd)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, EmployeeDeploymentLog>();
  for (const log of (data ?? []) as EmployeeDeploymentLog[]) {
    if (!isDeploymentLogForDateKey(log, dateKey)) continue;
    if (!map.has(log.employee_id)) {
      map.set(log.employee_id, log);
    }
  }

  const missingIds = employeeIds.filter((id) => !map.has(id));
  if (missingIds.length > 0) {
    const { data: recentLogs, error: recentError } = await service
      .from("employee_deployment_logs")
      .select("*")
      .in("employee_id", missingIds)
      .order("created_at", { ascending: false })
      .limit(Math.max(missingIds.length * 8, 40));

    if (!recentError) {
      const reportEnd = new Date(getReportDateBounds(dateKey).end);
      const nextDayKey = addDaysToDateKey(dateKey, 1);

      for (const log of (recentLogs ?? []) as EmployeeDeploymentLog[]) {
        if (map.has(log.employee_id)) continue;

        if (isDeploymentLogForDateKey(log, dateKey)) {
          map.set(log.employee_id, log);
          continue;
        }

        // Backfill saved on the next PH day without backdating created_at
        if (getManilaDateKeyFromTimestamp(log.created_at) !== nextDayKey) continue;

        const hoursAfterReportDay = (new Date(log.created_at).getTime() - reportEnd.getTime()) / 3_600_000;
        if (hoursAfterReportDay >= 0 && hoursAfterReportDay <= 36) {
          map.set(log.employee_id, log);
        }
      }
    }
  }

  return map;
}

function statusFromLog(
  log: EmployeeDeploymentLog,
  statuses: LibraryStatus[]
): LibraryStatus {
  if (log.status_id) {
    const byId = statuses.find((status) => status.id === log.status_id);
    if (byId) return byId;
  }

  const byName = statuses.find(
    (status) => status.name.trim().toLowerCase() === log.status_name.trim().toLowerCase()
  );
  if (byName) return byName;

  return {
    id: log.status_id ?? log.id,
    name: log.status_name,
    color: "#475569",
    is_active: true,
    sort_order: 0,
    created_at: log.created_at,
  };
}

/** Overlay deployment fields from the report date's log (or today's live record). */
export function applyDeploymentSnapshotForReport(
  employee: EmployeeWithRelations,
  log: EmployeeDeploymentLog | undefined,
  statuses: LibraryStatus[],
  reportIsToday: boolean
): EmployeeWithRelations {
  if (log) {
    const status = statusFromLog(log, statuses);
    return {
      ...employee,
      status_id: log.status_id ?? status.id,
      status,
      actual_task: log.actual_task ?? null,
      deployment_location: log.deployment_location ?? null,
      deployment_remarks: log.deployment_remarks ?? null,
      deploymentPending: false,
    };
  }

  if (reportIsToday && !isDeploymentPendingToday(employee)) {
    return employee;
  }

  return {
    ...employee,
    status_id: null,
    status: null,
    actual_task: null,
    deployment_location: null,
    deployment_remarks: null,
    deploymentPending: reportIsToday,
  };
}

export function applyDeploymentSnapshotsForReport(
  employees: EmployeeWithRelations[],
  logsByEmployee: Map<string, EmployeeDeploymentLog>,
  statuses: LibraryStatus[],
  reportIsToday: boolean
): EmployeeWithRelations[] {
  return employees.map((employee) =>
    applyDeploymentSnapshotForReport(
      employee,
      logsByEmployee.get(employee.id),
      statuses,
      reportIsToday
    )
  );
}
