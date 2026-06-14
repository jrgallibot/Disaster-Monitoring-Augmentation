"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole, linkOrCreateEmployeeRecord, syncEmployeeRole, canUseEmployeePortal } from "@/lib/auth/employee-sync";
import {
  canAccessAdminPortal,
  canWriteAdminPortal,
  isAdminRole,
  isEmployeePortalRole,
  isViewerRole,
  type PortalRole,
} from "@/lib/auth/roles";
import { findOrCreateSpecialization } from "@/lib/actions/specializations";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/types";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const role = await getUserRole(data.user.id);
  if (!canAccessAdminPortal(role)) {
    await supabase.auth.signOut();
    return {
      error: isEmployeePortalRole(role)
        ? "This account uses the Employee Portal. Team leaders and employees must sign in there."
        : "This account is not authorized for the Admin Portal.",
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/dashboard");
}

export type AdminPortalAccess = {
  user: User;
  role: PortalRole;
  canWrite: boolean;
};

export async function getAdminPortalAccess(): Promise<AdminPortalAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const role = await getUserRole(user.id);
  if (!canAccessAdminPortal(role)) return null;

  return {
    user,
    role: role as PortalRole,
    canWrite: canWriteAdminPortal(role),
  };
}

/** True when the signed-in user also has a linked employee profile (dual admin + employee). */
export async function hasEmployeePortalShortcut(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return false;

  const role = await getUserRole(user.id);
  return canUseEmployeePortal(user.id, role);
}

export async function employeeLogin(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  await syncEmployeeRole(data.user.id, data.user.email);
  const role = await getUserRole(data.user.id);
  const canUseEmployee = await canUseEmployeePortal(data.user.id, role);

  if (!canUseEmployee) {
    await supabase.auth.signOut();
    if (canAccessAdminPortal(role)) {
      return {
        error: isViewerRole(role)
          ? "This co-admin account has no employee record. Use the Admin Portal, or ask an administrator to link your employee profile."
          : "This administrator account has no employee record. Use the Admin Portal, or register/link your employee profile first.",
      };
    }
    return {
      error: "This account is not registered as an employee. Please register first or contact your administrator.",
    };
  }

  revalidatePath("/employee", "layout");
  redirect("/employee/dashboard");
}

export async function employeeRegister(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const employeeId = (formData.get("employee_id") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!employeeId) {
    return { success: false, error: "Employee ID is required." };
  }
  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const service = createServiceClient();
  const { data: existing, error: lookupError } = await service
    .from("employees")
    .select("id, user_id")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (lookupError) return { success: false, error: lookupError.message };
  if (existing?.user_id) {
    return { success: false, error: "This employee ID is already registered. Please sign in." };
  }

  let specializationId = ((formData.get("specialization_id") as string) || "").trim();
  const newSpecializationName = ((formData.get("new_specialization_name") as string) || "").trim();
  const regionId = (formData.get("region_id") as string) || undefined;

  if (newSpecializationName) {
    const specResult = await findOrCreateSpecialization(newSpecializationName);
    if (!specResult.success) {
      return { success: false, error: specResult.error };
    }
    specializationId = specResult.id;
  }

  if (!specializationId) {
    return { success: false, error: "Please select or enter your specialization." };
  }
  if (!regionId) {
    return { success: false, error: "Please select your home region." };
  }

  const { data: createData, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "employee", employee_id: employeeId },
  });

  if (createError) {
    const message = createError.message.toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      return { success: false, error: "This email is already registered. Please sign in instead." };
    }
    return { success: false, error: createError.message };
  }

  if (!createData.user) {
    return { success: false, error: "Registration failed. Please try again." };
  }

  const linked = await linkOrCreateEmployeeRecord(createData.user.id, email, employeeId, {
    specialization_id: specializationId,
    region_id: regionId,
  });
  if (!linked) {
    return { success: false, error: "Could not create your employee record. Please try again." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return {
      success: false,
      error: "Account created. Please sign in with your email and password.",
    };
  }

  revalidatePath("/employee", "layout");
  redirect("/employee/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}

export async function employeeLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/employee", "layout");
  redirect("/employee/login");
}

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(): Promise<{ user: User }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  const role = await getUserRole(user.id);
  if (!canWriteAdminPortal(role)) {
    throw new Error(
      isViewerRole(role)
        ? "View-only co-admin accounts cannot change records."
        : "You do not have admin permissions."
    );
  }

  return { user };
}

