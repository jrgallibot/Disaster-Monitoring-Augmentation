"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole, linkOrCreateEmployeeRecord, syncEmployeeRole } from "@/lib/auth/employee-sync";
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
  if (role !== "admin") {
    await supabase.auth.signOut();
    return { error: "This account is not an administrator. Use the Employee Portal to sign in." };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/dashboard");
}

export async function employeeLogin(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  await syncEmployeeRole(data.user.id, data.user.email);
  const role = await getUserRole(data.user.id);

  if (role === "admin") {
    await supabase.auth.signOut();
    return { error: "You are signed in as an administrator. Please use the Admin Portal." };
  }
  if (role !== "employee") {
    await supabase.auth.signOut();
    return { error: "This account is not registered as an employee. Please register first or contact your administrator." };
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

  const specializationId = (formData.get("specialization_id") as string) || undefined;
  const regionId = (formData.get("region_id") as string) || undefined;

  if (!specializationId) {
    return { success: false, error: "Please select your specialization." };
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
  if (role !== "admin") {
    throw new Error("You do not have admin permissions.");
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

  if (role === "admin") {
    return { error: "You are logged in as an administrator. Use the Admin Portal instead." };
  }
  if (role !== "employee") {
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

  if (role === "admin") {
    redirect("/admin/dashboard");
  }
  if (role !== "employee") {
    redirect("/employee/login?error=not_employee");
  }

  return { user };
}
