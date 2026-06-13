import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmployeeImportPanel } from "@/components/admin/EmployeeImportPanel";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { Plus } from "lucide-react";
import {
  getEmployees,
  getRegions,
  getStatuses,
  getSpecializations,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const [employees, regions, statuses, specializations] = await Promise.all([
    getEmployees(),
    getRegions(),
    getStatuses(),
    getSpecializations(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="gov-section-title">Manage Employees</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Add, edit, and monitor augmented employee records. Update deployment status from Actions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <EmployeeImportPanel />
          <Button asChild>
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" />
              Add Employee
            </Link>
          </Button>
        </div>
      </div>

      <EmployeeTable
        employees={employees}
        regions={regions}
        statuses={statuses}
        specializations={specializations}
        showActions
      />
    </div>
  );
}
