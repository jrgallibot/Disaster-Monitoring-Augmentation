import type { EmployeeDeploymentLog } from "@/lib/types";
import {
  getManilaDateKeyFromTimestamp,
  getReportDateBounds,
  getYesterdayDateKey,
} from "@/lib/report/date-bounds";

export function getYesterdayDeploymentDateKey(): string {
  return getYesterdayDateKey();
}

export function isDeploymentLogOnDateKey(
  log: Pick<EmployeeDeploymentLog, "created_at">,
  dateKey: string
): boolean {
  return getManilaDateKeyFromTimestamp(log.created_at) === dateKey;
}

export function findDeploymentLogForDateKey(
  logs: EmployeeDeploymentLog[],
  dateKey: string
): EmployeeDeploymentLog | undefined {
  return logs.find((log) => isDeploymentLogOnDateKey(log, dateKey));
}

export function getYesterdayDeploymentLog(
  logs: EmployeeDeploymentLog[]
): EmployeeDeploymentLog | undefined {
  return findDeploymentLogForDateKey(logs, getYesterdayDateKey());
}

export function getYesterdayReportBounds() {
  return getReportDateBounds(getYesterdayDateKey());
}
