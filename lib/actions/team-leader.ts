"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getEmployeeSession } from "@/lib/actions/auth";
import {
  canManageEmployee,
  employeeIsAssignedToLeader,
  getEmployeeRecordByUserId,
  getLedRegionIds,
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
  buildTeamSummary,
  fetchMemberReportMaps,
} from "@/lib/report/member-report";
import type {
  ActionResult,
  EmployeeFormData,
  EmployeeWithRelations,
  LibraryRegion,
  TeamDailyReportData,
  TeamLeaderContext,
} from "@/lib/types";
import { getTodayBounds } from "@/lib/utils";
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

export async function getTeamMembersForLeader(): Promise<EmployeeWithRelations[]> {
  const session = await getEmployeeSession();
  if ("error" in session) return [];

  const myRecord = await getEmployeeRecordByUserId(session.user.id);
  if (!myRecord) return [];

  const ledRegionIds = await getLedRegionIds(myRecord.id);
  if (ledRegionIds.length === 0) return [];

  const supabase = createServiceClient();
  const employees = await queryEmployeeRows(supabase, (select) =>
    supabase
      .from("employees")
      .select(select)
      .in("region_id", ledRegionIds)
      .neq("id", myRecord.id)
      .order("updated_at", { ascending: false })
  );

  return employees.filter((employee) =>
    employeeIsAssignedToLeader(employee, myRecord.id)
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

export async function getTeamDailyReportData(): Promise<TeamDailyReportData | null> {
  const session = await getEmployeeSession();
  if ("error" in session) return null;

  const context = await getTeamLeaderContext();
  if (!context.isTeamLeader || !context.myEmployee || context.ledRegions.length === 0) {
    return null;
  }

  const members = await getTeamMembersForLeader();
  const memberIds = members.map((member) => member.id);
  const { start, end, label } = getTodayBounds();

  const maps = await fetchMemberReportMaps(memberIds, start, end);
  const reportMembers = buildMemberReports(
    members,
    maps.accomplishmentsByEmployee,
    maps.attendanceByEmployee,
    maps.latestAttendanceByEmployee
  );

  return {
    generatedAt: new Date().toISOString(),
    reportDate: label,
    teamLeader: context.myEmployee,
    ledRegions: context.ledRegions,
    members: reportMembers,
    summary: buildTeamSummary(reportMembers),
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
