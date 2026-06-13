"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  EmployeeFormData,
  EmployeeWithRelations,
  LibraryRegion,
  LibrarySpecialization,
  LibraryStatus,
} from "@/lib/types";
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const employees = await getEmployees();

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

export async function createEmployee(data: EmployeeFormData) {
  const supabase = await createClient();
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

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
}

export async function updateEmployee(id: string, data: EmployeeFormData) {
  const supabase = await createClient();
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

  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/employees/${id}`);
  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
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
  const [specializations, regions, statuses] = await Promise.all([
    getSpecializations(false),
    getRegions(false),
    getStatuses(false),
  ]);
  return { specializations, regions, statuses };
}

export async function createSpecialization(data: {
  name: string;
  description?: string;
  sort_order?: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("library_specializations").insert({
    name: data.name,
    description: data.description || null,
    sort_order: data.sort_order ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/libraries");
}

export async function updateSpecialization(
  id: string,
  data: { name: string; description?: string; sort_order?: number; is_active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("library_specializations")
    .update(data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/libraries");
}

export async function createRegion(data: {
  name: string;
  code: string;
  sort_order?: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("library_regions").insert({
    name: data.name,
    code: data.code,
    sort_order: data.sort_order ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/libraries");
}

export async function updateRegion(
  id: string,
  data: { name: string; code: string; sort_order?: number; is_active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("library_regions")
    .update(data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/libraries");
}

export async function createStatus(data: {
  name: string;
  color: string;
  sort_order?: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("library_statuses").insert({
    name: data.name,
    color: data.color,
    sort_order: data.sort_order ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/libraries");
}

export async function updateStatus(
  id: string,
  data: { name: string; color: string; sort_order?: number; is_active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("library_statuses")
    .update(data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/libraries");
}
