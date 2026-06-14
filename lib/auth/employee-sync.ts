import { createServiceClient } from "@/lib/supabase/service";
import {
  canAccessAdminPortal,
  isEmployeePortalRole,
} from "@/lib/auth/roles";

export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return data?.role ?? null;
  } catch {
    return null;
  }
}

type EmployeeLinkOptions = {
  specialization_id?: string;
  region_id?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
};

/** Link or create an employee record for a registered auth user */
export async function linkOrCreateEmployeeRecord(
  userId: string,
  email: string,
  employeeId: string,
  options: EmployeeLinkOptions = {}
): Promise<boolean> {
  try {
    const service = createServiceClient();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedEmployeeId = employeeId.trim();

    const { data: existing } = await service
      .from("employees")
      .select("id, user_id")
      .eq("employee_id", normalizedEmployeeId)
      .maybeSingle();

    if (existing?.user_id && existing.user_id !== userId) {
      return false;
    }

    if (existing) {
      await service
        .from("employees")
        .update({
          user_id: userId,
          email: normalizedEmail,
          specialization_id: options.specialization_id || null,
          region_id: options.region_id || null,
          ...(options.first_name ? { first_name: options.first_name } : {}),
          ...(options.last_name ? { last_name: options.last_name } : {}),
          ...(options.middle_name !== undefined
            ? { middle_name: options.middle_name || null }
            : {}),
        })
        .eq("id", existing.id);
    } else {
      const emailLocal = normalizedEmail.split("@")[0] || "employee";
      const namePart = emailLocal.replace(/[._-]/g, " ");
      const parts = namePart.split(" ").filter(Boolean);
      const firstName = options.first_name || parts[0] || "Employee";
      const lastName = options.last_name || parts.slice(1).join(" ") || "User";

      const { error: insertError } = await service.from("employees").insert({
        employee_id: normalizedEmployeeId,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        middle_name: options.middle_name || null,
        specialization_id: options.specialization_id || null,
        region_id: options.region_id || null,
        user_id: userId,
      });

      if (insertError) return false;
    }

    await service.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      role: "employee",
    });

    return true;
  } catch {
    return false;
  }
}

/** Link employee record by user_id or email, then set profile role to employee */
export async function syncEmployeeRole(
  userId: string,
  email?: string | null
): Promise<boolean> {
  try {
    const service = createServiceClient();

    let { data: employee } = await service
      .from("employees")
      .select("id, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (!employee && email) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: byEmail } = await service
        .from("employees")
        .select("id, email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (byEmail) {
        await service.from("employees").update({ user_id: userId }).eq("id", byEmail.id);
        employee = byEmail;
      }
    }

    if (!employee) {
      const { data: authUser } = await service.auth.admin.getUserById(userId);
      const employeeId = authUser?.user?.user_metadata?.employee_id as string | undefined;
      if (employeeId && email) {
        return linkOrCreateEmployeeRecord(userId, email, employeeId);
      }
    }

    if (employee) {
      const currentRole = await getUserRole(userId);
      const preserveRole =
        currentRole === "admin" ||
        currentRole === "viewer" ||
        currentRole === "team_leader";
      const role = preserveRole && currentRole ? currentRole : "employee";

      await service.from("profiles").upsert({
        id: userId,
        email: email ?? employee.email ?? "",
        role,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** True when auth user has a row in employees linked by user_id */
export async function userHasEmployeeRecord(userId: string): Promise<boolean> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/** Employee portal access: employees, team leaders, or elevated roles with a linked employee record */
export async function canUseEmployeePortal(
  userId: string,
  role: string | null | undefined
): Promise<boolean> {
  if (isEmployeePortalRole(role)) return true;
  if (canAccessAdminPortal(role)) {
    return userHasEmployeeRecord(userId);
  }
  return false;
}
