"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin, updateEmployeePortalRole } from "@/lib/actions/auth";
import { canManageEmployee, canViewEmployeeInPortal } from "@/lib/auth/team-leader";
import { getStatusById, statusRequiresDeploymentLocation, validateDeploymentFields } from "@/lib/deployment";
import type {
  ActionResult,
  AdminDashboardData,
  DashboardStats,
  EmployeeAccomplishment,
  EmployeeAttendance,
  EmployeeDeploymentLog,
  EmployeeMobilizationLog,
  EmployeeFormData,
  EmployeeHistoryBundle,
  EmployeeUpdateLog,
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
  RegionTeamOverview,
} from "@/lib/types";
import { getFullName, getEmployeeTeamLeaderSearchText, getRegionTeamLeaderSummaries } from "@/lib/utils";
import {
  queryEmployeeRows,
  queryRegions,
  querySingleEmployeeRow,
} from "@/lib/supabase/employee-query";
import { getTodayInputValue } from "@/lib/report/date-bounds";
import { revalidatePath } from "next/cache";

export async function getEmployees(filters?: {
  search?: string;
  regionId?: string;
  statusId?: string;
  specializationId?: string;
}): Promise<EmployeeWithRelations[]> {
  const supabase = await createClient();

  let employees = await queryEmployeeRows(supabase, (select) => {
    let query = supabase
      .from("employees")
      .select(select)
      .order("updated_at", { ascending: false });

    if (filters?.regionId) query = query.eq("region_id", filters.regionId);
    if (filters?.specializationId)
      query = query.eq("specialization_id", filters.specializationId);

    return query;
  });

  if (filters?.statusId) {
    employees = employees.filter((e) => e.status_id === filters.statusId);
  }

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    employees = employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(term) ||
        e.last_name.toLowerCase().includes(term) ||
        e.employee_id.toLowerCase().includes(term) ||
        (e.deployment_location?.toLowerCase().includes(term) ?? false) ||
        (getEmployeeTeamLeaderSearchText(e).includes(term))
    );
  }

  return employees;
}

export async function getEmployeeById(
  id: string
): Promise<EmployeeWithRelations | null> {
  const supabase = await createClient();
  return querySingleEmployeeRow(supabase, (select) =>
    supabase.from("employees").select(select).eq("id", id).single()
  );
}

