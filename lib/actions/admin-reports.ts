"use server";

import { requireAdmin } from "@/lib/actions/auth";
import { employeeIsAssignedToLeader } from "@/lib/auth/team-leader";
import { getEmployees, getRegions } from "@/lib/actions/employees";
import {
  buildMemberReports,
  buildTeamDailyReportMember,
  buildTeamSummary,
  fetchMemberReportMaps,
} from "@/lib/report/member-report";
import type {
  AdminOperationsReportData,
  AdminTeamLeaderReport,
} from "@/lib/types";
import { getRegionTeamLeaderSummaries, getTodayBounds } from "@/lib/utils";

export async function getAdminOperationsReportData(): Promise<AdminOperationsReportData> {
  await requireAdmin();

  const [employees, regions] = await Promise.all([getEmployees(), getRegions()]);
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const { start, end, label } = getTodayBounds();

  const allMemberIds = employees.map((employee) => employee.id);
  const maps = await fetchMemberReportMaps(allMemberIds, start, end);

  const teams: AdminTeamLeaderReport[] = [];

  for (const region of regions.filter((item) => item.is_active)) {
    const leaders = getRegionTeamLeaderSummaries(region);

    for (const leaderSummary of leaders) {
      const teamLeader = employeeMap.get(leaderSummary.id);
      if (!teamLeader) continue;

      const members = employees.filter(
        (employee) =>
          employee.id !== leaderSummary.id &&
          employee.region_id === region.id &&
          employeeIsAssignedToLeader(employee, leaderSummary.id)
      );

      const memberReports = buildMemberReports(
        members,
        maps.accomplishmentsByEmployee,
        maps.attendanceByEmployee,
        maps.latestAttendanceByEmployee
      );

      const leaderActivity = buildTeamDailyReportMember(
        teamLeader,
        maps.accomplishmentsByEmployee,
        maps.attendanceByEmployee,
        maps.latestAttendanceByEmployee
      );

      teams.push({
        region,
        teamLeader,
        leaderActivity,
        members: memberReports,
        summary: buildTeamSummary(memberReports),
      });
    }
  }

  teams.sort((a, b) => {
    const regionSort = a.region.sort_order - b.region.sort_order;
    if (regionSort !== 0) return regionSort;
    return a.teamLeader.last_name.localeCompare(b.teamLeader.last_name);
  });

  const allMembers = teams.flatMap((team) => team.members);

  return {
    generatedAt: new Date().toISOString(),
    reportDate: label,
    teams,
    summary: {
      totalTeams: teams.length,
      totalTeamLeaders: teams.length,
      totalMembers: allMembers.length,
      deployed: allMembers.filter((member) => member.employee.status?.name === "Deployed").length,
      onStandby: allMembers.filter((member) => member.employee.status?.name === "On Standby")
        .length,
      onLeave: allMembers.filter((member) => member.employee.status?.name === "On Leave").length,
      clockedInNow: allMembers.filter((member) => member.isClockedIn).length,
      withActivityToday: allMembers.filter((member) => member.todayAccomplishments.length > 0)
        .length,
    },
  };
}
