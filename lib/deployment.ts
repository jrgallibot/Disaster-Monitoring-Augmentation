import type { LibraryStatus } from "@/lib/types";

export function statusRequiresDeploymentLocation(statusName: string | null | undefined): boolean {
  return statusName?.trim().toLowerCase() === "deployed";
}

export function statusRequiresDeploymentRemarks(statusName: string | null | undefined): boolean {
  const name = statusName?.trim().toLowerCase();
  return name === "on standby" || name === "on leave" || name === "unavailable";
}

export function getStatusById(
  statusId: string,
  statuses: LibraryStatus[]
): LibraryStatus | undefined {
  return statuses.find((s) => s.id === statusId);
}

export function validateDeploymentFields(
  statusId: string | undefined,
  deploymentLocation: string | undefined,
  statuses: LibraryStatus[],
  actualTask?: string | undefined,
  deploymentRemarks?: string | undefined
): string | null {
  if (!statusId) return null;

  const status = getStatusById(statusId, statuses);
  if (!status) return "Selected deployment status is invalid.";

  if (statusRequiresDeploymentLocation(status.name)) {
    if (!actualTask?.trim()) {
      return "Actual task is required when status is Deployed.";
    }
    if (!deploymentLocation?.trim()) {
      return "Deployment location is required when status is Deployed.";
    }
  }

  if (statusRequiresDeploymentRemarks(status.name) && !deploymentRemarks?.trim()) {
    return `Remarks are required when status is ${status.name}. Explain why.`;
  }

  return null;
}
