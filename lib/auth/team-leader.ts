import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/auth/employee-sync";
import { canAccessAdminPortal, isAdminRole, isTeamLeaderRole } from "@/lib/auth/roles";
import { getRegionTeamLeaderSummaries } from "@/lib/utils";
import { queryEmployeeRows } from "@/lib/supabase/employee-query";
import type { LibraryRegion } from "@/lib/types";

export async function getEmployeeRecordByUserId(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, region_id, user_id, employee_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getLedRegionIds(employeeId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("library_region_team_leaders")
    .select("region_id, region:library_regions!inner(is_active)")
    .eq("employee_id", employeeId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => {
      const region = row.region as { is_active?: boolean } | null;
      return region?.is_active !== false;
    })
    .map((row) => row.region_id);
}

export async function isTeamLeaderUser(userId: string): Promise<boolean> {
  const record = await getEmployeeRecordByUserId(userId);
  if (!record) return false;
  const regionIds = await getLedRegionIds(record.id);
  return regionIds.length > 0;
}

export async function canManageEmployee(
  authUserId: string,
  targetEmployeeId: string
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const role = await getUserRole(authUserId);
  if (isAdminRole(role)) return { allowed: true };

  const myRecord = await getEmployeeRecordByUserId(authUserId);
  if (!myRecord) {
    return { allowed: false, error: "Your employee record was not found." };
  }

  if (myRecord.id === targetEmployeeId) {
    return { allowed: true };
  }

  if (role !== "employee" && !isTeamLeaderRole(role)) {
    return { allowed: false, error: "You do not have permission to manage this employee." };
  }

  const ledRegionIds = await getLedRegionIds(myRecord.id);
  if (ledRegionIds.length === 0) {
    return { allowed: false, error: "You are not assigned as a regional team leader." };
  }

  const supabase = createServiceClient();
  const { data: target, error } = await supabase
    .from("employees")
    .select("region_id, assigned_team_leader_id")
    .eq("id", targetEmployeeId)
    .maybeSingle();

  if (error) return { allowed: false, error: error.message };
  if (!target) return { allowed: false, error: "Employee not found." };

  if (!target.region_id || !ledRegionIds.includes(target.region_id)) {
    return { allowed: false, error: "This employee is not in your assigned region." };
  }

  const teamLeaderIds = await getTeamLeaderEmployeeIdsForRegions(ledRegionIds);
  if (
    !employeeIsVisibleTeamMember(
      { id: targetEmployeeId, region_id: target.region_id },
      myRecord.id,
      ledRegionIds,
      teamLeaderIds
    )
  ) {
    return {
      allowed: false,
      error: "This employee is not part of your team in your assigned region.",
    };
  }

  return { allowed: true };
}

export async function canViewEmployeeInPortal(
  authUserId: string,
  targetEmployeeId: string
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const role = await getUserRole(authUserId);
  if (canAccessAdminPortal(role)) return { allowed: true };
  return canManageEmployee(authUserId, targetEmployeeId);
}

export async function getTeamLeaderEmployeeIdsForRegions(
  regionIds: string[]
): Promise<Set<string>> {
  if (regionIds.length === 0) return new Set();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("library_region_team_leaders")
    .select("employee_id")
    .in("region_id", regionIds);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.employee_id));
}

/** True when employee is explicitly assigned to this leader. */
export function employeeIsAssignedToLeader(
  employee: {
    id: string;
    region_id: string | null;
    assigned_team_leader_id: string | null;
    region?: LibraryRegion | null;
  },
  leaderEmployeeId: string
): boolean {
  if (employee.id === leaderEmployeeId) return false;
  if (employee.assigned_team_leader_id === leaderEmployeeId) return true;

  if (!employee.assigned_team_leader_id && employee.region) {
    const leaders = getRegionTeamLeaderSummaries(employee.region);
    return leaders.length === 1 && leaders[0].id === leaderEmployeeId;
  }

  return false;
}

/** All non-leader employees in regions this team leader oversees. */
export function employeeIsVisibleTeamMember(
  employee: { id: string; region_id: string | null },
  leaderEmployeeId: string,
  ledRegionIds: string[],
  teamLeaderIds: Set<string>
): boolean {
  if (employee.id === leaderEmployeeId) return false;
  if (!employee.region_id || !ledRegionIds.includes(employee.region_id)) return false;
  if (teamLeaderIds.has(employee.id)) return false;
  return true;
}

export async function getTeamMemberIdsForLeader(leaderEmployeeId: string): Promise<string[]> {
  const ledRegionIds = await getLedRegionIds(leaderEmployeeId);
  if (ledRegionIds.length === 0) return [];

  const teamLeaderIds = await getTeamLeaderEmployeeIdsForRegions(ledRegionIds);
  const supabase = createServiceClient();
  const employees = await queryEmployeeRows(supabase, (select) =>
    supabase
      .from("employees")
      .select(select)
      .in("region_id", ledRegionIds)
      .neq("id", leaderEmployeeId)
  );

  return employees
    .filter((employee) =>
      employeeIsVisibleTeamMember(employee, leaderEmployeeId, ledRegionIds, teamLeaderIds)
    )
    .map((employee) => employee.id);
}
