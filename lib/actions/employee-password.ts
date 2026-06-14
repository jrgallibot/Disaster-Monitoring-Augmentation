"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/actions/auth";
import { encryptPortalPassword, decryptPortalPassword } from "@/lib/password-vault";
import { generatePortalPassword, MIN_PORTAL_PASSWORD_LENGTH } from "@/lib/password";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEmployeeSession } from "@/lib/actions/auth";

function validatePortalPassword(password: string): ActionResult | null {
  if (!password.trim()) {
    return { success: false, error: "Password is required." };
  }
  if (password.length < MIN_PORTAL_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PORTAL_PASSWORD_LENGTH} characters.`,
    };
  }
  return null;
}

async function resolveAdminEmail(userId: string, sessionEmail?: string | null): Promise<string | null> {
  const service = createServiceClient();

  const { data: authData, error: authError } = await service.auth.admin.getUserById(userId);
  if (!authError && authData.user?.email) {
    return authData.user.email.trim().toLowerCase();
  }

  const { data: profile } = await service
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const email = profile?.email ?? sessionEmail;
  return email ? email.trim().toLowerCase() : null;
}

export async function getAdminAccountEmail(): Promise<
  { success: true; email: string } | { success: false; error: string }
> {
  try {
    const { user } = await requireAdmin();
    const email = await resolveAdminEmail(user.id, user.email);
    if (!email) {
      return { success: false, error: "Your admin account has no email on file." };
    }
    return { success: true, email };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load admin account.",
    };
  }
}

async function verifyAdminPassword(adminPassword: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const email = await resolveAdminEmail(user.id, user.email);

  if (!email) {
    return { success: false, error: "Your admin account has no email on file." };
  }

  const password = adminPassword.trim();
  if (!password) {
    return { success: false, error: "Enter your admin password." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { success: false, error: "Authentication is not configured." };
  }

  const verifier = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await verifier.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      success: false,
      error: `Incorrect password for ${email}. Use the password for your currently signed-in admin account.`,
    };
  }

  return { success: true };
}

async function getEmployeeAuthTarget(employeeId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("employees")
    .select("id, user_id, email, employee_id, first_name, last_name, middle_name")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (!data.user_id) return null;
  return data;
}

export async function getEmployeePortalPasswordStatus(employeeId: string): Promise<{
  hasPortalAccount: boolean;
  hasVaultRecord: boolean;
}> {
  try {
    const employee = await getEmployeeAuthTarget(employeeId);
    if (!employee) {
      return { hasPortalAccount: false, hasVaultRecord: false };
    }

    const service = createServiceClient();
    const { data } = await service
      .from("employee_portal_passwords")
      .select("employee_id")
      .eq("employee_id", employeeId)
      .maybeSingle();

    return {
      hasPortalAccount: true,
      hasVaultRecord: Boolean(data?.employee_id),
    };
  } catch {
    return { hasPortalAccount: false, hasVaultRecord: false };
  }
}

export async function setEmployeePortalPassword(
  employeeId: string,
  newPassword: string
): Promise<ActionResult & { password?: string; email?: string }> {
  try {
    const { user } = await requireAdmin();
    const passwordError = validatePortalPassword(newPassword);
    if (passwordError) return passwordError;

    const employee = await getEmployeeAuthTarget(employeeId);
    if (!employee) {
      return {
        success: false,
        error: "This employee has no linked portal account.",
      };
    }

    const service = createServiceClient();
    const { error: updateError } = await service.auth.admin.updateUserById(
      employee.user_id!,
      { password: newPassword }
    );

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await storeEmployeePortalPassword(employeeId, newPassword, user.id);

    revalidatePath("/admin/employees");
    return {
      success: true,
      password: newPassword,
      email: employee.email ?? undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to set password.",
    };
  }
}

export async function changeMyPortalPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ActionResult> {
  try {
    const session = await getEmployeeSession();
    if ("error" in session) {
      return { success: false, error: session.error };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "New passwords do not match." };
    }

    const passwordError = validatePortalPassword(newPassword);
    if (passwordError) return passwordError;

    const email = session.user.email?.trim().toLowerCase();
    if (!email) {
      return { success: false, error: "Your account has no email on file." };
    }

    const verify = await verifyEmployeePortalPassword(email, currentPassword.trim());
    if (!verify.success) {
      return { success: false, error: "Current password is incorrect." };
    }

    const supabase = await createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    try {
      await storePortalPasswordForAuthUser(session.user.id, newPassword, session.user.id);
    } catch {
      // Auth password updated; vault sync is best-effort
    }

    revalidatePath("/employee/change-password");
    revalidatePath("/employee/dashboard");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to change password.",
    };
  }
}

export async function storeEmployeePortalPassword(
  employeeId: string,
  password: string,
  updatedBy: string
): Promise<void> {
  const service = createServiceClient();
  const encrypted_password = encryptPortalPassword(password);

  const { error } = await service.from("employee_portal_passwords").upsert(
    {
      employee_id: employeeId,
      encrypted_password,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "employee_id" }
  );

  if (error) {
    if (error.message.includes("employee_portal_passwords")) {
      throw new Error(
        "Password vault table not found. Run migration 021 in Supabase SQL Editor."
      );
    }
    throw new Error(error.message);
  }
}

export async function storePortalPasswordForAuthUser(
  authUserId: string,
  password: string,
  updatedBy: string
): Promise<void> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("employees")
    .select("id")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Employee record not found for portal account.");

  await storeEmployeePortalPassword(data.id, password, updatedBy);
}

async function verifyEmployeePortalPassword(
  email: string,
  password: string
): Promise<ActionResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { success: false, error: "Authentication is not configured." };
  }

  const verifier = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await verifier.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return {
      success: false,
      error: "The employee portal password you entered is incorrect.",
    };
  }

  return { success: true };
}

export async function syncEmployeePortalPasswordToVault(
  employeeId: string,
  employeePassword: string,
  adminPassword: string
): Promise<ActionResult & { password?: string; email?: string }> {
  try {
    const { user } = await requireAdmin();

    const adminVerify = await verifyAdminPassword(adminPassword);
    if (!adminVerify.success) {
      return adminVerify;
    }

    const employee = await getEmployeeAuthTarget(employeeId);
    if (!employee) {
      return {
        success: false,
        error: "This employee has no linked portal account.",
      };
    }

    if (!employee.email) {
      return {
        success: false,
        error: "This employee has no email on file for portal verification.",
      };
    }

    const trimmedEmployeePassword = employeePassword.trim();
    if (!trimmedEmployeePassword) {
      return { success: false, error: "Enter the employee's current portal password." };
    }

    const employeeVerify = await verifyEmployeePortalPassword(
      employee.email,
      trimmedEmployeePassword
    );
    if (!employeeVerify.success) {
      return employeeVerify;
    }

    await storeEmployeePortalPassword(employeeId, trimmedEmployeePassword, user.id);

    return {
      success: true,
      password: trimmedEmployeePassword,
      email: employee.email,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save password to vault.",
    };
  }
}

export async function resetEmployeePortalPassword(
  employeeId: string
): Promise<ActionResult & { password?: string; email?: string }> {
  try {
    const { user } = await requireAdmin();
    const employee = await getEmployeeAuthTarget(employeeId);

    if (!employee) {
      return {
        success: false,
        error: "This employee has no linked portal account to reset.",
      };
    }

    const password = generatePortalPassword();
    const service = createServiceClient();
    const { error: updateError } = await service.auth.admin.updateUserById(
      employee.user_id!,
      { password }
    );

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await storeEmployeePortalPassword(employeeId, password, user.id);

    revalidatePath("/admin/employees");
    return {
      success: true,
      password,
      email: employee.email ?? undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reset password.",
    };
  }
}

export async function revealEmployeePortalPassword(
  employeeId: string,
  adminPassword: string
): Promise<ActionResult & { password?: string; email?: string }> {
  try {
    await requireAdmin();

    const verify = await verifyAdminPassword(adminPassword);
    if (!verify.success) {
      return verify;
    }

    const employee = await getEmployeeAuthTarget(employeeId);
    if (!employee) {
      return {
        success: false,
        error: "This employee has no linked portal account.",
      };
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("employee_portal_passwords")
      .select("encrypted_password")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (error) {
      if (error.message.includes("employee_portal_passwords")) {
        return {
          success: false,
          error: "Password vault table not found. Run migration 021 in Supabase SQL Editor.",
        };
      }
      return { success: false, error: error.message };
    }

    if (!data?.encrypted_password) {
      return {
        success: false,
        error: "NEEDS_VAULT_SYNC",
      };
    }

    let password: string;
    try {
      password = decryptPortalPassword(data.encrypted_password);
    } catch {
      return {
        success: false,
        error:
          "Stored password could not be decrypted. Use Reset Password to generate a new one.",
      };
    }

    return {
      success: true,
      password,
      email: employee.email ?? undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reveal password.",
    };
  }
}
