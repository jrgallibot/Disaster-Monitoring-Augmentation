"use server";

import { requireAdmin } from "@/lib/actions/auth";
import { getRegions, getSpecializations } from "@/lib/actions/employees";
import { linkOrCreateEmployeeRecord } from "@/lib/auth/employee-sync";
import {
  matchRegion,
  matchSpecialization,
  parseFullName,
  type EmployeeImportRow,
} from "@/lib/employee-import";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type ImportRowError = {
  row: number;
  employee_id: string;
  message: string;
};

export type ImportedCredential = {
  employee_id: string;
  email: string;
  password: string;
  full_name: string;
};

export type EmployeeImportResult =
  | {
      success: true;
      imported: number;
      skipped: number;
      errors: ImportRowError[];
      credentials: ImportedCredential[];
    }
  | { success: false; error: string };

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }
  return password;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function importEmployeesFromExcel(
  rows: EmployeeImportRow[]
): Promise<EmployeeImportResult> {
  try {
    await requireAdmin();

    if (!rows.length) {
      return { success: false, error: "No rows to import." };
    }

    const [specializations, regions] = await Promise.all([
      getSpecializations(),
      getRegions(),
    ]);
    const service = createServiceClient();

    const errors: ImportRowError[] = [];
    const credentials: ImportedCredential[] = [];
    let imported = 0;
    let skipped = 0;

    const seenEmployeeIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = row.rowNumber ?? index + 2;
      const employeeId = row.employee_id.trim();
      const email = row.email.trim().toLowerCase();
      const fullName = row.full_name.trim();

      if (!employeeId) {
        errors.push({ row: rowNumber, employee_id: "", message: "DSWD Employee ID is required." });
        skipped++;
        continue;
      }
      if (!email) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Official email address is required.",
        });
        skipped++;
        continue;
      }
      if (!isValidEmail(email)) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Invalid email address format.",
        });
        skipped++;
        continue;
      }
      if (!fullName) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Full name is required.",
        });
        skipped++;
        continue;
      }

      const employeeIdKey = employeeId.toLowerCase();
      if (seenEmployeeIds.has(employeeIdKey)) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Duplicate employee ID in import file.",
        });
        skipped++;
        continue;
      }
      if (seenEmails.has(email)) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Duplicate email in import file.",
        });
        skipped++;
        continue;
      }
      seenEmployeeIds.add(employeeIdKey);
      seenEmails.add(email);

      const { data: existingById } = await service
        .from("employees")
        .select("id, user_id, employee_id")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (existingById?.user_id) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Employee ID is already registered with a portal account.",
        });
        skipped++;
        continue;
      }

      const { data: existingByEmail } = await service
        .from("employees")
        .select("id, user_id, employee_id")
        .ilike("email", email)
        .maybeSingle();

      if (existingByEmail?.user_id && existingByEmail.employee_id !== employeeId) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Email is already registered to another employee.",
        });
        skipped++;
        continue;
      }

      const specialization = row.specialization.trim()
        ? matchSpecialization(row.specialization, specializations)
        : null;
      if (row.specialization.trim() && !specialization) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: `Specialization "${row.specialization}" not found in library.`,
        });
        skipped++;
        continue;
      }

      const region = row.home_region.trim()
        ? matchRegion(row.home_region, regions)
        : null;
      if (row.home_region.trim() && !region) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: `Home region "${row.home_region}" not found in library.`,
        });
        skipped++;
        continue;
      }

      const { first_name, last_name, middle_name } = parseFullName(fullName);
      const password = generatePassword();

      const { data: createData, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "employee", employee_id: employeeId },
      });

      if (createError) {
        const message = createError.message.toLowerCase();
        if (message.includes("already") || message.includes("registered")) {
          errors.push({
            row: rowNumber,
            employee_id: employeeId,
            message: "Email is already registered in authentication.",
          });
        } else {
          errors.push({
            row: rowNumber,
            employee_id: employeeId,
            message: createError.message,
          });
        }
        skipped++;
        continue;
      }

      if (!createData.user) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Failed to create portal account.",
        });
        skipped++;
        continue;
      }

      const linked = await linkOrCreateEmployeeRecord(
        createData.user.id,
        email,
        employeeId,
        {
          specialization_id: specialization?.id,
          region_id: region?.id,
          first_name,
          last_name,
          middle_name: middle_name ?? undefined,
        }
      );

      if (!linked) {
        await service.auth.admin.deleteUser(createData.user.id);
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          message: "Failed to create or link employee record.",
        });
        skipped++;
        continue;
      }

      imported++;
      credentials.push({
        employee_id: employeeId,
        email,
        password,
        full_name: fullName,
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/employees");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      imported,
      skipped,
      errors,
      credentials,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to import employees.",
    };
  }
}
