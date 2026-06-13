import { notFound } from "next/navigation";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import {
  getEmployeeById,
  getSpecializations,
  getRegions,
  getStatuses,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;
  const [employee, specializations, regions, statuses] = await Promise.all([
    getEmployeeById(id),
    getSpecializations(),
    getRegions(),
    getStatuses(),
  ]);

  if (!employee) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">Edit Employee</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update employee information and deployment status
        </p>
      </div>
      <EmployeeForm
        employee={employee}
        specializations={specializations}
        regions={regions}
        statuses={statuses}
      />
    </div>
  );
}
