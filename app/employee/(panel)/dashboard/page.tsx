import { redirect } from "next/navigation";
import { EmployeeAttendancePanel } from "@/components/employee/EmployeeAttendancePanel";
import { EmployeeAccomplishmentPanel } from "@/components/employee/EmployeeAccomplishmentPanel";
import { EmployeeStatusForm } from "@/components/employee/EmployeeStatusForm";
import { TeamLeaderPanel } from "@/components/employee/TeamLeaderPanel";
import { getMyAttendance, getMyAttendanceStatus } from "@/lib/actions/attendance";
import { getMyAccomplishments } from "@/lib/actions/accomplishments";
import {
  getMyEmployee,
  getMyUpdateLogs,
  getRegionsForEmployee,
  getSpecializationsForEmployee,
} from "@/lib/actions/employee-portal";
import { getTeamLeaderContext, getTeamMembersForLeader } from "@/lib/actions/team-leader";
import { getSpecializations, getStatuses } from "@/lib/actions/employees";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const [employee, specializations, regions, logs, attendanceStatus, attendance, accomplishments, teamLeaderContext] =
    await Promise.all([
      getMyEmployee(),
      getSpecializationsForEmployee(),
      getRegionsForEmployee(),
      getMyUpdateLogs(),
      getMyAttendanceStatus(),
      getMyAttendance(),
      getMyAccomplishments(),
      getTeamLeaderContext(),
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
      <div>
        <h1 className="gov-section-title">My Employee Account</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Update your profile first, then record time in/out and submit accomplishments.
          {teamLeaderContext.isTeamLeader
            ? " As a regional team leader, you can also manage your team members below."
            : " Deployment status is managed by your administrator or team leader."}
        </p>
      </div>
      <EmployeeStatusForm
        employee={employee}
        specializations={specializations}
        regions={regions}
        logs={logs}
      />
      <EmployeeAttendancePanel status={attendanceStatus} records={attendance} />
      <EmployeeAccomplishmentPanel records={accomplishments} />
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
