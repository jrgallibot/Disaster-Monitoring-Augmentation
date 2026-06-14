export type PortalRole = "admin" | "employee" | "team_leader" | "viewer";

export const PORTAL_ROLE_LABELS: Record<
  Exclude<PortalRole, "viewer">,
  string
> = {
  employee: "Employee (restricted)",
  team_leader: "Team Leader (monitoring)",
  admin: "Administrator (full control)",
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
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
