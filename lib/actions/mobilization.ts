"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canManageEmployee } from "@/lib/auth/team-leader";
import { requireAdminPortalRead } from "@/lib/actions/auth";
import { getRegions } from "@/lib/actions/employees";
import {
  getLedRegionIds,
  getTeamLeaderEmployeeIdsForRegions,
  employeeIsVisibleTeamMember,
} from "@/lib/auth/team-leader";
import { getEmployeeSession } from "@/lib/actions/auth";
import { getEmployeeRecordByUserId } from "@/lib/auth/team-leader";
import { queryEmployeeRows } from "@/lib/supabase/employee-query";
import { validateMobilizationUpdate } from "@/lib/mobilization";
import { buildMobilizationReportData } from "@/lib/report/build-mobilization-report";
import { countSex } from "@/lib/sex-stats";
import type {
  ActionResult,
  DailyReportFilterOptions,
  EmployeeMobilizationLog,
  MobilizationReportData,
  MobilizationReportFilters,
  MobilizationStatus,
} from "@/lib/types";
import { getFullName, getRegionTeamLeaderSummaries } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export type MobilizationUpdateInput = {
  status: MobilizationStatus;
  mobilizedAt: string;
  demobilizedAt?: string | null;
};

function revalidateMobilizationPaths(employeeId?: string) {
  revalidatePath("/");
  if (employeeId) revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/team");
  revalidatePath("/admin/reports/mobilization");
  revalidatePath("/employee/mobilization-report");
}

async function logMobilizationChange(
  employeeId: string,
  userId: string,
  status: MobilizationStatus,
  mobilizedAt: string,
  demobilizedAt: string | null,
  before: {
    mobilization_status: MobilizationStatus;
    mobilized_at: string | null;
    demobilized_at: string | null;
  }
) {
  const changed =
    before.mobilization_status !== status ||
    before.mobilized_at !== mobilizedAt ||
    before.demobilized_at !== demobilizedAt;

  if (!changed) return;

  const service = createServiceClient();
  await service.from("employee_mobilization_logs").insert({
    employee_id: employeeId,
    user_id: userId,
    mobilization_status: status,
    mobilized_at: mobilizedAt,
    demobilized_at: demobilizedAt,
  });
}

export async function updateEmployeeMobilization(
  id: string,
  input: MobilizationUpdateInput
): Promise<ActionResult> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const access = await canManageEmployee(user.id, id);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const validationError = validateMobilizationUpdate({
      status: input.status,
      mobilizedAt: input.mobilizedAt,
      demobilizedAt: input.demobilizedAt,
    });
    if (validationError) {
      return { success: false, error: validationError };
    }

    const nextDemobilizedAt =
      input.status === "demobilized" ? input.demobilizedAt?.trim() || null : null;

    const supabase = createServiceClient();
    const { data: before, error: fetchError } = await supabase
      .from("employees")
      .select("mobilization_status, mobilized_at, demobilized_at")
      .eq("id", id)
      .single();

    if (fetchError) return { success: false, error: fetchError.message };

    const { error } = await supabase
      .from("employees")
      .update({
        mobilization_status: input.status,
        mobilized_at: input.mobilizedAt,
        demobilized_at: nextDemobilizedAt,
        mobilization_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logMobilizationChange(
      id,
      user.id,
      input.status,
      input.mobilizedAt,
      nextDemobilizedAt,
      before as {
        mobilization_status: MobilizationStatus;
        mobilized_at: string | null;
        demobilized_at: string | null;
      }
    );

    revalidateMobilizationPaths(id);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update mobilization status.",
    };
  }
}

