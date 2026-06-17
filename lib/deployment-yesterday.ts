import type { EmployeeDeploymentLog } from "@/lib/types";
import {
  addDaysToDateKey,
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

/** Match exact PH date first, then next-day backfill logs saved without backdating. */
export function pickDeploymentLogForDateKey(
  logs: EmployeeDeploymentLog[],
  dateKey: string
): EmployeeDeploymentLog | undefined {
  const exact = logs.find((log) => isDeploymentLogOnDateKey(log, dateKey));
  if (exact) return exact;

  const nextDayKey = addDaysToDateKey(dateKey, 1);
  const reportEnd = new Date(getReportDateBounds(dateKey).end);

  for (const log of logs) {
    if (getManilaDateKeyFromTimestamp(log.created_at) !== nextDayKey) continue;
    const hoursAfterReportDay =
      (new Date(log.created_at).getTime() - reportEnd.getTime()) / 3_600_000;
    if (hoursAfterReportDay >= 0 && hoursAfterReportDay <= 36) {
      return log;
    }
  }

  return undefined;
}

export function findDeploymentLogForDateKey(
  logs: EmployeeDeploymentLog[],
  dateKey: string
): EmployeeDeploymentLog | undefined {
  return pickDeploymentLogForDateKey(logs, dateKey);
}

export function getYesterdayDeploymentLog(
  logs: EmployeeDeploymentLog[]
): EmployeeDeploymentLog | undefined {
  return pickDeploymentLogForDateKey(logs, getYesterdayDateKey());
}

export function getYesterdayReportBounds() {
  return getReportDateBounds(getYesterdayDateKey());
}

export function isLogEditableForBackfill(
  createdAt: string,
  targetDateKey: string
): boolean {
  if (isDeploymentLogOnDateKey({ created_at: createdAt }, targetDateKey)) {
    return true;
  }
  return getManilaDateKeyFromTimestamp(createdAt) === addDaysToDateKey(targetDateKey, 1);
}
