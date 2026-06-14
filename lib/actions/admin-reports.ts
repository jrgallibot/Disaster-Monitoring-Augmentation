"use server";

import { requireAdminPortalRead } from "@/lib/actions/auth";
import { employeeIsVisibleTeamMember } from "@/lib/auth/team-leader";
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
  await requireAdminPortalRead();

  const [employees, regions] = await Promise.all([getEmployees(), getRegions()]);
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const { start, end, label } = getTodayBounds();

  const allMemberIds = employees.map((employee) => employee.id);
  const maps = await fetchMemberReportMaps(allMemberIds, start, end);

  const teams: AdminTeamLeaderReport[] = [];

  for (const region of regions.filter((item) => item.is_active)) {
    const leaders = getRegionTeamLeaderSummaries(region);
    const regionLeaderIds = new Set(leaders.map((leader) => leader.id));

    for (const leaderSummary of leaders) {
      const teamLeader = employeeMap.get(leaderSummary.id);
      if (!teamLeader) continue;

      const members = employees.filter((employee) =>
        employeeIsVisibleTeamMember(
          employee,
          leaderSummary.id,
          [region.id],
          regionLeaderIds
        )
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
  const uniqueMemberIds = new Set(allMembers.map((member) => member.employee.id));
  const uniqueMembers = employees.filter((employee) => uniqueMemberIds.has(employee.id));
  const membersWithActivity = new Set(
    allMembers
      .filter((member) => member.todayAccomplishments.length > 0)
      .map((member) => member.employee.id)
  );
  const membersClockedIn = new Set(
    allMembers.filter((member) => member.isClockedIn).map((member) => member.employee.id)
  );

  return {
    generatedAt: new Date().toISOString(),
    reportDate: label,
    teams,
    summary: {
      totalTeams: teams.length,
      totalTeamLeaders: teams.length,
      totalMembers: uniqueMemberIds.size,
      deployed: uniqueMembers.filter((employee) => employee.status?.name === "Deployed").length,
      onStandby: uniqueMembers.filter((employee) => employee.status?.name === "On Standby")
        .length,
      onLeave: uniqueMembers.filter((employee) => employee.status?.name === "On Leave").length,
      clockedInNow: membersClockedIn.size,
      withActivityToday: membersWithActivity.size,
    },
  };
}
