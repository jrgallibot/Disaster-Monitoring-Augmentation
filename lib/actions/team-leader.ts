"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getEmployeeSession } from "@/lib/actions/auth";
import {
  canManageEmployee,
  employeeIsVisibleTeamMember,
  getEmployeeRecordByUserId,
  getLedRegionIds,
  getTeamLeaderEmployeeIdsForRegions,
} from "@/lib/auth/team-leader";
import { getUserRole } from "@/lib/auth/employee-sync";
import { isTeamLeaderRole } from "@/lib/auth/roles";
import {
  queryEmployeeRows,
  queryRegions,
  querySingleEmployeeRow,
} from "@/lib/supabase/employee-query";
import {
  buildMemberReports,
  buildTeamDailyReportMember,
  buildTeamSummary,
  fetchMemberReportMaps,
} from "@/lib/report/member-report";
import {
  applyDeploymentSnapshotForReport,
  fetchLatestDeploymentLogsForDateKey,
} from "@/lib/report/deployment-snapshot";
import { getStatuses } from "@/lib/actions/employees";
import type {
  ActionResult,
  DailyReportFilters,
  EmployeeFormData,
  EmployeeWithRelations,
  LibraryRegion,
  TeamDailyReportData,
  TeamLeaderContext,
} from "@/lib/types";
import { getReportDateBounds } from "@/lib/report/date-bounds";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getTeamLeaderContext(): Promise<TeamLeaderContext> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { isTeamLeader: false, ledRegions: [], myEmployee: null };
  }

  const supabase = createServiceClient();
  const myEmployee = await querySingleEmployeeRow(supabase, (select) =>
    supabase.from("employees").select(select).eq("user_id", session.user.id).maybeSingle()
  );

  if (!myEmployee) {
    return { isTeamLeader: false, ledRegions: [], myEmployee: null };
  }

  const employeeRecord = myEmployee;
  const role = await getUserRole(session.user.id);
  const ledRegionIds = await getLedRegionIds(employeeRecord.id);

  if (ledRegionIds.length === 0 && !isTeamLeaderRole(role)) {
    return { isTeamLeader: false, ledRegions: [], myEmployee: employeeRecord };
  }

  let ledRegions: LibraryRegion[] = [];
  if (ledRegionIds.length > 0) {
    try {
      ledRegions = await queryRegions(supabase, (select) =>
        supabase
          .from("library_regions")
          .select(select)
          .in("id", ledRegionIds)
          .eq("is_active", true)
          .order("sort_order")
      );
    } catch {
      if (!isTeamLeaderRole(role)) {
        return {
          isTeamLeader: false,
          ledRegions: [],
          myEmployee: employeeRecord,
        };
      }
    }
  }

  return {
    isTeamLeader: ledRegionIds.length > 0 || isTeamLeaderRole(role),
    ledRegions,
    myEmployee: employeeRecord,
  };
}

export async function getTeamMembersForLeader(
  regionId?: string | null
): Promise<EmployeeWithRelations[]> {
  const session = await getEmployeeSession();
  if ("error" in session) return [];

  const myRecord = await getEmployeeRecordByUserId(session.user.id);
  if (!myRecord) return [];

  const ledRegionIds = await getLedRegionIds(myRecord.id);
  if (ledRegionIds.length === 0) return [];

  const scopedRegionIds = regionId
    ? ledRegionIds.filter((id) => id === regionId)
    : ledRegionIds;
  if (scopedRegionIds.length === 0) return [];

  const teamLeaderIds = await getTeamLeaderEmployeeIdsForRegions(scopedRegionIds);
  const supabase = createServiceClient();
  const employees = await queryEmployeeRows(supabase, (select) =>
    supabase
      .from("employees")
      .select(select)
      .in("region_id", scopedRegionIds)
      .neq("id", myRecord.id)
      .order("updated_at", { ascending: false })
  );

  return employees.filter((employee) =>
    employeeIsVisibleTeamMember(
      employee,
      myRecord.id,
      scopedRegionIds,
      teamLeaderIds
    )
  );
}

