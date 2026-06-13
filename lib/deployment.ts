import type { LibraryStatus } from "@/lib/types";

export function statusRequiresDeploymentLocation(statusName: string | null | undefined): boolean {
  return statusName?.trim().toLowerCase() === "deployed";
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
  statuses: LibraryStatus[]
): string | null {
  if (!statusId) return null;

  const status = getStatusById(statusId, statuses);
  if (!status) return "Selected deployment status is invalid.";

  if (statusRequiresDeploymentLocation(status.name) && !deploymentLocation?.trim()) {
    return "Deployment location is required when status is Deployed.";
  }

  return null;
}
