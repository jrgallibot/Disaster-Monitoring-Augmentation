export type PortalRole = "admin" | "employee" | "team_leader" | "viewer";

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  employee: "Employee (restricted)",
  team_leader: "Team Leader (monitoring)",
  admin: "Administrator (full control)",
  viewer: "Co-Administrator (view only)",
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function isViewerRole(role: string | null | undefined): boolean {
  return role === "viewer";
}

/** Admin portal login — full admin or read-only co-admin */
export function canAccessAdminPortal(role: string | null | undefined): boolean {
  return isAdminRole(role) || isViewerRole(role);
}

/** Mutations in the admin portal (create, update, delete) */
export function canWriteAdminPortal(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

export function isEmployeePortalRole(role: string | null | undefined): boolean {
  return role === "employee" || role === "team_leader";
}

export function isTeamLeaderRole(role: string | null | undefined): boolean {
  return role === "team_leader";
}

export function isElevatedPortalRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "team_leader";
}