export async function getManagedEmployeeById(
  id: string
): Promise<EmployeeWithRelations | null> {
  const session = await getEmployeeSession();
  if ("error" in session) return null;

  const access = await canManageEmployee(session.user.id, id);
  if (!access.allowed) return null;

  const supabase = createServiceClient();
  return querySingleEmployeeRow(supabase, (select) =>
    supabase.from("employees").select(select).eq("id", id).maybeSingle()
  );
}

export async function updateTeamMemberProfile(
  id: string,
  data: EmployeeFormData
): Promise<ActionResult> {
  try {
    const session = await getEmployeeSession();
    if ("error" in session) {
      return { success: false, error: session.error };
    }

    const access = await canManageEmployee(session.user.id, id);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("employees")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        phone: data.phone || null,
        address: data.address || null,
        specialization_id: data.specialization_id || null,
        notes: data.notes || null,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/team");
    revalidatePath("/employee/daily-report");
    revalidatePath(`/employee/team/${id}/edit`);
    revalidatePath(`/employees/${id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update team member.",
    };
  }
}

export async function getTeamDailyReportData(
  filters: DailyReportFilters = {}
): Promise<TeamDailyReportData | null> {
  const session = await getEmployeeSession();
  if ("error" in session) return null;

  const context = await getTeamLeaderContext();
  if (!context.isTeamLeader || !context.myEmployee || context.ledRegions.length === 0) {
    return null;
  }

  const regionId =
    filters.regionId &&
    context.ledRegions.some((region) => region.id === filters.regionId)
      ? filters.regionId
      : null;

  const ledRegions = regionId
    ? context.ledRegions.filter((region) => region.id === regionId)
    : context.ledRegions;

  const members = await getTeamMembersForLeader(regionId);
  const memberIds = members.map((member) => member.id);
  const bounds = getReportDateBounds(filters.dateKey);
  const teamLeader = context.myEmployee;
  const reportIds = Array.from(new Set([teamLeader.id, ...memberIds]));

  const maps = await fetchMemberReportMaps(reportIds, bounds.start, bounds.end);
  const [statuses, deploymentLogsByEmployee] = await Promise.all([
    getStatuses(false),
    fetchLatestDeploymentLogsForDateKey(reportIds, bounds.dateKey),
  ]);

  const teamLeaderForReport = applyDeploymentSnapshotForReport(
    teamLeader,
    deploymentLogsByEmployee.get(teamLeader.id),
    statuses,
    bounds.isToday
  );
  const membersForReport = members.map((member) =>
    applyDeploymentSnapshotForReport(
      member,
      deploymentLogsByEmployee.get(member.id),
      statuses,
      bounds.isToday
    )
  );

  const leaderActivity = buildTeamDailyReportMember(
    teamLeaderForReport,
    maps.accomplishmentsByEmployee,
    maps.attendanceByEmployee,
    maps.latestAttendanceByEmployee,
    bounds.isToday
  );
  const reportMembers = buildMemberReports(
    membersForReport,
    maps.accomplishmentsByEmployee,
    maps.attendanceByEmployee,
    maps.latestAttendanceByEmployee,
    bounds.isToday
  );

  const scopeLabel =
    ledRegions.length === 1
      ? `${ledRegions[0].name} (${ledRegions[0].code})`
      : ledRegions.map((region) => `${region.name} (${region.code})`).join(", ");

  return {
    generatedAt: new Date().toISOString(),
    reportDate: bounds.label,
    reportDateKey: bounds.dateKey,
    reportIsToday: bounds.isToday,
    scopeLabel,
    teamLeader,
    leaderActivity,
    ledRegions,
    members: reportMembers,
    summary: buildTeamSummary(reportMembers),
    appliedFilters: {
      dateKey: bounds.dateKey,
      regionId,
      teamLeaderId: null,
    },
  };
}

export async function requireTeamLeaderForPage(): Promise<TeamLeaderContext> {
  const context = await getTeamLeaderContext();
  if (!context.isTeamLeader) {
    redirect("/employee/dashboard");
  }
  if (context.ledRegions.length === 0) {
    redirect("/employee/dashboard");
  }
  return context;
}
