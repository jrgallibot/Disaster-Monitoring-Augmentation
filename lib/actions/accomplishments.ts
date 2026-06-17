"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingTableError } from "@/lib/supabase/errors";
import { getEmployeeSession } from "@/lib/actions/auth";
import { getUserRole } from "@/lib/auth/employee-sync";
import { getLedRegionIds, getTeamMemberIdsForLeader } from "@/lib/auth/team-leader";
import { isTeamLeaderRole } from "@/lib/auth/roles";
import type { ActionResult, EmployeeAccomplishment } from "@/lib/types";
import {
  accomplishmentTimestampFromDateKey,
  accomplishmentTimestampWithDateKey,
  getManilaDateKey,
} from "@/lib/report/date-bounds";
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
  longitude: number | null,
  createdAt: string
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
    created_at: createdAt,
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

async function assertOwnAccomplishment(
  userId: string,
  accomplishmentId: string
): Promise<
  | { ok: true; employeeId: string; record: EmployeeAccomplishment; isTeamLeader: boolean }
  | { ok: false; error: string }
> {
  const employeeId = await getEmployeeIdForUser(userId);
  if (!employeeId) {
    return { ok: false, error: "No employee record linked to your account." };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("employee_accomplishments")
    .select("*")
    .eq("id", accomplishmentId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Accomplishment not found." };
  }

  const record = data as EmployeeAccomplishment;
  if (record.employee_id !== employeeId) {
    return { ok: false, error: "You can only edit your own accomplishments." };
  }
  if (record.shared_by_team_leader_id) {
    return {
      ok: false,
      error: "Accomplishments shared by your team leader cannot be edited here.",
    };
  }

  const isLeader = await isTeamLeaderEmployee(employeeId, userId);
  return { ok: true, employeeId, record, isTeamLeader: isLeader };
}

async function updateMemberCopiesFromSource(
  sourceAccomplishmentId: string,
  content: string,
  createdAt: string
): Promise<void> {
  const service = createServiceClient();
  const { error } = await service
    .from("employee_accomplishments")
    .update({ content, created_at: createdAt })
    .eq("source_accomplishment_id", sourceAccomplishmentId);

  if (error && !isMissingColumnError(error)) {
    throw new Error(error.message);
  }
}

async function deleteMemberCopiesFromSource(sourceAccomplishmentId: string): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("employee_accomplishments")
    .delete()
    .eq("source_accomplishment_id", sourceAccomplishmentId)
    .select("id");

  if (error) {
    if (isMissingColumnError(error)) return 0;
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

function revalidateAccomplishmentPaths() {
  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/team");
  revalidatePath("/employee/daily-report");
  revalidatePath("/admin/employees");
}

function validateAccomplishmentContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return "Please enter your accomplishment or activity update.";
  }
  if (trimmed.length < 10) {
    return "Accomplishment must be at least 10 characters.";
  }
  return null;
}

function resolveAccomplishmentDateKey(dateKeyInput?: string | null): string | null {
  if (!dateKeyInput?.trim()) return null;
  const todayKey = getManilaDateKey();
  if (dateKeyInput > todayKey) {
    return "Accomplishment date cannot be in the future.";
  }
  return null;
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
  longitude?: number,
  accomplishmentDateKey?: string
): Promise<ActionResult> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const validationError = validateAccomplishmentContent(content);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const dateError = resolveAccomplishmentDateKey(accomplishmentDateKey);
  if (dateError) {
    return { success: false, error: dateError };
  }

  const trimmed = content.trim();
  const createdAt = accomplishmentTimestampFromDateKey(accomplishmentDateKey);

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
      created_at: createdAt,
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
        longitude ?? null,
        createdAt
      );
    } catch {
      // Leader record saved; sharing failure should not block submission.
    }
  }

  revalidateAccomplishmentPaths();
  return { success: true, sharedCount };
}

export async function updateMyAccomplishment(
  accomplishmentId: string,
  content: string,
  accomplishmentDateKey?: string
): Promise<ActionResult & { memberUpdateCount?: number }> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const validationError = validateAccomplishmentContent(content);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const dateError = resolveAccomplishmentDateKey(accomplishmentDateKey);
  if (dateError) {
    return { success: false, error: dateError };
  }

  const access = await assertOwnAccomplishment(session.user.id, accomplishmentId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const trimmed = content.trim();
  const createdAt = accomplishmentDateKey
    ? accomplishmentTimestampWithDateKey(accomplishmentDateKey, access.record.created_at)
    : access.record.created_at;

  const service = createServiceClient();
  const { error } = await service
    .from("employee_accomplishments")
    .update({ content: trimmed, created_at: createdAt })
    .eq("id", accomplishmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  let memberUpdateCount = 0;
  if (access.isTeamLeader) {
    try {
      await updateMemberCopiesFromSource(accomplishmentId, trimmed, createdAt);
      const { count } = await service
        .from("employee_accomplishments")
        .select("id", { count: "exact", head: true })
        .eq("source_accomplishment_id", accomplishmentId);
      memberUpdateCount = count ?? 0;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update team member copies.",
      };
    }
  }

  revalidateAccomplishmentPaths();
  return { success: true, memberUpdateCount };
}

export async function deleteMyAccomplishment(
  accomplishmentId: string
): Promise<ActionResult & { memberDeleteCount?: number }> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    return { success: false, error: session.error };
  }

  const access = await assertOwnAccomplishment(session.user.id, accomplishmentId);
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  let memberDeleteCount = 0;
  if (access.isTeamLeader) {
    try {
      memberDeleteCount = await deleteMemberCopiesFromSource(accomplishmentId);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to remove team member copies.",
      };
    }
  }

  const service = createServiceClient();
  const { error } = await service
    .from("employee_accomplishments")
    .delete()
    .eq("id", accomplishmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateAccomplishmentPaths();
  return { success: true, memberDeleteCount };
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
