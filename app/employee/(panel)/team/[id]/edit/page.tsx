import { notFound } from "next/navigation";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import {
  getSpecializations,
  getRegions,
} from "@/lib/actions/employees";
import {
  getManagedEmployeeById,
  getTeamLeaderContext,
} from "@/lib/actions/team-leader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberEditPage({ params }: PageProps) {
  const { id } = await params;
  const [employee, specializations, regions, context] = await Promise.all([
    getManagedEmployeeById(id),
    getSpecializations(),
    getRegions(),
    getTeamLeaderContext(),
  ]);

  if (!employee || !context.isTeamLeader) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="gov-section-title">Edit Team Member</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update profile details for {employee.employee_id}. Set deployment status from the team list.
        </p>
      </div>
      <EmployeeForm
        employee={employee}
        specializations={specializations}
        regions={regions}
        mode="teamLeader"
        successHref="/employee/team"
      />
    </div>
  );
}
