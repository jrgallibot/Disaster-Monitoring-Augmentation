import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import {
  getSpecializations,
  getStatuses,
} from "@/lib/actions/employees";
import {
  getTeamLeaderContext,
  getTeamMembersForLeader,
  requireTeamLeaderForPage,
} from "@/lib/actions/team-leader";

export const dynamic = "force-dynamic";

export default async function EmployeeTeamPage() {
  const [context, members, statuses, specializations] = await Promise.all([
    requireTeamLeaderForPage(),
    getTeamMembersForLeader(),
    getStatuses(),
    getSpecializations(),
  ]);

  const regionLabel = context.ledRegions.map((r) => r.code).join(", ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gov-section-title">My Team</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You are assigned as team leader for{" "}
          <strong className="text-foreground">{regionLabel}</strong>. Manage deployment status,
          edit profiles, and view history for employees in your region.
        </p>
      </div>

      <EmployeeTable
        employees={members}
        regions={context.ledRegions}
        statuses={statuses}
        specializations={specializations}
        showActions
        editBasePath="/employee/team"
        title={`Team Members — ${regionLabel}`}
        hideRegionFilter
        hideTeamLeaderColumn
      />
    </div>
  );
}
