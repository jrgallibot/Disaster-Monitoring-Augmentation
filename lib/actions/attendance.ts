"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getEmployeeSession } from "@/lib/actions/auth";
import { uploadToEmployeePhotoBucket } from "@/lib/actions/photo-storage";
import { getUserRole } from "@/lib/auth/employee-sync";
import type {
  ActionResult,
  AttendanceAction,
  AttendanceStatus,
  EmployeeAttendance,
} from "@/lib/types";
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

async function getLatestAttendance(employeeId: string): Promise<EmployeeAttendance | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("employee_attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as EmployeeAttendance | null) ?? null;
}

export async function getMyAttendanceStatus(): Promise<AttendanceStatus> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isClockedIn: false, lastRecord: null };

  const employeeId = await getEmployeeIdForUser(user.id);
  if (!employeeId) return { isClockedIn: false, lastRecord: null };

  const lastRecord = await getLatestAttendance(employeeId);
  return {
    isClockedIn: lastRecord?.action === "time_in",
    lastRecord,
  };
}

export async function getMyAttendance(limit = 30): Promise<EmployeeAttendance[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const employeeId = await getEmployeeIdForUser(user.id);
  if (!employeeId) return [];

  const { data, error } = await supabase
    .from("employee_attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as EmployeeAttendance[];
}

export async function uploadAttendanceSelfie(
  formData: FormData,
  action: AttendanceAction
): Promise<ActionResult & { url?: string }> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const file = formData.get("photo") as File | null;
  const stamp = Date.now();
  return uploadToEmployeePhotoBucket(
    session.user.id,
    file,
    `attendance/${action}-${stamp}`,
    { upsert: false }
  );
}

export async function recordAttendance(
  action: AttendanceAction,
  photoUrl: string,
  latitude?: number,
  longitude?: number
): Promise<ActionResult> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const employeeId = await getEmployeeIdForUser(session.user.id);
  if (!employeeId) {
    return { success: false, error: "No employee record linked to your account." };
  }

  const lastRecord = await getLatestAttendance(employeeId);

  if (action === "time_in" && lastRecord?.action === "time_in") {
    return { success: false, error: "You are already timed in. Please time out first." };
  }
  if (action === "time_out" && lastRecord?.action !== "time_in") {
    return { success: false, error: "You have no active time in. Please time in first." };
  }

  const trimmedPhotoUrl = photoUrl?.trim();
  if (!trimmedPhotoUrl) {
    return { success: false, error: "Selfie photo is required for time in/out." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employee_attendance").insert({
    employee_id: employeeId,
    user_id: session.user.id,
    action,
    photo_url: trimmedPhotoUrl,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  });

  if (error) {
    if (error.message.includes("employee_attendance")) {
      return {
        success: false,
        error: "Attendance table not found. Run migration 007 in Supabase SQL Editor.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/employees");
  return { success: true };
}

export async function getAttendanceForAdmin(
  employeeId: string
): Promise<{ success: true; records: EmployeeAttendance[] } | { success: false; error: string }> {
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
      .from("employee_attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (error.message.includes("employee_attendance")) {
        return {
          success: false,
          error: "Attendance table not found. Run migration 007 in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true, records: (data ?? []) as EmployeeAttendance[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load attendance records.",
    };
  }
}
