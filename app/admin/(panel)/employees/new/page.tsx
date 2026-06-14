import { redirect } from "next/navigation";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { requireAdminForPage } from "@/lib/actions/auth";
import {
  getSpecializations,
  getRegions,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const access = await requireAdminForPage();
  if (!access.canWrite) {
    redirect("/admin/employees");
  }

  const [specializations, regions] = await Promise.all([
    getSpecializations(),
    getRegions(),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">Add New Employee</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Register a new augmented employee for disaster response monitoring
        </p>
      </div>
      <EmployeeForm
        specializations={specializations}
        regions={regions}
      />
    </div>
  );
}
