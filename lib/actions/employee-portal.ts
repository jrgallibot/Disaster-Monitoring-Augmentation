"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRegions, getSpecializations } from "@/lib/actions/employees";
import { querySingleEmployeeRow } from "@/lib/supabase/employee-query";
import {
  getAutoAssignedTeamLeaderId,
  getRegionTeamLeaderSummaries,
} from "@/lib/utils";
import type {
  ActionResult,
  EmployeeDeploymentLog,
  EmployeeSelfUpdate,
  EmployeeUpdateLog,
  EmployeeWithRelations,
} from "@/lib/types";
import { revalidatePath } from "next/cache";
import { getEmployeeSession } from "@/lib/actions/auth";
import { getFormDataPhotoFile } from "@/lib/photo-upload";
import { uploadToEmployeePhotoBucket } from "@/lib/actions/photo-storage";
import { canManageEmployee } from "@/lib/auth/team-leader";
import {
  getStatusById,
  statusRequiresDeploymentLocation,
  statusRequiresDeploymentRemarks,
  validateDeploymentFields,
} from "@/lib/deployment";
import { getYesterdayReportBounds } from "@/lib/deployment-yesterday";
import { accomplishmentTimestampFromDateKey } from "@/lib/report/date-bounds";
import { getStatuses } from "@/lib/actions/employees";

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
  if (data.sex !== undefined) track("sex", before.sex, data.sex || null);
  if (data.phone !== undefined) track("phone", before.phone, data.phone || null);
  if (data.address !== undefined) track("address", before.address, data.address || null);
  if (data.notes !== undefined) track("notes", before.notes, data.notes || null);
  if (data.specialization_id !== undefined) {
    track("specialization_id", before.specialization_id, data.specialization_id || null);
  }
  if (data.region_id !== undefined) track("region_id", before.region_id, data.region_id || null);
  if (data.assigned_team_leader_id !== undefined) {
    track(
      "assigned_team_leader_id",
      before.assigned_team_leader_id,
      data.assigned_team_leader_id || null
    );
  }
  if (data.photo_url !== undefined) track("photo_url", before.photo_url, data.photo_url || null);

  return changes;
}

export async function getMyEmployee(): Promise<EmployeeWithRelations | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const employee = await querySingleEmployeeRow(supabase, (select) =>
    supabase.from("employees").select(select).eq("user_id", user.id).maybeSingle()
  );

  if (!employee) return null;
  const autoLeaderId = getAutoAssignedTeamLeaderId(employee.region);

  if (!employee.assigned_team_leader_id && autoLeaderId && autoLeaderId !== employee.id) {
    const service = createServiceClient();
    await service
      .from("employees")
      .update({ assigned_team_leader_id: autoLeaderId })
      .eq("id", employee.id);

    const autoLeader = getRegionTeamLeaderSummaries(employee.region).find(
      (leader) => leader.id === autoLeaderId
    );

    return {
      ...employee,
      assigned_team_leader_id: autoLeaderId,
      assigned_team_leader: autoLeader ?? employee.assigned_team_leader ?? null,
    };
  }

  return employee;
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

export async function getMyDeploymentLogs(limit = 50): Promise<EmployeeDeploymentLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employee) return [];

  const service = createServiceClient();
  const { data, error } = await service
    .from("employee_deployment_logs")
    .select("*")
    .eq("employee_id", employee.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as EmployeeDeploymentLog[];
}

export async function uploadMyProfilePhoto(formData: FormData): Promise<ActionResult & { url?: string }> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const file = getFormDataPhotoFile(formData);
  if (!file) {
    return { success: false, error: "Please select a profile photo to upload." };
  }
  return uploadToEmployeePhotoBucket(session.user.id, file, "profile", { upsert: true });
}

