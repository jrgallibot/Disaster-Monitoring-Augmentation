import { notFound } from "next/navigation";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import {
  getEmployeeById,
  getSpecializations,
  getRegions,
} from "@/lib/actions/employees";
import { getEmployeePortalRole } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;
  const [employee, specializations, regions, portalRole] = await Promise.all([
    getEmployeeById(id),
    getSpecializations(),
    getRegions(),
    getEmployeePortalRole(id),
  ]);

  if (!employee) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">Edit Employee</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update employee profile details. Set deployment status from the employees list.
        </p>
      </div>
      <EmployeeForm
        employee={employee}
        specializations={specializations}
        regions={regions}
        portalRole={portalRole}
      />
    </div>
  );
}
