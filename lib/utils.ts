import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TeamLeaderSummary } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function getFullName(
  firstName: string,
  lastName: string,
  middleName?: string | null
): string {
  return middleName
    ? `${lastName}, ${firstName} ${middleName}`
    : `${lastName}, ${firstName}`;
}

export function getTeamLeaderDisplay(
  teamLeader: TeamLeaderSummary | null | undefined
): string | null {
  if (!teamLeader) return null;
  return `${getFullName(teamLeader.first_name, teamLeader.last_name, teamLeader.middle_name)} (${teamLeader.employee_id})`;
}

export function getEmployeeTeamLeader(employee: {
  region?: { team_leader?: TeamLeaderSummary | null } | null;
}): string | null {
  return getTeamLeaderDisplay(employee.region?.team_leader);
}

export function getTeamLeaderSearchText(
  teamLeader: TeamLeaderSummary | null | undefined
): string {
  if (!teamLeader) return "";
  return `${getFullName(teamLeader.first_name, teamLeader.last_name, teamLeader.middle_name)} ${teamLeader.employee_id}`.toLowerCase();
}
