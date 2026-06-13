"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRegions, getSpecializations } from "@/lib/actions/employees";
import { EMPLOYEE_SELECT } from "@/lib/supabase/selects";
import type {
  ActionResult,
  EmployeeSelfUpdate,
  EmployeeUpdateLog,
  EmployeeWithRelations,
} from "@/lib/types";
import { revalidatePath } from "next/cache";
import { getEmployeeSession } from "@/lib/actions/auth";

const PHOTO_BUCKET = "employee-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

function buildChanges(
  before: EmployeeWithRelations,
  data: EmployeeSelfUpdate
): Record<string, { from: string | null; to: string | null }> {
  const changes: Record<string, { from: string | null; to: string | null }> = {};

  const track = (field: string, from: string | null | undefined, to: string | null | undefined) => {
    const fromVal = from ?? null;
    const toVal = to ?? null;
    if (fromVal !== toVal) {
      changes[field] = { from: fromVal, to: toVal };
    }
  };

  if (data.first_name !== undefined) track("first_name", before.first_name, data.first_name.trim());
  if (data.last_name !== undefined) track("last_name", before.last_name, data.last_name.trim());
  if (data.middle_name !== undefined) track("middle_name", before.middle_name, data.middle_name.trim() || null);
  if (data.phone !== undefined) track("phone", before.phone, data.phone || null);
  if (data.address !== undefined) track("address", before.address, data.address || null);
  if (data.notes !== undefined) track("notes", before.notes, data.notes || null);
  if (data.specialization_id !== undefined) {
    track("specialization_id", before.specialization_id, data.specialization_id || null);
  }
  if (data.region_id !== undefined) track("region_id", before.region_id, data.region_id || null);
  if (data.photo_url !== undefined) track("photo_url", before.photo_url, data.photo_url || null);

  return changes;
}

export async function getMyEmployee(): Promise<EmployeeWithRelations | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return data as unknown as EmployeeWithRelations | null;
}

export async function getMyUpdateLogs(limit = 20): Promise<EmployeeUpdateLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employee) return [];

  const { data, error } = await supabase
    .from("employee_update_logs")
    .select("*")
    .eq("employee_id", employee.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as EmployeeUpdateLog[];
}

export async function uploadMyProfilePhoto(formData: FormData): Promise<ActionResult & { url?: string }> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a profile photo." };
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { success: false, error: "Photo must be JPG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { success: false, error: "Photo must be 5MB or smaller." };
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const path = `${session.user.id}/profile.${ext}`;
  const service = createServiceClient();

  const { error: uploadError } = await service.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = service.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { success: true, url: urlData.publicUrl };
}

export async function updateMyEmployee(data: EmployeeSelfUpdate): Promise<ActionResult> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const supabase = await createClient();
  const { user } = session;

  const { data: before, error: fetchError } = await supabase
    .from("employees")
    .select(EMPLOYEE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!before) {
    return { success: false, error: "No employee record linked to your account." };
  }

  const employee = before as unknown as EmployeeWithRelations;

  if (!data.photo_url && !employee.photo_url) {
    return { success: false, error: "Profile photo is required. Please upload your photo." };
  }

  const updatePayload: Record<string, string | number | null> = {
    middle_name: data.middle_name?.trim() || null,
    specialization_id: data.specialization_id || null,
    region_id: data.region_id || null,
    phone: data.phone || null,
    address: data.address || null,
    notes: data.notes || null,
  };

  if (data.first_name?.trim()) updatePayload.first_name = data.first_name.trim();
  if (data.last_name?.trim()) updatePayload.last_name = data.last_name.trim();
  if (data.photo_url) updatePayload.photo_url = data.photo_url;
  if (data.latitude != null) updatePayload.last_latitude = data.latitude;
  if (data.longitude != null) updatePayload.last_longitude = data.longitude;

  const { error } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", employee.id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  const changes = buildChanges(employee, data);
  const changedFields = Object.keys(changes);

  if (changedFields.length > 0 || data.latitude != null) {
    const summaryParts = changedFields.length
      ? changedFields.map((f) => f.replace(/_/g, " ")).join(", ")
      : ["location"];

    const service = createServiceClient();
    await service.from("employee_update_logs").insert({
      employee_id: employee.id,
      user_id: user.id,
      summary: `Updated ${summaryParts}`,
      changes,
      deployment_location: employee.deployment_location,
      status_name: employee.status?.name ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/employees");
  return { success: true };
}

export async function getSpecializationsForEmployee() {
  return getSpecializations();
}

export async function getRegionsForEmployee() {
  return getRegions();
}
