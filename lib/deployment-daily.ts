import type { EmployeeWithRelations } from "@/lib/types";

/** Philippine local time — deployment resets at midnight in this zone. */
export const DEPLOYMENT_TIMEZONE = "Asia/Manila";

export const DEPLOYMENT_DAILY_RESET_NOTICE =
  "Deployment status resets every day at 12:00 AM (Philippine time). Set your status again each duty day. History is kept.";

export function getDeploymentDayKey(date: Date | string = new Date()): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEPLOYMENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function isDeploymentSetForToday(
  deploymentSetAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!deploymentSetAt) return false;
  return getDeploymentDayKey(deploymentSetAt) === getDeploymentDayKey(now);
}

export function isDeploymentPendingToday(
  employee: Pick<EmployeeWithRelations, "deployment_set_at">
): boolean {
  return !isDeploymentSetForToday(employee.deployment_set_at);
}

/** Hide stale deployment fields until the employee sets status again today. */
export function applyDailyDeploymentView(
  employee: EmployeeWithRelations
): EmployeeWithRelations {
  const deploymentPending = isDeploymentPendingToday(employee);

  if (!deploymentPending) {
    return { ...employee, deploymentPending: false };
  }

  return {
    ...employee,
    deploymentPending: true,
    status_id: null,
    status: null,
    deployment_location: null,
    actual_task: null,
  };
}
