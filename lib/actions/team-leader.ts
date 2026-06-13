"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getEmployeeSession } from "@/lib/actions/auth";
import {
  canManageEmployee,
  getEmployeeRecordByUserId,
  getLedRegionIds,
} from "@/lib/auth/team-leader";
import { EMPLOYEE_SELECT, REGION_SELECT } from "@/lib/supabase/selects";
import type {
  ActionResult,
  EmployeeFormData,
  EmployeeWithRelations,
  LibraryRegion,
  TeamLeaderContext,
} from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getTeamLeaderContext(): Promise<TeamLeaderContext> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { isTeamLeader: false, ledRegions: [], myEmployee: null };
  }

  const supabase = createServiceClient();
  const { data: myEmployee, error: employeeError } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (employeeError || !myEmployee) {
    return { isTeamLeader: false, ledRegions: [], myEmployee: null };
  }

  const employeeRecord = myEmployee as unknown as EmployeeWithRelations;

  const { data: ledRegions, error: regionError } = await supabase
    .from("library_regions")
    .select(REGION_SELECT)
    .eq("team_leader_employee_id", employeeRecord.id)
    .eq("is_active", true)
    .order("sort_order");

  if (regionError) {
    return {
      isTeamLeader: false,
      ledRegions: [],
      myEmployee: employeeRecord,
    };
  }

  const regions = (ledRegions ?? []) as LibraryRegion[];
  return {
    isTeamLeader: regions.length > 0,
    ledRegions: regions,
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
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .in("region_id", ledRegionIds)
    .neq("id", myRecord.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EmployeeWithRelations[];
}

export async function getManagedEmployeeById(
  id: string
): Promise<EmployeeWithRelations | null> {
  const session = await getEmployeeSession();
  if ("error" in session) return null;

  const access = await canManageEmployee(session.user.id, id);
  if (!access.allowed) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as EmployeeWithRelations;
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

export async function requireTeamLeaderForPage(): Promise<TeamLeaderContext> {
  const context = await getTeamLeaderContext();
  if (!context.isTeamLeader) {
    redirect("/employee/dashboard");
  }
  return context;
}