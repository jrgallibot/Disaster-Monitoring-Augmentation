"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingTableError } from "@/lib/supabase/errors";
import { getEmployeeSession } from "@/lib/actions/auth";
import { getUserRole } from "@/lib/auth/employee-sync";
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
  const { error } = await service.from("employee_accomplishments").insert({
    employee_id: employeeId,
    user_id: session.user.id,
    content: trimmed,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  });

  if (error) {
    if (isMissingTableError(error)) {
      return {
        success: false,
        error: "Accomplishments table not found. Run migration 012 in Supabase SQL Editor.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/employees");
  return { success: true };
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
