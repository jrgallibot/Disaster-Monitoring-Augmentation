"use server";

import { requireAdminPortalRead } from "@/lib/actions/auth";
import {
  deploymentLogToAuditEntry,
  employeeDisplayName,
  mobilizationLogToAuditEntry,
  profileLogToAuditEntry,
} from "@/lib/audit-trail";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AuditTrailData,
  AuditTrailEntry,
  AuditTrailFilters,
  EmployeeDeploymentLog,
  EmployeeMobilizationLog,
  EmployeeUpdateLog,
  EmployeeWithRelations,
  Profile,
} from "@/lib/types";
import { getFullName } from "@/lib/utils";

function resolveActorLabel(
  userId: string | null | undefined,
  employeeByUserId: Map<string, EmployeeWithRelations>,
  profileById: Map<string, Profile>
): string {
  if (!userId) return "System";

  const actorEmployee = employeeByUserId.get(userId);
  if (actorEmployee) {
    return `${employeeDisplayName(actorEmployee)} (${actorEmployee.employee_id})`;
  }

  const profile = profileById.get(userId);
  if (profile) {
    return profile.full_name?.trim() || profile.email || "Portal user";
  }

  return "Unknown user";
}

export async function getEmployeeAuditTrail(
  filters: AuditTrailFilters = {}
): Promise<AuditTrailData> {
  await requireAdminPortalRead();

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300);
  const category = filters.category ?? "all";
  const employeeId = filters.employeeId ?? null;
  const perSourceLimit = category === "all" ? limit : limit;

  const service = createServiceClient();

  const employeeQuery = service
    .from("employees")
    .select("id, employee_id, first_name, last_name, middle_name, user_id");
  const { data: employeeRows } = await employeeQuery;

  const employees = (employeeRows ?? []) as Pick<
    EmployeeWithRelations,
    "id" | "employee_id" | "first_name" | "last_name" | "middle_name" | "user_id"
  >[];
  const employeeById = new Map(employees.map((row) => [row.id, row as EmployeeWithRelations]));
  const employeeByUserId = new Map(
    employees
      .filter((row) => row.user_id)
      .map((row) => [row.user_id as string, row as EmployeeWithRelations])
  );

  const profileQuery = service.from("profiles").select("id, email, full_name, role, created_at");
  const { data: profileRows } = await profileQuery;
  const profileById = new Map((profileRows ?? []).map((row) => [row.id, row as Profile]));

  const entries: AuditTrailEntry[] = [];

  if (category === "all" || category === "profile") {
    let query = service
      .from("employee_update_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(perSourceLimit);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data } = await query;
    for (const log of (data ?? []) as EmployeeUpdateLog[]) {
      entries.push(
        profileLogToAuditEntry(
          log,
          employeeById.get(log.employee_id),
          resolveActorLabel(log.user_id, employeeByUserId, profileById)
        )
      );
    }
  }

  if (category === "all" || category === "deployment") {
    let query = service
      .from("employee_deployment_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(perSourceLimit);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data } = await query;
    for (const log of (data ?? []) as EmployeeDeploymentLog[]) {
      entries.push(
        deploymentLogToAuditEntry(
          log,
          employeeById.get(log.employee_id),
          resolveActorLabel(log.user_id, employeeByUserId, profileById)
        )
      );
    }
  }

  if (category === "all" || category === "mobilization") {
    let query = service
      .from("employee_mobilization_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(perSourceLimit);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data } = await query;
    for (const log of (data ?? []) as EmployeeMobilizationLog[]) {
      entries.push(
        mobilizationLogToAuditEntry(
          log,
          employeeById.get(log.employee_id),
          resolveActorLabel(log.user_id, employeeByUserId, profileById)
        )
      );
    }
  }

  entries.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    entries: entries.slice(0, limit),
    generatedAt: new Date().toISOString(),
    totalShown: Math.min(entries.length, limit),
  };
}

export async function getEmployeeAuditTrailFilterOptions() {
  await requireAdminPortalRead();
  const service = createServiceClient();
  const { data } = await service
    .from("employees")
    .select("id, employee_id, first_name, last_name, middle_name")
    .order("last_name");

  return (data ?? []).map((row) => ({
    id: row.id as string,
    employee_id: row.employee_id as string,
    name: getFullName(row.first_name, row.last_name, row.middle_name),
  }));
}
