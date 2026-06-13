import { EmployeeForm } from "@/components/admin/EmployeeForm";
import {
  getSpecializations,
  getRegions,
  getStatuses,
} from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const [specializations, regions, statuses] = await Promise.all([
    getSpecializations(),
    getRegions(),
    getStatuses(),
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
        statuses={statuses}
      />
    </div>
  );
}
