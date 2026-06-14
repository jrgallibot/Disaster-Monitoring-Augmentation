"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingTableError } from "@/lib/supabase/errors";
import { getEmployeeSession } from "@/lib/actions/auth";
import { getUserRole } from "@/lib/auth/employee-sync";
import { getLedRegionIds, getTeamMemberIdsForLeader } from "@/lib/auth/team-leader";
import { isTeamLeaderRole } from "@/lib/auth/roles";
import type { ActionResult, EmployeeAccomplishment } from "@/lib/types";
import { revalidatePath } from "next/cache";

async function getEmployeeIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

async function isTeamLeaderEmployee(employeeId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  if (isTeamLeaderRole(role)) return true;
  const ledRegionIds = await getLedRegionIds(employeeId);
  return ledRegionIds.length > 0;
}

async function propagateAccomplishmentToTeamMembers(
  leaderEmployeeId: string,
  sourceAccomplishmentId: string,
  content: string,
  latitude: number | null,
  longitude: number | null
): Promise<number> {
  const memberIds = await getTeamMemberIdsForLeader(leaderEmployeeId);
  if (memberIds.length === 0) return 0;

  const service = createServiceClient();
  const rows = memberIds.map((employeeId) => ({
    employee_id: employeeId,
    user_id: null,
    content,
    latitude,
    longitude,
    source_accomplishment_id: sourceAccomplishmentId,
    shared_by_team_leader_id: leaderEmployeeId,
  }));

  const { error } = await service.from("employee_accomplishments").insert(rows);
  if (error) {
    if (isMissingColumnError(error)) {
      return 0;
    }
    throw new Error(error.message);
  }

  return memberIds.length;
}

function isMissingColumnError(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    message.includes("source_accomplishment_id") ||
    message.includes("shared_by_team_leader_id")
  );
}

export async function getMyAccomplishments(limit = 30): Promise<EmployeeAccomplishment[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const employeeId = await getEmployeeIdForUser(user.id);
  if (!employeeId) return [];

  const service = createServiceClient();
  const { data, error } = await service
    .from("employee_accomplishments")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as EmployeeAccomplishment[];
}

export async function addMyAccomplishment(
  content: string,
  latitude?: number,
  longitude?: number
): Promise<ActionResult> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "Please enter your accomplishment or activity update." };
  }
  if (trimmed.length < 10) {
    return { success: false, error: "Accomplishment must be at least 10 characters." };
  }

  const employeeId = await getEmployeeIdForUser(session.user.id);
  if (!employeeId) {
    return { success: false, error: "No employee record linked to your account." };
  }

  const service = createServiceClient();
  const { data: inserted, error } = await service
    .from("employee_accomplishments")
    .insert({
      employee_id: employeeId,
      user_id: session.user.id,
      content: trimmed,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return {
        success: false,
        error: "Accomplishments table not found. Run migration 012 in Supabase SQL Editor.",
      };
    }
    return { success: false, error: error.message };
  }

  let sharedCount = 0;
  const isLeader = await isTeamLeaderEmployee(employeeId, session.user.id);
  if (isLeader && inserted?.id) {
    try {
      sharedCount = await propagateAccomplishmentToTeamMembers(
        employeeId,
        inserted.id,
        trimmed,
        latitude ?? null,
        longitude ?? null
      );
    } catch {
      // Leader record saved; sharing failure should not block submission.
    }
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/team");
  revalidatePath("/employee/daily-report");
  revalidatePath("/admin/employees");
  return { success: true, sharedCount };
}

export async function getAccomplishmentsForAdmin(
  employeeId: string
): Promise<{ success: true; records: EmployeeAccomplishment[] } | { success: false; error: string }> {
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
      .from("employee_accomplishments")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingTableError(error)) {
        return {
          success: false,
          error: "Accomplishments table not found. Run migration 012 in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, records: (data ?? []) as EmployeeAccomplishment[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load accomplishments.",
    };
  }
}