export async function bulkUpdateEmployeeMobilization(
  employeeIds: string[],
  input: MobilizationUpdateInput
): Promise<ActionResult> {
  try {
    const uniqueIds = Array.from(new Set(employeeIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { success: false, error: "Select at least one employee." };
    }

    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const validationError = validateMobilizationUpdate({
      status: input.status,
      mobilizedAt: input.mobilizedAt,
      demobilizedAt: input.demobilizedAt,
    });
    if (validationError) {
      return { success: false, error: validationError };
    }

    const nextDemobilizedAt =
      input.status === "demobilized" ? input.demobilizedAt?.trim() || null : null;

    const supabase = createServiceClient();
    let updatedCount = 0;
    const errors: string[] = [];

    for (const id of uniqueIds) {
      const access = await canManageEmployee(user.id, id);
      if (!access.allowed) {
        errors.push(`Employee ${id}: ${access.error}`);
        continue;
      }

      const { data: before, error: fetchError } = await supabase
        .from("employees")
        .select("mobilization_status, mobilized_at, demobilized_at")
        .eq("id", id)
        .single();

      if (fetchError) {
        errors.push(`Employee ${id}: ${fetchError.message}`);
        continue;
      }

      const { error } = await supabase
        .from("employees")
        .update({
          mobilization_status: input.status,
          mobilized_at: input.mobilizedAt,
          demobilized_at: nextDemobilizedAt,
          mobilization_updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        errors.push(`Employee ${id}: ${error.message}`);
        continue;
      }

      await logMobilizationChange(
        id,
        user.id,
        input.status,
        input.mobilizedAt,
        nextDemobilizedAt,
        before as {
          mobilization_status: MobilizationStatus;
          mobilized_at: string | null;
          demobilized_at: string | null;
        }
      );

      updatedCount += 1;
    }

    if (updatedCount === 0) {
      return {
        success: false,
        error: errors[0] ?? "No employees were updated.",
      };
    }

    revalidateMobilizationPaths();
    return {
      success: true,
      sharedCount: updatedCount,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update mobilization status.",
    };
  }
}

export async function getMobilizationReportData(
  filters: MobilizationReportFilters = {}
): Promise<MobilizationReportData> {
  await requireAdminPortalRead();
  return buildMobilizationReportData(filters);
}

export async function getTeamMobilizationReportData(
  filters: MobilizationReportFilters = {}
): Promise<MobilizationReportData> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    throw new Error(session.error);
  }

  const myRecord = await getEmployeeRecordByUserId(session.user.id);
  if (!myRecord) {
    throw new Error("Employee record not found.");
  }

  const ledRegionIds = await getLedRegionIds(myRecord.id);
  if (ledRegionIds.length === 0) {
    throw new Error("You are not assigned as a team leader.");
  }

  const teamLeaderIds = await getTeamLeaderEmployeeIdsForRegions(ledRegionIds);
  const supabase = createServiceClient();
  const allMembers = await queryEmployeeRows(supabase, (select) =>
    supabase
      .from("employees")
      .select(select)
      .in("region_id", ledRegionIds)
      .neq("id", myRecord.id)
      .order("last_name")
  );

  const visibleMembers = allMembers.filter((employee) =>
    employeeIsVisibleTeamMember(employee, myRecord.id, ledRegionIds, teamLeaderIds)
  );

  const report = await buildMobilizationReportData(
    {
      ...filters,
      regionId: filters.regionId && ledRegionIds.includes(filters.regionId) ? filters.regionId : filters.regionId,
    },
    ledRegionIds
  );

  const visibleIds = new Set(visibleMembers.map((member) => member.id));
  const scopedRows = report.rows.filter((row) => visibleIds.has(row.employee.id));

  return {
    ...report,
    rows: scopedRows,
    summary: {
      totalInRange: scopedRows.length,
      mobilizedNow: scopedRows.filter((row) => row.employee.mobilization_status === "mobilized").length,
      demobilizedNow: scopedRows.filter((row) => row.employee.mobilization_status === "demobilized").length,
      sex: {
        totalInRange: countSex(scopedRows.map((row) => row.employee)),
        mobilizedNow: countSex(
          scopedRows
            .filter((row) => row.employee.mobilization_status === "mobilized")
            .map((row) => row.employee)
        ),
        demobilizedNow: countSex(
          scopedRows
            .filter((row) => row.employee.mobilization_status === "demobilized")
            .map((row) => row.employee)
        ),
      },
    },
    scopeLabel: report.scopeLabel || "My Team",
  };
}

export async function getMobilizationReportFilterOptions(): Promise<DailyReportFilterOptions> {
  await requireAdminPortalRead();
  const regions = (await getRegions()).filter((region) => region.is_active);
  const teams: DailyReportFilterOptions["teams"] = [];

  for (const region of regions) {
    for (const leader of getRegionTeamLeaderSummaries(region)) {
      teams.push({
        regionId: region.id,
        teamLeaderId: leader.id,
        label: `${getFullName(leader.first_name, leader.last_name, leader.middle_name)} — ${region.name} (${region.code})`,
      });
    }
  }

  return {
    regions: regions.map((region) => ({
      id: region.id,
      name: region.name,
      code: region.code,
    })),
    teams,
  };
}

export async function getTeamMobilizationReportFilterOptions(): Promise<DailyReportFilterOptions> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { regions: [], teams: [] };
  }

  const myRecord = await getEmployeeRecordByUserId(session.user.id);
  if (!myRecord) return { regions: [], teams: [] };

  const ledRegionIds = await getLedRegionIds(myRecord.id);
  if (ledRegionIds.length === 0) return { regions: [], teams: [] };

  const supabase = createServiceClient();
  const { data: regions } = await supabase
    .from("library_regions")
    .select("id, name, code")
    .in("id", ledRegionIds)
    .eq("is_active", true)
    .order("sort_order");

  return {
    regions: (regions ?? []).map((region) => ({
      id: region.id,
      name: region.name,
      code: region.code,
    })),
    teams: [],
  };
}

export async function getMobilizationLogsForEmployee(
  employeeId: string
): Promise<{ success: true; logs: EmployeeMobilizationLog[] } | { success: false; error: string }> {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const access = await canManageEmployee(user.id, employeeId);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("employee_mobilization_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (error.message.includes("employee_mobilization_logs")) {
        return {
          success: false,
          error: "Mobilization logs table not found. Run migration 022 in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, logs: (data ?? []) as EmployeeMobilizationLog[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load mobilization history.",
    };
  }
}