export async function updateMyEmployee(data: EmployeeSelfUpdate): Promise<ActionResult> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const supabase = await createClient();
  const { user } = session;

  const employee = await querySingleEmployeeRow(supabase, (select) =>
    supabase.from("employees").select(select).eq("user_id", user.id).maybeSingle()
  );

  if (!employee) {
    return { success: false, error: "No employee record linked to your account." };
  }
  const nextRegionId = data.region_id ?? employee.region_id;
  const nextRegion =
    data.region_id !== undefined
      ? (await getRegions()).find((region) => region.id === nextRegionId) ?? employee.region
      : employee.region;

  const regionLeaders = getRegionTeamLeaderSummaries(nextRegion);
  let nextAssignedLeaderId = data.assigned_team_leader_id ?? employee.assigned_team_leader_id;

  if (data.region_id !== undefined && data.region_id !== employee.region_id) {
    nextAssignedLeaderId = getAutoAssignedTeamLeaderId(nextRegion);
  } else if (!nextAssignedLeaderId) {
    nextAssignedLeaderId = getAutoAssignedTeamLeaderId(nextRegion);
  }

  if (regionLeaders.length > 1) {
    if (data.assigned_team_leader_id) {
      const isValid = regionLeaders.some((leader) => leader.id === data.assigned_team_leader_id);
      if (!isValid) {
        return { success: false, error: "Please select a valid team leader for your region." };
      }
      nextAssignedLeaderId = data.assigned_team_leader_id;
    } else if (!employee.assigned_team_leader_id) {
      return {
        success: false,
        error: "Please select your team leader. Your region has more than one team leader.",
      };
    }
  } else if (regionLeaders.length === 1) {
    nextAssignedLeaderId = regionLeaders[0].id;
  } else {
    nextAssignedLeaderId = null;
  }

  if (!data.photo_url && !employee.photo_url) {
    return { success: false, error: "Profile photo is required. Please upload your photo." };
  }

  const updatePayload: Record<string, string | number | null> = {
    middle_name: data.middle_name?.trim() || null,
    specialization_id: data.specialization_id || null,
    region_id: data.region_id || null,
    assigned_team_leader_id: nextAssignedLeaderId,
    phone: data.phone || null,
    address: data.address || null,
    notes: data.notes || null,
  };

  if (data.first_name?.trim()) updatePayload.first_name = data.first_name.trim();
  if (data.last_name?.trim()) updatePayload.last_name = data.last_name.trim();
  if (data.sex !== undefined) updatePayload.sex = data.sex || null;
  if (data.photo_url) updatePayload.photo_url = data.photo_url;
  if (data.latitude != null) updatePayload.last_latitude = data.latitude;
  if (data.longitude != null) updatePayload.last_longitude = data.longitude;

  const { error } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", employee.id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  const changes = buildChanges(
    employee,
    {
      ...data,
      assigned_team_leader_id: nextAssignedLeaderId ?? undefined,
      region_id: nextRegionId ?? undefined,
    }
  );
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

export async function updateDeploymentLogActualTask(
  logId: string,
  actualTask: string
): Promise<ActionResult> {
  const trimmed = actualTask.trim();
  if (!trimmed) {
    return { success: false, error: "Actual task is required." };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const service = createServiceClient();
  const { data: log, error: logError } = await service
    .from("employee_deployment_logs")
    .select("id, employee_id, status_name, actual_task")
    .eq("id", logId)
    .single();

  if (logError || !log) {
    return { success: false, error: "Deployment log not found." };
  }

  if (!statusRequiresDeploymentLocation(log.status_name)) {
    return { success: false, error: "Actual task can only be edited for Deployed entries." };
  }

  const access = await canManageEmployee(user.id, log.employee_id);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  if (trimmed === (log.actual_task?.trim() ?? "")) {
    return { success: true };
  }

  const { error: updateError } = await service
    .from("employee_deployment_logs")
    .update({ actual_task: trimmed })
    .eq("id", logId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { data: latestLog } = await service
    .from("employee_deployment_logs")
    .select("id")
    .eq("employee_id", log.employee_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestLog?.id === logId) {
    await service.from("employees").update({ actual_task: trimmed }).eq("id", log.employee_id);
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/team");
  return { success: true };
}

export async function saveMyYesterdayDeployment(
  statusId: string,
  deploymentLocation?: string,
  actualTask?: string,
  deploymentRemarks?: string,
  logId?: string
): Promise<ActionResult> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { data: employee } = await authClient
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employee) {
    return { success: false, error: "Employee record not found." };
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
  const nextLocation = isDeployed ? deploymentLocation?.trim() || null : null;
  const nextActualTask = isDeployed ? actualTask?.trim() || null : null;
  const nextRemarks = statusRequiresDeploymentRemarks(status.name)
    ? deploymentRemarks?.trim() || null
    : null;

  const service = createServiceClient();
  const { start, end } = getYesterdayReportBounds();

  if (logId) {
    const { data: log, error: logError } = await service
      .from("employee_deployment_logs")
      .select("id, employee_id, created_at")
      .eq("id", logId)
      .single();

    if (logError || !log) {
      return { success: false, error: "Deployment log not found." };
    }

    if (log.employee_id !== employee.id) {
      return { success: false, error: "You can only update your own deployment records." };
    }

    const createdAt = new Date(log.created_at);
    if (createdAt < new Date(start) || createdAt >= new Date(end)) {
      return { success: false, error: "Only yesterday's deployment record can be updated here." };
    }

    const { error: updateError } = await service
      .from("employee_deployment_logs")
      .update({
        status_id: statusId,
        status_name: status.name,
        deployment_location: nextLocation,
        actual_task: nextActualTask,
        deployment_remarks: nextRemarks,
      })
      .eq("id", logId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    const { data: existing } = await service
      .from("employee_deployment_logs")
      .select("id")
      .eq("employee_id", employee.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: "Yesterday's deployment is already recorded. Use Edit to update it.",
      };
    }

    const { error: insertError } = await service.from("employee_deployment_logs").insert({
      employee_id: employee.id,
      user_id: user.id,
      status_id: statusId,
      status_name: status.name,
      deployment_location: nextLocation,
      actual_task: nextActualTask,
      deployment_remarks: nextRemarks,
      created_at: accomplishmentTimestampFromDateKey(getYesterdayReportBounds().dateKey),
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/team");
  revalidatePath("/employee/daily-report");
  return { success: true };
}

export async function getSpecializationsForEmployee() {
  return getSpecializations();
}

export async function getRegionsForEmployee() {
  return getRegions();
}
