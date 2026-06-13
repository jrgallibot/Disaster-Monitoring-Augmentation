import { createServiceClient } from "@/lib/supabase/service";
import { getUserRole } from "@/lib/auth/employee-sync";

export async function getEmployeeRecordByUserId(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, region_id, user_id, employee_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getLedRegionIds(employeeId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("library_regions")
    .select("id")
    .eq("team_leader_employee_id", employeeId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

export async function isTeamLeaderUser(userId: string): Promise<boolean> {
  const record = await getEmployeeRecordByUserId(userId);
  if (!record) return false;
  const regionIds = await getLedRegionIds(record.id);
  return regionIds.length > 0;
}

export async function canManageEmployee(
  authUserId: string,
  targetEmployeeId: string
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  const role = await getUserRole(authUserId);
  if (role === "admin") return { allowed: true };

  if (role !== "employee") {
    return { allowed: false, error: "You do not have permission to manage this employee." };
  }

  const myRecord = await getEmployeeRecordByUserId(authUserId);
  if (!myRecord) {
    return { allowed: false, error: "Your employee record was not found." };
  }

  const ledRegionIds = await getLedRegionIds(myRecord.id);
  if (ledRegionIds.length === 0) {
    return { allowed: false, error: "You are not assigned as a regional team leader." };
  }

  const supabase = createServiceClient();
  const { data: target, error } = await supabase
    .from("employees")
    .select("region_id")
    .eq("id", targetEmployeeId)
    .maybeSingle();

  if (error) return { allowed: false, error: error.message };
  if (!target) return { allowed: false, error: "Employee not found." };

  if (!target.region_id || !ledRegionIds.includes(target.region_id)) {
    return { allowed: false, error: "This employee is not in your assigned region." };
  }

  return { allowed: true };
}
