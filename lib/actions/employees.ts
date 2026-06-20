"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin, updateEmployeePortalRole } from "@/lib/actions/auth";
import { canManageEmployee, canViewEmployeeInPortal, employeeIsAssignedToLeader } from "@/lib/auth/team-leader";
import { getStatusById, statusRequiresDeploymentLocation, statusRequiresDeploymentRemarks, validateDeploymentFields } from "@/lib/deployment";
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
import { countSex } from "@/lib/sex-stats";
import { getFullName, getEmployeeTeamLeaderSearchText, getRegionTeamLeaderSummaries } from "@/lib/utils";
import {
  queryEmployeeRows,
  queryRegions,
  querySingleEmployeeRow,
} from "@/lib/supabase/employee-query";
import { getTodayInputValue } from "@/lib/report/date-bounds";
import { revalidatePath } from "next/cache";
import {
  notifyEmployeeUser,
  notifyTeamLeaderOfEmployeeAction,
} from "@/lib/actions/notifications";
import { getEmployeeRecordByUserId } from "@/lib/auth/team-leader";

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
  deploymentRemarks: string | null | undefined,
  before: Pick<EmployeeWithRelations, "status_id" | "deployment_location" | "actual_task" | "deployment_remarks"> | null
) {
  const nextStatusId = statusId || null;
  const nextLocation = deploymentLocation?.trim() || null;
  const nextActualTask = actualTask?.trim() || null;
  const nextRemarks = deploymentRemarks?.trim() || null;
  const prevStatusId = before?.status_id ?? null;
  const prevLocation = before?.deployment_location?.trim() || null;
  const prevActualTask = before?.actual_task?.trim() || null;
  const prevRemarks = before?.deployment_remarks?.trim() || null;

  if (
    nextStatusId === prevStatusId &&
    nextLocation === prevLocation &&
    nextActualTask === prevActualTask &&
    nextRemarks === prevRemarks
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
    deployment_remarks: nextRemarks,
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const employees = await getEmployees();
  return buildDashboardStats(employees);
}

function buildDashboardStats(employees: EmployeeWithRelations[]): DashboardStats {
  const deployedEmployees = employees.filter((e) => e.status?.name === "Deployed");
  const onStandbyEmployees = employees.filter((e) => e.status?.name === "On Standby");
  const onLeaveEmployees = employees.filter((e) => e.status?.name === "On Leave");

  const statusMap = new Map<
    string,
    { name: string; count: number; color: string; male: number; female: number }
  >();
  employees.forEach((e) => {
    if (e.status) {
      const existing = statusMap.get(e.status.id);
      if (existing) {
        existing.count++;
        if (e.sex === "male") existing.male++;
        else if (e.sex === "female") existing.female++;
      } else {
        statusMap.set(e.status.id, {
          name: e.status.name,
          count: 1,
          color: e.status.color,
          male: e.sex === "male" ? 1 : 0,
          female: e.sex === "female" ? 1 : 0,
        });
      }
    }
  });

  const regionMap = new Map<
    string,
    { name: string; code: string; count: number; male: number; female: number }
  >();
  employees.forEach((e) => {
    if (e.region) {
      const existing = regionMap.get(e.region.id);
      if (existing) {
        existing.count++;
        if (e.sex === "male") existing.male++;
        else if (e.sex === "female") existing.female++;
      } else {
        regionMap.set(e.region.id, {
          name: e.region.name,
          code: e.region.code,
          count: 1,
          male: e.sex === "male" ? 1 : 0,
          female: e.sex === "female" ? 1 : 0,
        });
      }
    }
  });

  return {
    total: employees.length,
    deployed: deployedEmployees.length,
    onStandby: onStandbyEmployees.length,
    onLeave: onLeaveEmployees.length,
    sex: {
      total: countSex(employees),
      deployed: countSex(deployedEmployees),
      onStandby: countSex(onStandbyEmployees),
      onLeave: countSex(onLeaveEmployees),
    },
    byStatus: Array.from(statusMap.values()),
    byRegion: Array.from(regionMap.values()).sort((a, b) => b.count - a.count),
  };
}

function buildRegionTeamOverviews(
  regions: LibraryRegion[],
  employees: EmployeeWithRelations[]
): RegionTeamOverview[] {
  const overviews: RegionTeamOverview[] = [];

  for (const region of regions
    .filter((item) => item.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)) {
    for (const teamLeader of getRegionTeamLeaderSummaries(region)) {
      const members = employees.filter((employee) =>
        employeeIsAssignedToLeader(
          { ...employee, region: employee.region ?? region },
          teamLeader.id
        )
      );

      overviews.push({ region, teamLeader, members });
    }
  }

  return overviews;
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

  const specMap = new Map<string, { count: number; male: number; female: number }>();
  employees.forEach((e) => {
    const name = e.specialization?.name ?? "Unassigned";
    const existing = specMap.get(name);
    if (existing) {
      existing.count++;
      if (e.sex === "male") existing.male++;
      else if (e.sex === "female") existing.female++;
    } else {
      specMap.set(name, {
        count: 1,
        male: e.sex === "male" ? 1 : 0,
        female: e.sex === "female" ? 1 : 0,
      });
    }
  });

  const withPhotoEmployees = employees.filter((e) => e.photo_url);
  const withGpsEmployees = employees.filter(
    (e) => e.last_latitude != null && e.last_longitude != null
  );
  const registeredEmployees = employees.filter((e) => e.user_id);

  const withPhoto = withPhotoEmployees.length;
  const withGps = withGpsEmployees.length;
  const registeredAccounts = registeredEmployees.length;
  const deploymentRate =
    stats.total > 0 ? Math.round((stats.deployed / stats.total) * 100) : 0;

  let clockedIn = 0;
  let todayTimeIn = 0;
  let todayTimeOut = 0;
  const clockedInEmployees: AdminDashboardData["clockedInEmployees"] = [];
  const clockedInList: EmployeeWithRelations[] = [];
  const todayTimeInList: EmployeeWithRelations[] = [];
  const todayTimeOutList: EmployeeWithRelations[] = [];
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
        const emp = employeeMap.get(record.employee_id);
        if (record.action === "time_in") {
          todayTimeIn++;
          if (emp) todayTimeInList.push(emp);
        }
        if (record.action === "time_out") {
          todayTimeOut++;
          if (emp) todayTimeOutList.push(emp);
        }
      }
    }

    for (const [employeeId, record] of Array.from(latestByEmployee.entries())) {
      if (record.action === "time_in") {
        clockedIn++;
        const emp = employeeMap.get(employeeId);
        if (emp) {
          clockedInList.push(emp);
          clockedInEmployees.push({
            id: emp.id,
            employee_id: emp.employee_id,
            name: getFullName(emp.first_name, emp.last_name, emp.middle_name),
            lastTimeIn: record.created_at,
            deployment_location: emp.deployment_location,
            sex: emp.sex,
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
      sex: {
        clockedIn: countSex(clockedInList),
        withPhoto: countSex(withPhotoEmployees),
        withGps: countSex(withGpsEmployees),
        registeredAccounts: countSex(registeredEmployees),
        todayTimeIn: countSex(todayTimeInList),
        todayTimeOut: countSex(todayTimeOutList),
      },
    },
    bySpecialization: Array.from(specMap.entries())
      .map(([name, value]) => ({ name, ...value }))
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
    const { user } = await requireAdmin();
    const supabase = createServiceClient();
    const { data: created, error } = await supabase
      .from("employees")
      .insert({
        employee_id: data.employee_id,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        sex: data.sex || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        specialization_id: data.specialization_id || null,
        region_id: data.region_id || null,
        notes: data.notes || null,
        photo_url: data.photo_url || null,
        mobilization_status: "mobilized",
        mobilized_at: getTodayInputValue(),
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    if (created?.id) {
      await supabase.from("employee_update_logs").insert({
        employee_id: created.id,
        user_id: user.id,
        summary: "Admin created employee record",
        changes: {
          employee_id: { from: null, to: data.employee_id },
        },
      });
    }

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
    const { user } = await requireAdmin();
    const supabase = createServiceClient();

    const before = await querySingleEmployeeRow(supabase, (select) =>
      supabase.from("employees").select(select).eq("id", id).single()
    );
    if (!before) {
      return { success: false, error: "Employee not found." };
    }

    const { error } = await supabase
      .from("employees")
      .update({
        employee_id: data.employee_id,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        sex: data.sex || null,
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

    const changes: Record<string, { from: string | null; to: string | null }> = {};
    const track = (field: string, from: string | null | undefined, to: string | null | undefined) => {
      const fromVal = from ?? null;
      const toVal = to ?? null;
      if (fromVal !== toVal) changes[field] = { from: fromVal, to: toVal };
    };

    track("employee_id", before.employee_id, data.employee_id);
    track("first_name", before.first_name, data.first_name);
    track("last_name", before.last_name, data.last_name);
    track("middle_name", before.middle_name, data.middle_name || null);
    track("sex", before.sex, data.sex || null);
    track("email", before.email, data.email || null);
    track("phone", before.phone, data.phone || null);
    track("address", before.address, data.address || null);
    track("specialization_id", before.specialization_id, data.specialization_id || null);
    track("region_id", before.region_id, data.region_id || null);
    track("notes", before.notes, data.notes || null);
    track("photo_url", before.photo_url, data.photo_url || null);

    if (Object.keys(changes).length > 0) {
      await supabase.from("employee_update_logs").insert({
        employee_id: id,
        user_id: user.id,
        summary: "Admin updated employee record",
        changes,
        deployment_location: before.deployment_location,
        status_name: before.status?.name ?? null,
      });
    }

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
  actualTask?: string,
  deploymentRemarks?: string
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
      actualTask,
      deploymentRemarks
    );
    if (deploymentError) {
      return { success: false, error: deploymentError };
    }

    const status = getStatusById(statusId, statuses);
    if (!status) {
      return { success: false, error: "Selected deployment status is invalid." };
    }

    const isDeployed = statusRequiresDeploymentLocation(status.name);
    const requiresRemarks = statusRequiresDeploymentRemarks(status.name);
    const nextLocation = isDeployed ? deploymentLocation?.trim() || null : null;
    const nextActualTask = isDeployed ? actualTask?.trim() || null : null;
    const nextRemarks = requiresRemarks ? deploymentRemarks?.trim() || null : null;

    const supabase = createServiceClient();
    const { data: before, error: fetchError } = await supabase
      .from("employees")
      .select("status_id, deployment_location, actual_task, deployment_remarks")
      .eq("id", id)
      .single();

    if (fetchError) return { success: false, error: fetchError.message };

    const { error } = await supabase
      .from("employees")
      .update({
        status_id: statusId,
        deployment_location: nextLocation,
        actual_task: nextActualTask,
        deployment_remarks: nextRemarks,
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
      nextRemarks,
      before
    );

    const actorRecord = await getEmployeeRecordByUserId(user.id);
    if (actorRecord?.id === id) {
      await notifyTeamLeaderOfEmployeeAction(
        id,
        "deployment_update",
        "Deployment status updated",
        `${status.name}${nextLocation ? ` — ${nextLocation}` : ""}`,
        "/employee/team"
      );
    } else {
      const { data: targetEmployee } = await supabase
        .from("employees")
        .select("user_id, first_name, last_name")
        .eq("id", id)
        .maybeSingle();
      const { data: actorEmployee } = await supabase
        .from("employees")
        .select("first_name, last_name, middle_name")
        .eq("id", actorRecord?.id ?? "")
        .maybeSingle();
      const actorName = actorEmployee
        ? `${actorEmployee.last_name}, ${actorEmployee.first_name}${
            actorEmployee.middle_name ? ` ${actorEmployee.middle_name}` : ""
          }`
        : "Team Leader";
      await notifyEmployeeUser(
        targetEmployee?.user_id,
        "deployment_update",
        "Your deployment status was updated",
        `${status.name}${nextLocation ? ` — ${nextLocation}` : ""}`,
        "/employee/dashboard",
        undefined,
        actorName
      );
    }

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