/** For admin pages — allows full admin and view-only co-admin */
export async function requireAdminForPage(): Promise<AdminPortalAccess> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/admin/login");
  }

  const role = await getUserRole(user.id);
  if (!canAccessAdminPortal(role)) {
    if (isEmployeePortalRole(role)) {
      redirect("/employee/dashboard");
    }
    redirect("/admin/login?error=access_denied");
  }

  return {
    user,
    role: role as PortalRole,
    canWrite: canWriteAdminPortal(role),
  };
}

export async function requireAdminPortalRead(): Promise<{ user: User }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be logged in to perform this action.");
  }

  const role = await getUserRole(user.id);
  if (!canAccessAdminPortal(role)) {
    throw new Error("You do not have access to the admin portal.");
  }

  return { user };
}

export async function requireEmployee(): Promise<{ user: User }> {
  const session = await getEmployeeSession();
  if ("error" in session) {
    throw new Error(session.error);
  }
  return { user: session.user };
}

/** Safe check for server actions — never throws */
export async function getEmployeeSession(): Promise<
  { user: User } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to update your account." };
  }

  await syncEmployeeRole(user.id, user.email);
  const role = await getUserRole(user.id);
  const canUseEmployee = await canUseEmployeePortal(user.id, role);

  if (!canUseEmployee) {
    if (canAccessAdminPortal(role)) {
      return {
        error: isViewerRole(role)
          ? "Co-admin accounts without an employee profile use the Admin Portal only."
          : "Administrator accounts without an employee profile use the Admin Portal only.",
      };
    }
    return { error: "Employee access only. Please register with your DSWD Employee ID first." };
  }

  return { user };
}

/** For server pages — redirects instead of throwing runtime errors */
export async function requireEmployeeForPage(): Promise<{ user: User }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/employee/login");
  }

  await syncEmployeeRole(user.id, user.email);
  const role = await getUserRole(user.id);
  const canUseEmployee = await canUseEmployeePortal(user.id, role);

  if (!canUseEmployee) {
    if (canAccessAdminPortal(role)) {
      redirect("/admin/dashboard");
    }
    redirect("/employee/login?error=not_employee");
  }

  return { user };
}

export async function getEmployeePortalRole(
  employeeId: string
): Promise<"employee" | "admin" | "team_leader" | null> {
  await requireAdmin();
  const service = createServiceClient();

  const { data: employee, error } = await service
    .from("employees")
    .select("user_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !employee?.user_id) return null;

  const role = await getUserRole(employee.user_id);
  if (role === "admin" || role === "employee" || role === "team_leader") {
    return role;
  }
  return "employee";
}

async function syncTeamLeaderRegionLink(
  employeeId: string,
  role: "employee" | "admin" | "team_leader",
  regionId: string | null
): Promise<void> {
  const service = createServiceClient();

  if (role === "team_leader" && regionId) {
    await service.from("library_region_team_leaders").upsert(
      { region_id: regionId, employee_id: employeeId },
      { onConflict: "region_id,employee_id" }
    );
    return;
  }

  await service
    .from("library_region_team_leaders")
    .delete()
    .eq("employee_id", employeeId);
}

export async function updateEmployeePortalRole(
  employeeId: string,
  portalRole: "employee" | "admin" | "team_leader"
): Promise<ActionResult> {
  try {
    const { user: adminUser } = await requireAdmin();
    const service = createServiceClient();

    const { data: employee, error: employeeError } = await service
      .from("employees")
      .select("id, user_id, region_id, email")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) return { success: false, error: employeeError.message };
    if (!employee?.user_id) {
      return {
        success: false,
        error: "This employee has no portal account yet. They must register first.",
      };
    }

    if (portalRole !== "admin" && employee.user_id === adminUser.id) {
      return {
        success: false,
        error: "You cannot remove your own administrator access.",
      };
    }

    if (portalRole !== "admin") {
      const { count } = await service
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .neq("id", employee.user_id);

      const { data: currentProfile } = await service
        .from("profiles")
        .select("role")
        .eq("id", employee.user_id)
        .maybeSingle();

      if (currentProfile?.role === "admin" && (count ?? 0) === 0) {
        return {
          success: false,
          error: "Cannot change role. This is the only administrator account.",
        };
      }
    }

    const { error: profileError } = await service.from("profiles").upsert({
      id: employee.user_id,
      email: employee.email ?? "",
      role: portalRole,
    });

    if (profileError) return { success: false, error: profileError.message };

    await syncTeamLeaderRegionLink(employeeId, portalRole, employee.region_id);

    revalidatePath("/admin/employees");
    revalidatePath(`/admin/employees/${employeeId}/edit`);
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/libraries");
    revalidatePath("/employee", "layout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update portal role.",
    };
  }
}
