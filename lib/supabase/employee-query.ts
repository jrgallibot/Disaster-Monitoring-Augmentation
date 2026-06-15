import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPLOYEE_SELECT,
  EMPLOYEE_SELECT_FALLBACK,
  REGION_SELECT,
  REGION_SELECT_LEGACY,
} from "@/lib/supabase/selects";
import type { EmployeeWithRelations, LibraryRegion, TeamLeaderSummary } from "@/lib/types";
import { applyDailyDeploymentView } from "@/lib/deployment-daily";
import { isValidTeamLeaderSummary } from "@/lib/utils";

const TEAM_LEADER_COLUMNS =
  "id, employee_id, first_name, last_name, middle_name, user_id";

type QueryResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

function isEmbedRelationshipError(message: string): boolean {
  return (
    message.includes("Could not find a relationship") ||
    message.includes("schema cache")
  );
}

export function normalizeRegion(
  region: LibraryRegion & { team_leader_legacy?: TeamLeaderSummary | null }
): LibraryRegion {
  if (region.team_leaders?.length) return region;

  const legacy = region.team_leader_legacy;
  if (isValidTeamLeaderSummary(legacy)) {
    const { team_leader_legacy: _, ...rest } = region;
    return {
      ...rest,
      team_leaders: [
        {
          id: legacy.id,
          employee_id: legacy.id,
          leader: legacy,
        },
      ],
    };
  }

  return region;
}

function normalizeEmployeeRow(row: EmployeeWithRelations): EmployeeWithRelations {
  return applyDailyDeploymentView({
    ...row,
    mobilization_status: row.mobilization_status ?? "mobilized",
    region: row.region ? normalizeRegion(row.region) : null,
  });
}

async function fetchTeamLeaderMap(
  supabase: SupabaseClient,
  leaderIds: string[]
): Promise<Map<string, TeamLeaderSummary>> {
  if (leaderIds.length === 0) return new Map();

  const { data: leaders } = await supabase
    .from("employees")
    .select(TEAM_LEADER_COLUMNS)
    .in("id", leaderIds);

  return new Map(
    (leaders ?? [])
      .filter((leader) => isValidTeamLeaderSummary(leader as TeamLeaderSummary))
      .map((leader) => [leader.id, leader as TeamLeaderSummary])
  );
}

function collectMissingTeamLeaderIds(
  employees: EmployeeWithRelations[]
): string[] {
  const ids = new Set<string>();

  for (const employee of employees) {
    if (
      employee.assigned_team_leader_id &&
      !isValidTeamLeaderSummary(employee.assigned_team_leader)
    ) {
      ids.add(employee.assigned_team_leader_id);
    }

    for (const link of employee.region?.team_leaders ?? []) {
      if (link.employee_id && !isValidTeamLeaderSummary(link.leader)) {
        ids.add(link.employee_id);
      }
    }
  }

  return Array.from(ids);
}

function applyTeamLeaderMap(
  employee: EmployeeWithRelations,
  leaderMap: Map<string, TeamLeaderSummary>
): EmployeeWithRelations {
  const assignedTeamLeader = isValidTeamLeaderSummary(employee.assigned_team_leader)
    ? employee.assigned_team_leader
    : employee.assigned_team_leader_id
      ? leaderMap.get(employee.assigned_team_leader_id) ?? null
      : null;

  const region = employee.region
    ? {
        ...employee.region,
        team_leaders: (employee.region.team_leaders ?? []).map((link) => ({
          ...link,
          leader: isValidTeamLeaderSummary(link.leader)
            ? link.leader
            : leaderMap.get(link.employee_id) ?? null,
        })),
      }
    : null;

  return {
    ...employee,
    assigned_team_leader: assignedTeamLeader,
    region,
  };
}

async function attachAssignedTeamLeaders(
  supabase: SupabaseClient,
  employees: EmployeeWithRelations[]
): Promise<EmployeeWithRelations[]> {
  const leaderIds = collectMissingTeamLeaderIds(employees);
  const leaderMap = await fetchTeamLeaderMap(supabase, leaderIds);

  return employees.map((employee) => applyTeamLeaderMap(employee, leaderMap));
}

async function hydrateRegionTeamLeaders(
  supabase: SupabaseClient,
  regions: LibraryRegion[]
): Promise<LibraryRegion[]> {
  const leaderIds = Array.from(
    new Set(
      regions.flatMap((region) =>
        (region.team_leaders ?? [])
          .filter((link) => link.employee_id && !isValidTeamLeaderSummary(link.leader))
          .map((link) => link.employee_id)
      )
    )
  );

  const leaderMap = await fetchTeamLeaderMap(supabase, leaderIds);

  return regions.map((region) => ({
    ...region,
    team_leaders: (region.team_leaders ?? []).map((link) => ({
      ...link,
      leader: isValidTeamLeaderSummary(link.leader)
        ? link.leader
        : leaderMap.get(link.employee_id) ?? null,
    })),
  }));
}

export async function queryEmployeeRows(
  supabase: SupabaseClient,
  build: (select: string) => PromiseLike<QueryResult>
): Promise<EmployeeWithRelations[]> {
  for (const select of [EMPLOYEE_SELECT, EMPLOYEE_SELECT_FALLBACK]) {
    const { data, error } = await build(select);

    if (!error) {
      const normalized = ((data ?? []) as unknown as EmployeeWithRelations[]).map(
        normalizeEmployeeRow
      );
      return attachAssignedTeamLeaders(supabase, normalized);
    }

    if (!isEmbedRelationshipError(error.message)) {
      throw new Error(error.message);
    }
  }

  throw new Error("Failed to load employees. Run migration 015 in Supabase.");
}

export async function querySingleEmployeeRow(
  supabase: SupabaseClient,
  build: (select: string) => PromiseLike<QueryResult>
): Promise<EmployeeWithRelations | null> {
  for (const select of [EMPLOYEE_SELECT, EMPLOYEE_SELECT_FALLBACK]) {
    const { data, error } = await build(select);

    if (!error && data) {
      const normalized = normalizeEmployeeRow(data as unknown as EmployeeWithRelations);
      const [withLeader] = await attachAssignedTeamLeaders(supabase, [normalized]);
      return withLeader;
    }

    if (error?.code === "PGRST116") return null;

    if (error && !isEmbedRelationshipError(error.message)) {
      throw new Error(error.message);
    }
  }

  return null;
}

export async function queryRegions(
  supabase: SupabaseClient,
  build: (select: string) => PromiseLike<QueryResult>
): Promise<LibraryRegion[]> {
  for (const select of [REGION_SELECT, REGION_SELECT_LEGACY]) {
    const { data, error } = await build(select);

    if (!error) {
      const normalized = (
        (data ?? []) as (LibraryRegion & {
          team_leader_legacy?: TeamLeaderSummary | null;
        })[]
      ).map(normalizeRegion);
      return hydrateRegionTeamLeaders(supabase, normalized);
    }

    if (!isEmbedRelationshipError(error.message)) {
      throw new Error(error.message);
    }
  }

  throw new Error("Failed to load regions. Run migration 015 in Supabase.");
}
