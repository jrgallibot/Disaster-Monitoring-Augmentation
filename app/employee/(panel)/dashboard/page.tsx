import { redirect } from "next/navigation";
import { EmployeeAccomplishmentPanel } from "@/components/employee/EmployeeAccomplishmentPanel";
import { EmployeeStatusForm } from "@/components/employee/EmployeeStatusForm";
import { TeamLeaderPanel } from "@/components/employee/TeamLeaderPanel";
import { getMyAccomplishments } from "@/lib/actions/accomplishments";
import {
  getMyEmployee,
  getMyDeploymentLogs,
  getMyUpdateLogs,
  getRegionsForEmployee,
  getSpecializationsForEmployee,
} from "@/lib/actions/employee-portal";
import { getTeamLeaderContext, getTeamMembersForLeader } from "@/lib/actions/team-leader";
import { getSpecializations, getStatuses } from "@/lib/actions/employees";
import { getAdminPortalAccess } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const teamLeaderContext = await getTeamLeaderContext();

  const [employee, specializations, regions, statuses, logs, deploymentLogs, accomplishments, adminAccess] =
    await Promise.all([
      getMyEmployee(),
      getSpecializationsForEmployee(),
      getRegionsForEmployee(),
      getStatuses(),
      getMyUpdateLogs(),
      getMyDeploymentLogs(),
      getMyAccomplishments(teamLeaderContext.isTeamLeader ? 100 : 30),
      getAdminPortalAccess(),
    ]);

  if (!employee) {
    redirect("/employee/login");
  }

  const teamMembers = teamLeaderContext.isTeamLeader
    ? await Promise.all([
        getTeamMembersForLeader(),
        getStatuses(),
        getSpecializations(),
      ])
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="gov-section-title">My Employee Account</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Update your profile and set your deployment status for today (resets at midnight), then submit accomplishments.
            {teamLeaderContext.isTeamLeader
              ? " As a regional team leader, you can also manage your team members below."
              : ""}
          </p>
        </div>
        {adminAccess && (
          <Button asChild className="shrink-0">
            <Link href="/admin/dashboard">
              <Shield className="h-4 w-4" />
              {adminAccess.canWrite
                ? "Open Admin Panel"
                : adminAccess.role === "team_leader"
                  ? "Open Team Leader Monitoring"
                  : "Open Admin Viewing Panel"}
            </Link>
          </Button>
        )}
      </div>
      <EmployeeStatusForm
        employee={employee}
        specializations={specializations}
        regions={regions}
        statuses={statuses}
        logs={logs}
        deploymentLogs={deploymentLogs}
      />
      <EmployeeAccomplishmentPanel
        records={accomplishments}
        isTeamLeader={teamLeaderContext.isTeamLeader}
      />
      {teamLeaderContext.isTeamLeader && teamMembers && (
        <TeamLeaderPanel
          ledRegions={teamLeaderContext.ledRegions}
          members={teamMembers[0]}
          statuses={teamMembers[1]}
          specializations={teamMembers[2]}
        />
      )}
    </div>
  );
}
