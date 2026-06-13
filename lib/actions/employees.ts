"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/actions/auth";
import { getUserRole } from "@/lib/auth/employee-sync";
import type {
  ActionResult,
  AdminDashboardData,
  DashboardStats,
  EmployeeFormData,
  EmployeeUpdateLog,
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
} from "@/lib/types";
import { getFullName } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const EMPLOYEE_SELECT = `
  *,
  specialization:library_specializations(*),
  region:library_regions(*),
  status:library_statuses(*)
`;

export async function getEmployees(filters?: {
  search?: string;
  regionId?: string;
  statusId?: string;
  specializationId?: string;
}): Promise<EmployeeWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .order("updated_at", { ascending: false });

  if (filters?.regionId) query = query.eq("region_id", filters.regionId);
  if (filters?.statusId) query = query.eq("status_id", filters.statusId);
  if (filters?.specializationId)
    query = query.eq("specialization_id", filters.specializationId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let employees = (data ?? []) as EmployeeWithRelations[];

  if (filters?.search) {
    const term = filters.search.toLowerCase();
    employees = employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(term) ||
        e.last_name.toLowerCase().includes(term) ||
        e.employee_id.toLowerCase().includes(term) ||
        (e.deployment_location?.toLowerCase().includes(term) ?? false)
    );
  }

  return employees;
}

export async function getEmployeeById(
  id: string
): Promise<EmployeeWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as EmployeeWithRelations;
}

export async function getEmployeeUpdateLogsForAdmin(
  employeeId: string
): Promise<{ success: true; logs: EmployeeUpdateLog[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "You must be logged in as an administrator." };
    }

    const role = await getUserRole(user.id);
    if (role !== "admin") {
      return { success: false, error: "You do not have admin permissions." };
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

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const employees = await getEmployees();
  const stats = buildDashboardStats(employees);

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
      status_id: data.status_id || null,
      deployment_location: data.deployment_location || null,
      notes: data.notes || null,
      photo_url: data.photo_url || null,
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
        status_id: data.status_id || null,
        deployment_location: data.deployment_location || null,
        notes: data.notes || null,
        photo_url: data.photo_url || null,
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/");
    revalidatePath(`/employees/${id}`);
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update employee" };
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
  let query = supabase
    .from("library_regions")
    .select("*")
    .order("sort_order");

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
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

  const [specRes, regionRes, statusRes] = await Promise.all([
    supabase.from("library_specializations").select("*").order("sort_order"),
    supabase.from("library_regions").select("*").order("sort_order"),
    supabase.from("library_statuses").select("*").order("sort_order"),
  ]);

  if (specRes.error) throw new Error(specRes.error.message);
  if (regionRes.error) throw new Error(regionRes.error.message);
  if (statusRes.error) throw new Error(statusRes.error.message);

  return {
    specializations: specRes.data ?? [],
    regions: regionRes.data ?? [],
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
  sort_order?: number;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase.from("library_regions").insert({
      name: data.name,
      code: data.code,
      sort_order: data.sort_order ?? 0,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/libraries");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create region" };
  }
}

export async function updateRegion(
  id: string,
  data: { name: string; code: string; sort_order?: number; is_active?: boolean }
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("library_regions")
      .update(data)
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/libraries");
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
