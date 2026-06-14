import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LibraryRegion, TeamLeaderSummary } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDateLong(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeStyle: "short",
  }).format(new Date(date));
}

export function getTodayBounds(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: formatDateLong(start),
  };
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

export function isValidTeamLeaderSummary(
  teamLeader: TeamLeaderSummary | null | undefined
): teamLeader is TeamLeaderSummary {
  return Boolean(
    teamLeader?.id &&
      teamLeader?.employee_id &&
      teamLeader?.first_name &&
      teamLeader?.last_name
  );
}

export function getTeamLeaderDisplay(
  teamLeader: TeamLeaderSummary | null | undefined
): string | null {
  if (!isValidTeamLeaderSummary(teamLeader)) return null;
  return `${getFullName(teamLeader.first_name, teamLeader.last_name, teamLeader.middle_name)} (${teamLeader.employee_id})`;
}

export function getRegionTeamLeaderSummaries(
  region: LibraryRegion | null | undefined
): TeamLeaderSummary[] {
  if (!region?.team_leaders?.length) return [];
  return region.team_leaders
    .map((link) => link.leader)
    .filter(isValidTeamLeaderSummary);
}

export function getEmployeeTeamLeader(employee: {
  assigned_team_leader?: TeamLeaderSummary | null;
  region?: LibraryRegion | null;
}): string | null {
  if (isValidTeamLeaderSummary(employee.assigned_team_leader)) {
    return getTeamLeaderDisplay(employee.assigned_team_leader);
  }

  const regionLeaders = getRegionTeamLeaderSummaries(employee.region);
  if (regionLeaders.length === 1) {
    return getTeamLeaderDisplay(regionLeaders[0]);
  }

  return null;
}

export function getTeamLeaderSearchText(
  teamLeader: TeamLeaderSummary | null | undefined
): string {
  if (!isValidTeamLeaderSummary(teamLeader)) return "";
  return `${getFullName(teamLeader.first_name, teamLeader.last_name, teamLeader.middle_name)} ${teamLeader.employee_id}`.toLowerCase();
}

export function getEmployeeTeamLeaderSearchText(employee: {
  assigned_team_leader?: TeamLeaderSummary | null;
  region?: LibraryRegion | null;
}): string {
  if (isValidTeamLeaderSummary(employee.assigned_team_leader)) {
    return getTeamLeaderSearchText(employee.assigned_team_leader);
  }
  return getRegionTeamLeaderSummaries(employee.region)
    .map((leader) => getTeamLeaderSearchText(leader))
    .join(" ");
}

export function shouldSelectTeamLeader(region: LibraryRegion | null | undefined): boolean {
  return getRegionTeamLeaderSummaries(region).length > 1;
}

export function getAutoAssignedTeamLeaderId(
  region: LibraryRegion | null | undefined
): string | null {
  const leaders = getRegionTeamLeaderSummaries(region);
  return leaders.length === 1 ? leaders[0].id : null;
}