export async function getEmployeeUpdateLogsForAdmin(
  employeeId: string
): Promise<{ success: true; logs: EmployeeUpdateLog[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const access = await canViewEmployeeInPortal(user.id, employeeId);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("employee_update_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.message.includes("employee_update_logs")) {
        return {
          success: false,
          error: "Update logs table not found. Run migration 006 in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }
    return { success: true, logs: (data ?? []) as EmployeeUpdateLog[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load update history.",
    };
  }
}

export async function getDeploymentLogsForAdmin(
  employeeId: string
): Promise<{ success: true; logs: EmployeeDeploymentLog[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const access = await canViewEmployeeInPortal(user.id, employeeId);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("employee_deployment_logs")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (error.message.includes("employee_deployment_logs")) {
        return {
          success: false,
          error: "Deployment logs table not found. Run migration 010 in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, logs: (data ?? []) as EmployeeDeploymentLog[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load deployment history.",
    };
  }
}

export async function getEmployeeHistoryBundleForAdmin(
  employeeId: string
): Promise<{ success: true; bundle: EmployeeHistoryBundle } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const access = await canViewEmployeeInPortal(user.id, employeeId);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const service = createServiceClient();
    const errors: EmployeeHistoryBundle["errors"] = {};

    const employeeRecord = await querySingleEmployeeRow(service, (select) =>
      service.from("employees").select(select).eq("id", employeeId).single()
    );

    if (!employeeRecord) {
      return { success: false, error: "Employee not found." };
    }

    const [profileRes, deploymentRes, mobilizationRes, accomplishmentsRes, attendanceRes] = await Promise.all([
      service
        .from("employee_update_logs")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(50),
      service
        .from("employee_deployment_logs")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(100),
      service
        .from("employee_mobilization_logs")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(100),
      service
        .from("employee_accomplishments")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(100),
      service
        .from("employee_attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    let profileLogs: EmployeeUpdateLog[] = [];
    if (profileRes.error) {
      errors.profile = profileRes.error.message.includes("employee_update_logs")
        ? "Profile logs table not found. Run migration 006 in Supabase SQL Editor."
        : profileRes.error.message;
    } else {
      profileLogs = (profileRes.data ?? []) as EmployeeUpdateLog[];
    }

    let deploymentLogs: EmployeeDeploymentLog[] = [];
    if (deploymentRes.error) {
      errors.deployment = deploymentRes.error.message.includes("employee_deployment_logs")
        ? "Deployment logs table not found. Run migration 010 in Supabase SQL Editor."
        : deploymentRes.error.message;
    } else {
      deploymentLogs = (deploymentRes.data ?? []) as EmployeeDeploymentLog[];
    }

    let mobilizationLogs: EmployeeMobilizationLog[] = [];
    if (mobilizationRes.error) {
      errors.mobilization = mobilizationRes.error.message.includes("employee_mobilization_logs")
        ? "Mobilization logs table not found. Run migration 022 in Supabase SQL Editor."
        : mobilizationRes.error.message;
    } else {
      mobilizationLogs = (mobilizationRes.data ?? []) as EmployeeMobilizationLog[];
    }

    let accomplishments: EmployeeAccomplishment[] = [];
    if (accomplishmentsRes.error) {
      errors.accomplishments = accomplishmentsRes.error.message.includes("employee_accomplishments")
        ? "Accomplishments table not found. Run migration 012 in Supabase SQL Editor."
        : accomplishmentsRes.error.message;
    } else {
      accomplishments = (accomplishmentsRes.data ?? []) as EmployeeAccomplishment[];
    }

    let attendance: EmployeeAttendance[] = [];
    if (attendanceRes.error) {
      errors.attendance = attendanceRes.error.message.includes("employee_attendance")
        ? "Attendance table not found. Run migration 007 in Supabase SQL Editor."
        : attendanceRes.error.message;
    } else {
      attendance = (attendanceRes.data ?? []) as EmployeeAttendance[];
    }

    return {
      success: true,
      bundle: {
        employee: employeeRecord,
        profileLogs,
        deploymentLogs,
        mobilizationLogs,
        accomplishments,
        attendance,
        errors,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load employee history.",
    };
  }
}

async function logDeploymentChange(
  employeeId: string,
  adminUserId: string,
  statusId: string | null | undefined,
  statusName: string,
  deploymentLocation: string | null | undefined,
  actualTask: string | null | undefined,
  before: Pick<EmployeeWithRelations, "status_id" | "deployment_location" | "actual_task"> | null
) {
  const nextStatusId = statusId || null;
  const nextLocation = deploymentLocation?.trim() || null;
  const nextActualTask = actualTask?.trim() || null;
  const prevStatusId = before?.status_id ?? null;
  const prevLocation = before?.deployment_location?.trim() || null;
  const prevActualTask = before?.actual_task?.trim() || null;

  if (
    nextStatusId === prevStatusId &&
    nextLocation === prevLocation &&
    nextActualTask === prevActualTask
  ) {
    return;
  }

  const service = createServiceClient();
  await service.from("employee_deployment_logs").insert({
    employee_id: employeeId,
    user_id: adminUserId,
    status_id: nextStatusId,
    status_name: statusName,
    deployment_location: nextLocation,
    actual_task: nextActualTask,
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const employees = await getEmployees();
  return buildDashboardStats(employees);
}

function buildDashboardStats(employees: EmployeeWithRelations[]): DashboardStats {
  const deployed = employees.filter(
    (e) => e.status?.name === "Deployed"
  ).length;
  const onStandby = employees.filter(
    (e) => e.status?.name === "On Standby"
  ).length;
  const onLeave = employees.filter(
    (e) => e.status?.name === "On Leave"
  ).length;

  const statusMap = new Map<string, { name: string; count: number; color: string }>();
  employees.forEach((e) => {
    if (e.status) {
      const existing = statusMap.get(e.status.id);
      if (existing) {
        existing.count++;
      } else {
        statusMap.set(e.status.id, {
          name: e.status.name,
          count: 1,
          color: e.status.color,
        });
      }
    }
  });

  const regionMap = new Map<string, { name: string; code: string; count: number }>();
  employees.forEach((e) => {
    if (e.region) {
      const existing = regionMap.get(e.region.id);
      if (existing) {
        existing.count++;
      } else {
        regionMap.set(e.region.id, {
          name: e.region.name,
          code: e.region.code,
          count: 1,
        });
      }
    }
  });

  return {
    total: employees.length,
    deployed,
    onStandby,
    onLeave,
    byStatus: Array.from(statusMap.values()),
    byRegion: Array.from(regionMap.values()).sort((a, b) => b.count - a.count),
  };
}

function buildRegionTeamOverviews(
  regions: LibraryRegion[],
  employees: EmployeeWithRelations[]
): RegionTeamOverview[] {
  const leaderIdsForRegion = (region: LibraryRegion) =>
    new Set(getRegionTeamLeaderSummaries(region).map((leader) => leader.id));

  return regions
    .filter((region) => region.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((region) => {
      const leaderIds = leaderIdsForRegion(region);
      return {
        region,
        members: employees.filter(
          (employee) =>
            employee.region_id === region.id && !leaderIds.has(employee.id)
        ),
      };
    })
    .filter(
      (overview) =>
        getRegionTeamLeaderSummaries(overview.region).length > 0 ||
        overview.members.length > 0
    );
}

async function syncRegionTeamLeaders(
  regionId: string,
  teamLeaderEmployeeIds: string[]
): Promise<ActionResult> {
  const supabase = createServiceClient();
  const uniqueIds = Array.from(
    new Set(teamLeaderEmployeeIds.map((id) => id.trim()).filter(Boolean))
  );

  const { error: deleteError } = await supabase
    .from("library_region_team_leaders")
    .delete()
    .eq("region_id", regionId);

  if (deleteError) return { success: false, error: deleteError.message };

  if (uniqueIds.length === 0) return { success: true };

  const { error: insertError } = await supabase.from("library_region_team_leaders").insert(
    uniqueIds.map((employee_id) => ({
      region_id: regionId,
      employee_id,
    }))
  );

  if (insertError) return { success: false, error: insertError.message };
  return { success: true };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [employees, regions, statuses] = await Promise.all([
    getEmployees(),
    getRegions(),
    getStatuses(),
  ]);
  const stats = buildDashboardStats(employees);
  const regionTeams = buildRegionTeamOverviews(regions, employees);

  const specMap = new Map<string, number>();
  employees.forEach((e) => {
    const name = e.specialization?.name ?? "Unassigned";
    specMap.set(name, (specMap.get(name) ?? 0) + 1);
  });

  const withPhoto = employees.filter((e) => e.photo_url).length;
  const withGps = employees.filter(
    (e) => e.last_latitude != null && e.last_longitude != null
  ).length;
  const registeredAccounts = employees.filter((e) => e.user_id).length;
  const deploymentRate =
    stats.total > 0 ? Math.round((stats.deployed / stats.total) * 100) : 0;

  let clockedIn = 0;
  let todayTimeIn = 0;
  let todayTimeOut = 0;
  const clockedInEmployees: AdminDashboardData["clockedInEmployees"] = [];
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  try {
    const service = createServiceClient();
    const { data: attendance } = await service
      .from("employee_attendance")
      .select("employee_id, action, created_at")
      .order("created_at", { ascending: false });

    const latestByEmployee = new Map<string, { action: string; created_at: string }>();
    const today = new Date().toISOString().slice(0, 10);

    for (const record of attendance ?? []) {
      if (!latestByEmployee.has(record.employee_id)) {
        latestByEmployee.set(record.employee_id, record);
      }
      if (record.created_at.startsWith(today)) {
        if (record.action === "time_in") todayTimeIn++;
        if (record.action === "time_out") todayTimeOut++;
      }
    }

    for (const [employeeId, record] of Array.from(latestByEmployee.entries())) {
      if (record.action === "time_in") {
        clockedIn++;
        const emp = employeeMap.get(employeeId);
        if (emp) {
          clockedInEmployees.push({
            id: emp.id,
            employee_id: emp.employee_id,
            name: getFullName(emp.first_name, emp.last_name, emp.middle_name),
            lastTimeIn: record.created_at,
            deployment_location: emp.deployment_location,
          });
        }
      }
    }
  } catch {
    // attendance table may not exist yet
  }

  return {
    stats,
    extended: {
      clockedIn,
      withPhoto,
      withGps,
      registeredAccounts,
      todayTimeIn,
      todayTimeOut,
      deploymentRate,
    },
    bySpecialization: Array.from(specMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    employees,
    clockedInEmployees,
    regionTeams,
    statuses,
    generatedAt: new Date().toISOString(),
  };
}

export async function createEmployee(data: EmployeeFormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("employees").insert({
      employee_id: data.employee_id,
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      specialization_id: data.specialization_id || null,
      region_id: data.region_id || null,
      notes: data.notes || null,
      photo_url: data.photo_url || null,
      mobilization_status: "mobilized",
      mobilized_at: getTodayInputValue(),
    });

    if (error) return { success: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create employee" };
  }
}

export async function updateEmployee(id: string, data: EmployeeFormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("employees")
      .update({
        employee_id: data.employee_id,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        specialization_id: data.specialization_id || null,
        region_id: data.region_id || null,
        notes: data.notes || null,
        photo_url: data.photo_url || null,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    if (data.portal_role) {
      const roleResult = await updateEmployeePortalRole(id, data.portal_role);
      if (!roleResult.success) return roleResult;
    }

    revalidatePath("/");
    revalidatePath(`/employees/${id}`);
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update employee" };
  }
}

export async function updateEmployeeDeployment(
  id: string,
  statusId: string,
  deploymentLocation?: string,
  actualTask?: string
): Promise<ActionResult> {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in." };
    }

    const access = await canManageEmployee(user.id, id);
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const statuses = await getStatuses();
    const deploymentError = validateDeploymentFields(
      statusId,
      deploymentLocation,
      statuses,
      actualTask
    );
    if (deploymentError) {
      return { success: false, error: deploymentError };
    }

    const status = getStatusById(statusId, statuses);
    if (!status) {
      return { success: false, error: "Selected deployment status is invalid." };
    }

    const isDeployed = statusRequiresDeploymentLocation(status.name);
    const nextLocation = isDeployed ? deploymentLocation?.trim() || null : null;
    const nextActualTask = isDeployed ? actualTask?.trim() || null : null;

    const supabase = createServiceClient();
    const { data: before, error: fetchError } = await supabase
      .from("employees")
      .select("status_id, deployment_location, actual_task")
      .eq("id", id)
      .single();

    if (fetchError) return { success: false, error: fetchError.message };

    const { error } = await supabase
      .from("employees")
      .update({
        status_id: statusId,
        deployment_location: nextLocation,
        actual_task: nextActualTask,
        deployment_set_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    await logDeploymentChange(
      id,
      user.id,
      statusId,
      status.name,
      nextLocation,
      nextActualTask,
      before
    );

    revalidatePath("/");
    revalidatePath(`/employees/${id}`);
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");
    revalidatePath("/employee/dashboard");
    revalidatePath("/employee/team");
    revalidatePath("/employee/daily-report");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update deployment.",
    };
  }
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete employee" };
  }
}

export async function getSpecializations(
  activeOnly = true
): Promise<LibrarySpecialization[]> {
  const supabase = await createClient();
  let query = supabase
    .from("library_specializations")
    .select("*")
    .order("sort_order");

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRegions(activeOnly = true): Promise<LibraryRegion[]> {
  const supabase = await createClient();
  return queryRegions(supabase, (select) => {
    let query = supabase.from("library_regions").select(select).order("sort_order");
    if (activeOnly) query = query.eq("is_active", true);
    return query;
  });
}

export async function getStatuses(activeOnly = true): Promise<LibraryStatus[]> {
  const supabase = await createClient();
  let query = supabase
    .from("library_statuses")
    .select("*")
    .order("sort_order");

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAllLibraries() {
  await requireAdmin();
  const supabase = createServiceClient();

  const [specRes, regions, statusRes] = await Promise.all([
    supabase.from("library_specializations").select("*").order("sort_order"),
    queryRegions(supabase, (select) =>
      supabase.from("library_regions").select(select).order("sort_order")
    ),
    supabase.from("library_statuses").select("*").order("sort_order"),
  ]);

  if (specRes.error) throw new Error(specRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);

  return {
    specializations: specRes.data ?? [],
    regions,
    statuses: statusRes.data ?? [],
  };
}

export async function createSpecialization(data: {
  name: string;
  description?: string;
  sort_order?: number;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("library_specializations").insert({
      name: data.name,
      description: data.description || null,
      sort_order: data.sort_order ?? 0,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/libraries");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create specialization" };
  }
}

export async function updateSpecialization(
  id: string,
  data: { name: string; description?: string; sort_order?: number; is_active?: boolean }
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("library_specializations")
      .update(data)
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/libraries");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update specialization" };
  }
}

export async function createRegion(data: {
  name: string;
  code: string;
  team_leader_employee_ids?: string[];
  sort_order?: number;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data: created, error } = await supabase
      .from("library_regions")
      .insert({
        name: data.name,
        code: data.code,
        sort_order: data.sort_order ?? 0,
      })
      .select("id")
      .single();

    if (error || !created) return { success: false, error: error?.message ?? "Failed to create region" };

    const syncResult = await syncRegionTeamLeaders(
      created.id,
      data.team_leader_employee_ids ?? []
    );
    if (!syncResult.success) return syncResult;

    revalidatePath("/admin/libraries");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create region" };
  }
}

export async function updateRegion(
  id: string,
  data: {
    name: string;
    code: string;
    team_leader_employee_ids?: string[];
    sort_order?: number;
    is_active?: boolean;
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("library_regions")
      .update({
        name: data.name,
        code: data.code,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
      .eq("id", id);
    if (error) return { success: false, error: error.message };

    if (data.team_leader_employee_ids !== undefined) {
      const syncResult = await syncRegionTeamLeaders(id, data.team_leader_employee_ids);
      if (!syncResult.success) return syncResult;
    }

    revalidatePath("/admin/libraries");
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");
    revalidatePath("/employee/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update region" };
  }
}

export async function createStatus(data: {
  name: string;
  color: string;
  sort_order?: number;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("library_statuses").insert({
      name: data.name,
      color: data.color,
      sort_order: data.sort_order ?? 0,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/libraries");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create status" };
  }
}

export async function updateStatus(
  id: string,
  data: { name: string; color: string; sort_order?: number; is_active?: boolean }
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("library_statuses")
      .update(data)
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/libraries");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update status" };
  }
}
